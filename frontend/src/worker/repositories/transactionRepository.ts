import type { ReviewStatus, TransactionRecord, TransactionResponse } from '../types'
import { fromMinorUnits } from '../utils/money'

const SELECT_TRANSACTION = `
  SELECT
    t.id, t.client_event_id, t.type, t.amount_minor, t.currency_code,
    t.transaction_date, t.captured_at, t.merchant_raw, t.merchant_normalized,
    t.card_raw_name, t.category_id, c.name AS category_name,
    t.payment_method_id, p.display_name AS payment_method_name,
    t.purpose, t.note, t.location_name, t.latitude, t.longitude,
    t.source, t.review_status, t.is_excluded_from_analytics,
    t.deduplication_key, t.created_at, t.updated_at
  FROM ledger_transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods p ON p.id = t.payment_method_id
`

export interface TransactionListFilters {
  page: number
  pageSize: number
  search?: string
  dateFrom?: string
  dateTo?: string
  type?: string
  categoryId?: string
  paymentMethodId?: string
  source?: string
  reviewStatus?: string
  currency?: string
  minimumMinor?: number
  maximumMinor?: number
  sort: 'newest' | 'oldest' | 'amount_high' | 'amount_low'
}

function filterSql(filters: TransactionListFilters): { where: string; parameters: unknown[] } {
  const clauses: string[] = []
  const parameters: unknown[] = []
  if (filters.search) {
    const escaped = filters.search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
    clauses.push("(t.merchant_raw LIKE ? ESCAPE '\\' OR t.merchant_normalized LIKE ? ESCAPE '\\' OR COALESCE(t.note, '') LIKE ? ESCAPE '\\')")
    parameters.push(`%${escaped}%`, `%${escaped.toUpperCase()}%`, `%${escaped}%`)
  }
  if (filters.dateFrom) { clauses.push('t.transaction_date >= ?'); parameters.push(filters.dateFrom) }
  if (filters.dateTo) { clauses.push('t.transaction_date <= ?'); parameters.push(filters.dateTo) }
  if (filters.type) { clauses.push('t.type = ?'); parameters.push(filters.type) }
  if (filters.categoryId) { clauses.push('t.category_id = ?'); parameters.push(filters.categoryId) }
  if (filters.paymentMethodId) { clauses.push('t.payment_method_id = ?'); parameters.push(filters.paymentMethodId) }
  if (filters.source) { clauses.push('t.source = ?'); parameters.push(filters.source) }
  if (filters.reviewStatus) { clauses.push('t.review_status = ?'); parameters.push(filters.reviewStatus) }
  if (filters.currency) { clauses.push('t.currency_code = ?'); parameters.push(filters.currency) }
  if (filters.minimumMinor !== undefined) { clauses.push('t.amount_minor >= ?'); parameters.push(filters.minimumMinor) }
  if (filters.maximumMinor !== undefined) { clauses.push('t.amount_minor <= ?'); parameters.push(filters.maximumMinor) }
  return { where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', parameters }
}

export function presentTransaction(record: TransactionRecord): TransactionResponse {
  return {
    id: record.id,
    client_event_id: record.client_event_id,
    type: record.type,
    amount: fromMinorUnits(record.amount_minor, record.currency_code),
    amount_minor: record.amount_minor,
    currency: record.currency_code,
    transaction_date: record.transaction_date,
    captured_at: record.captured_at,
    merchant_raw: record.merchant_raw,
    merchant_normalized: record.merchant_normalized,
    card_raw_name: record.card_raw_name,
    category_id: record.category_id,
    category_name: record.category_name,
    payment_method_id: record.payment_method_id,
    payment_method_name: record.payment_method_name,
    purpose: record.purpose,
    note: record.note,
    location_name: record.location_name,
    latitude: record.latitude,
    longitude: record.longitude,
    source: record.source,
    review_status: record.review_status,
    is_excluded_from_analytics: Boolean(record.is_excluded_from_analytics),
    created_at: record.created_at,
    updated_at: record.updated_at,
  }
}

export class TransactionRepository {
  constructor(private readonly database: D1Database) {}

  async getById(id: string): Promise<TransactionResponse | null> {
    const row = await this.database.prepare(`${SELECT_TRANSACTION} WHERE t.id = ?`).bind(id).first<TransactionRecord>()
    return row ? presentTransaction(row) : null
  }

  async getByClientEventId(clientEventId: string): Promise<TransactionResponse | null> {
    const row = await this.database.prepare(`${SELECT_TRANSACTION} WHERE t.client_event_id = ?`).bind(clientEventId).first<TransactionRecord>()
    return row ? presentTransaction(row) : null
  }

  async list(filters: TransactionListFilters): Promise<{ items: TransactionResponse[]; total: number }> {
    const { where, parameters } = filterSql(filters)
    const orderBy = {
      newest: 't.transaction_date DESC',
      oldest: 't.transaction_date ASC',
      amount_high: 't.amount_minor DESC, t.transaction_date DESC',
      amount_low: 't.amount_minor ASC, t.transaction_date DESC',
    }[filters.sort]
    const offset = (filters.page - 1) * filters.pageSize
    const [rows, count] = await Promise.all([
      this.database.prepare(`${SELECT_TRANSACTION}${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...parameters, filters.pageSize, offset).all<TransactionRecord>(),
      this.database.prepare(`SELECT COUNT(*) AS total FROM ledger_transactions t${where}`).bind(...parameters).first<{ total: number }>(),
    ])
    return { items: rows.results.map(presentTransaction), total: count?.total ?? 0 }
  }

  async listReview(): Promise<TransactionResponse[]> {
    const rows = await this.database.prepare(`${SELECT_TRANSACTION} WHERE t.review_status != 'confirmed' ORDER BY t.transaction_date DESC, t.created_at DESC`).all<TransactionRecord>()
    return rows.results.map(presentTransaction)
  }

  async setReviewStatus(id: string, status: ReviewStatus, updatedAt: string): Promise<TransactionResponse | null> {
    await this.database.prepare('UPDATE ledger_transactions SET review_status = ?, updated_at = ? WHERE id = ?').bind(status, updatedAt, id).run()
    return this.getById(id)
  }
}
