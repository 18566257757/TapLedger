import { TransactionRepository } from '../repositories/transactionRepository'
import type { TransactionResponse } from '../types'
import { sha256Hex } from '../utils/crypto'
import { nowIso } from '../utils/time'

const CSV_FIELDS = [
  'id', 'client_event_id', 'transaction_date', 'captured_at', 'type', 'amount',
  'amount_minor', 'currency', 'merchant_raw', 'merchant_normalized', 'category',
  'payment_method', 'card_raw_name', 'purpose', 'location_name', 'latitude',
  'longitude', 'source', 'review_status', 'is_excluded_from_analytics', 'note',
  'created_at', 'updated_at',
] as const

type BackupTable = 'app_settings' | 'categories' | 'payment_methods' | 'merchant_rules' | 'ledger_transactions' | 'import_events'

export interface BackupDocument {
  format: 'tapledger-backup'
  version: 1
  exported_at: string
  tables: Record<BackupTable, Record<string, unknown>[]>
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export class ExportService {
  private readonly transactions: TransactionRepository

  constructor(private readonly database: D1Database) {
    this.transactions = new TransactionRepository(database)
  }

  async allTransactions(): Promise<TransactionResponse[]> {
    const items: TransactionResponse[] = []
    let page = 1
    while (true) {
      const result = await this.transactions.list({ page, pageSize: 500, sort: 'newest' })
      items.push(...result.items)
      if (items.length >= result.total) return items
      page += 1
    }
  }

  async csv(): Promise<string> {
    const rows = [CSV_FIELDS.join(',')]
    for (const transaction of await this.allTransactions()) {
      const row: Record<(typeof CSV_FIELDS)[number], unknown> = {
        id: transaction.id,
        client_event_id: transaction.client_event_id,
        transaction_date: transaction.transaction_date,
        captured_at: transaction.captured_at,
        type: transaction.type,
        amount: transaction.amount,
        amount_minor: transaction.amount_minor,
        currency: transaction.currency,
        merchant_raw: transaction.merchant_raw,
        merchant_normalized: transaction.merchant_normalized,
        category: transaction.category_name,
        payment_method: transaction.payment_method_name,
        card_raw_name: transaction.card_raw_name,
        purpose: transaction.purpose,
        location_name: transaction.location_name,
        latitude: transaction.latitude,
        longitude: transaction.longitude,
        source: transaction.source,
        review_status: transaction.review_status,
        is_excluded_from_analytics: transaction.is_excluded_from_analytics,
        note: transaction.note,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      }
      rows.push(CSV_FIELDS.map((field) => csvCell(row[field])).join(','))
    }
    return `\uFEFF${rows.join('\r\n')}\r\n`
  }

  async json(): Promise<string> {
    return JSON.stringify(await this.allTransactions(), null, 2)
  }

  async backupDocument(): Promise<BackupDocument> {
    const tableNames: BackupTable[] = ['app_settings', 'categories', 'payment_methods', 'merchant_rules', 'ledger_transactions', 'import_events']
    const tables = {} as Record<BackupTable, Record<string, unknown>[]>
    for (const table of tableNames) {
      const result = await this.database.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>()
      tables[table] = result.results
    }
    return { format: 'tapledger-backup', version: 1, exported_at: nowIso(), tables }
  }

  async createBackup(): Promise<{ name: string; size_bytes: number; sha256: string }> {
    const document = await this.backupDocument()
    const payload = JSON.stringify(document)
    const createdAt = nowIso()
    const name = `tapledger-${createdAt.replace(/[:.]/gu, '-').replace('T', '-').replace('Z', '')}.json`
    const sizeBytes = new TextEncoder().encode(payload).byteLength
    const digest = await sha256Hex(payload)
    await this.database.prepare(`
      INSERT INTO backup_snapshots (id, name, payload_json, size_bytes, sha256, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), name, payload, sizeBytes, digest, createdAt).run()
    return { name, size_bytes: sizeBytes, sha256: digest }
  }

  async backups() {
    const rows = await this.database.prepare(`
      SELECT name, size_bytes, sha256, created_at
      FROM backup_snapshots ORDER BY created_at DESC
    `).all<{ name: string; size_bytes: number; sha256: string; created_at: string }>()
    return { items: rows.results }
  }
}
