import { CatalogRepository } from '../repositories/catalogRepository'
import { TransactionRepository } from '../repositories/transactionRepository'
import type {
  IngestionResult,
  ManualTransactionInput,
  ReviewStatus,
  ShortcutTransactionInput,
  TransactionResponse,
  TransactionSource,
  TransactionType,
} from '../types'
import { HttpError } from '../utils/http'
import { toMinorUnits } from '../utils/money'
import { normalizeDateTime, nowIso } from '../utils/time'
import { DuplicateDetectionService } from './duplicateDetectionService'
import { MerchantNormalizationService } from './merchantNormalizationService'
import { MerchantRuleService } from './merchantRuleService'

interface ExistingTransactionRow {
  id: string
  type: TransactionType
  amount_minor: number
  currency_code: string
  transaction_date: string
  merchant_raw: string
  merchant_normalized: string
  card_raw_name: string | null
  category_id: string | null
  payment_method_id: string | null
  purpose: string | null
  note: string | null
  location_name: string | null
  latitude: string | null
  longitude: string | null
  review_status: ReviewStatus
  is_excluded_from_analytics: number
}

interface IngestValues {
  clientEventId: string
  transactionType: TransactionType
  amount: string
  currency: string
  merchantRaw?: string | null
  cardRawName?: string | null
  transactionDate: string
  capturedAt: string
  source: TransactionSource
  categoryId?: string | null
  paymentMethodId?: string | null
  purpose?: string | null
  note?: string | null
  locationName?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  excluded: boolean
  requestIdentity: string
}

function coordinate(value: string | number | null | undefined, minimum: number, maximum: number): string | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new HttpError(422, 'Invalid location coordinate')
  return String(value)
}

export class TransactionService {
  private readonly transactions: TransactionRepository
  private readonly catalog: CatalogRepository
  private readonly normalizer = new MerchantNormalizationService()
  private readonly rules: MerchantRuleService
  private readonly duplicates: DuplicateDetectionService

  constructor(private readonly database: D1Database) {
    this.transactions = new TransactionRepository(database)
    this.catalog = new CatalogRepository(database)
    this.rules = new MerchantRuleService(database)
    this.duplicates = new DuplicateDetectionService(database)
  }

  async ingestShortcut(payload: ShortcutTransactionInput, source: TransactionSource = 'wallet_shortcut', requestIdentity = 'shortcut'): Promise<IngestionResult> {
    const settings = await this.database.prepare('SELECT base_currency FROM app_settings WHERE id = 1').first<{ base_currency: string }>()
    const capturedAt = normalizeDateTime(payload.captured_at)
    return this.ingest({
      clientEventId: payload.client_event_id,
      transactionType: 'expense',
      amount: payload.amount,
      currency: (payload.currency ?? settings?.base_currency ?? 'HKD').toUpperCase(),
      merchantRaw: payload.merchant,
      cardRawName: payload.card,
      transactionDate: normalizeDateTime(payload.transaction_date, capturedAt),
      capturedAt,
      source,
      purpose: payload.purpose,
      locationName: payload.location_name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      excluded: false,
      requestIdentity,
    })
  }

  async ingestManual(payload: ManualTransactionInput): Promise<IngestionResult> {
    return this.ingest({
      clientEventId: payload.client_event_id ?? crypto.randomUUID(),
      transactionType: payload.type ?? 'expense',
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      merchantRaw: payload.merchant,
      transactionDate: normalizeDateTime(payload.transaction_date),
      capturedAt: nowIso(),
      source: 'manual_pwa',
      categoryId: payload.category_id,
      paymentMethodId: payload.payment_method_id,
      purpose: payload.purpose,
      note: payload.note,
      locationName: payload.location_name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      excluded: payload.is_excluded_from_analytics ?? false,
      requestIdentity: 'web-admin',
    })
  }

  private async ingest(values: IngestValues): Promise<IngestionResult> {
    const already = await this.transactions.getByClientEventId(values.clientEventId)
    if (already) {
      await this.recordImport(values, already, 'already_processed')
      return { result: 'already_processed', transaction: already, duplicate: true }
    }

    const currency = values.currency.trim().toUpperCase()
    const amountMinor = toMinorUnits(values.amount, currency)
    const merchantRaw = values.merchantRaw?.trim() || 'Unknown Merchant'
    const merchantNormalized = this.normalizer.normalize(merchantRaw)
    const paymentMatch = values.paymentMethodId
      ? null
      : await this.catalog.matchPaymentMethod(values.cardRawName)
    const rule = await this.rules.findMatchingRule(merchantNormalized)

    let categoryId = values.categoryId ?? rule?.category_id ?? null
    let paymentMethodId = values.paymentMethodId ?? paymentMatch?.id ?? rule?.payment_method_id ?? null
    const purpose = values.purpose ?? rule?.default_purpose ?? null
    if (categoryId && !(await this.catalog.categoryExists(categoryId))) throw new HttpError(422, 'Unknown category')
    if (paymentMethodId && !(await this.catalog.paymentMethodExists(paymentMethodId))) throw new HttpError(422, 'Unknown payment method')

    if (!categoryId) {
      const historical = await this.database.prepare(`
        SELECT category_id FROM ledger_transactions
        WHERE merchant_normalized = ? AND category_id IS NOT NULL AND review_status = 'confirmed'
        ORDER BY transaction_date DESC LIMIT 1
      `).bind(merchantNormalized).first<{ category_id: string }>()
      categoryId = historical?.category_id ?? null
    }
    const categorized = Boolean(categoryId)
    categoryId ??= 'cat-uncategorized'

    const deduplicationKey = await this.duplicates.buildKey(
      merchantNormalized,
      amountMinor,
      currency,
      paymentMethodId ?? values.cardRawName,
    )
    const duplicate = await this.duplicates.detect(deduplicationKey, values.transactionDate)
    if (duplicate.automatic && duplicate.existing) {
      await this.recordImport(values, duplicate.existing, 'duplicate', amountMinor, currency, merchantNormalized)
      return { result: 'already_processed', transaction: duplicate.existing, duplicate: true }
    }

    const missingShortcutInformation = (values.source === 'wallet_shortcut' || values.source === 'simulator') && (
      !values.merchantRaw?.trim() || !values.cardRawName?.trim() || !paymentMethodId
    )
    let reviewStatus: ReviewStatus = 'confirmed'
    if (duplicate.candidate) reviewStatus = 'duplicate_candidate'
    else if (missingShortcutInformation) reviewStatus = 'missing_information'
    else if (!categorized) reviewStatus = 'needs_review'

    const id = crypto.randomUUID()
    const now = nowIso()
    const result = reviewStatus === 'confirmed' ? 'created' : 'created_needs_review'
    const transactionStatement = this.database.prepare(`
      INSERT INTO ledger_transactions (
        id, client_event_id, type, amount_minor, currency_code, transaction_date,
        captured_at, merchant_raw, merchant_normalized, card_raw_name, category_id,
        payment_method_id, purpose, note, location_name, latitude, longitude,
        location_source, source, review_status, is_excluded_from_analytics,
        deduplication_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      values.clientEventId,
      values.transactionType,
      amountMinor,
      currency,
      values.transactionDate,
      values.capturedAt,
      merchantRaw,
      merchantNormalized,
      values.cardRawName ?? null,
      categoryId,
      paymentMethodId,
      purpose,
      values.note ?? null,
      values.locationName ?? null,
      coordinate(values.latitude, -90, 90),
      coordinate(values.longitude, -180, 180),
      values.source === 'wallet_shortcut' ? 'shortcut' : null,
      values.source,
      reviewStatus,
      values.excluded ? 1 : 0,
      deduplicationKey,
      now,
      now,
    )
    const eventStatement = this.importEventStatement(values, id, result, amountMinor, currency, merchantNormalized)
    try {
      await this.database.batch([transactionStatement, eventStatement])
    } catch (error) {
      const raced = await this.transactions.getByClientEventId(values.clientEventId)
      if (!raced) throw error
      await this.recordImport(values, raced, 'already_processed')
      return { result: 'already_processed', transaction: raced, duplicate: true }
    }
    const transaction = await this.transactions.getById(id)
    if (!transaction) throw new HttpError(500, 'Created transaction could not be loaded')
    return { result, transaction, duplicate: false }
  }

  private importEventStatement(
    values: IngestValues,
    transactionId: string | null,
    result: string,
    amountMinor: number,
    currency: string,
    merchantNormalized: string,
  ): D1PreparedStatement {
    return this.database.prepare(`
      INSERT INTO import_events (
        id, client_event_id, result, transaction_id, merchant_summary,
        amount_summary, source, request_identity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      values.clientEventId,
      result,
      transactionId,
      merchantNormalized.slice(0, 80),
      `${amountMinor}:${currency}`,
      values.source,
      values.requestIdentity.slice(0, 160),
      nowIso(),
    )
  }

  private async recordImport(
    values: IngestValues,
    transaction: TransactionResponse,
    result: string,
    amountMinor = transaction.amount_minor,
    currency = transaction.currency,
    merchant = transaction.merchant_normalized,
  ): Promise<void> {
    await this.importEventStatement(values, transaction.id, result, amountMinor, currency, merchant).run()
  }

  async get(id: string): Promise<TransactionResponse> {
    const transaction = await this.transactions.getById(id)
    if (!transaction) throw new HttpError(404, 'Transaction not found')
    return transaction
  }

  async update(id: string, input: Partial<ManualTransactionInput & { review_status: ReviewStatus }>): Promise<TransactionResponse> {
    const current = await this.database.prepare(`
      SELECT id, type, amount_minor, currency_code, transaction_date, merchant_raw,
             merchant_normalized, card_raw_name, category_id, payment_method_id,
             purpose, note, location_name, latitude, longitude, review_status,
             is_excluded_from_analytics
      FROM ledger_transactions WHERE id = ?
    `).bind(id).first<ExistingTransactionRow>()
    if (!current) throw new HttpError(404, 'Transaction not found')
    const currency = (input.currency ?? current.currency_code).toUpperCase()
    const amountMinor = input.amount === undefined ? current.amount_minor : toMinorUnits(input.amount, currency)
    const merchantRaw = input.merchant ?? current.merchant_raw
    const merchantNormalized = this.normalizer.normalize(merchantRaw)
    const categoryId = input.category_id === undefined ? current.category_id : input.category_id
    const paymentMethodId = input.payment_method_id === undefined ? current.payment_method_id : input.payment_method_id
    if (categoryId && !(await this.catalog.categoryExists(categoryId))) throw new HttpError(422, 'Unknown category')
    if (paymentMethodId && !(await this.catalog.paymentMethodExists(paymentMethodId))) throw new HttpError(422, 'Unknown payment method')
    const deduplicationKey = await this.duplicates.buildKey(merchantNormalized, amountMinor, currency, paymentMethodId ?? current.card_raw_name)
    await this.database.prepare(`
      UPDATE ledger_transactions SET
        type = ?, amount_minor = ?, currency_code = ?, transaction_date = ?,
        merchant_raw = ?, merchant_normalized = ?, category_id = ?, payment_method_id = ?,
        purpose = ?, note = ?, location_name = ?, latitude = ?, longitude = ?,
        review_status = ?, is_excluded_from_analytics = ?, deduplication_key = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      input.type ?? current.type,
      amountMinor,
      currency,
      input.transaction_date ? normalizeDateTime(input.transaction_date) : current.transaction_date,
      merchantRaw,
      merchantNormalized,
      categoryId,
      paymentMethodId,
      input.purpose === undefined ? current.purpose : input.purpose,
      input.note === undefined ? current.note : input.note,
      input.location_name === undefined ? current.location_name : input.location_name,
      input.latitude === undefined ? current.latitude : coordinate(input.latitude, -90, 90),
      input.longitude === undefined ? current.longitude : coordinate(input.longitude, -180, 180),
      input.review_status ?? current.review_status,
      input.is_excluded_from_analytics === undefined ? current.is_excluded_from_analytics : input.is_excluded_from_analytics ? 1 : 0,
      deduplicationKey,
      nowIso(),
      id,
    ).run()
    return this.get(id)
  }

  async delete(id: string): Promise<void> {
    const result = await this.database.prepare('DELETE FROM ledger_transactions WHERE id = ?').bind(id).run()
    if (!result.meta.changes) throw new HttpError(404, 'Transaction not found')
  }
}
