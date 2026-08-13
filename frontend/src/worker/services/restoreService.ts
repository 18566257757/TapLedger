import type { BackupDocument } from './exportService'
import { HttpError } from '../utils/http'
import { nowIso } from '../utils/time'

const TABLE_COLUMNS = {
  app_settings: ['id', 'base_currency', 'timezone', 'language', 'week_starts_on', 'default_period', 'location_capture_enabled', 'setup_completed', 'created_at', 'updated_at'],
  categories: ['id', 'name', 'icon', 'sort_order', 'is_system', 'is_archived', 'created_at', 'updated_at'],
  payment_methods: ['id', 'display_name', 'issuer', 'last_four', 'method_type', 'shortcut_match_text', 'icon', 'is_archived', 'created_at', 'updated_at'],
  merchant_rules: ['id', 'pattern', 'normalized_pattern', 'match_type', 'priority', 'category_id', 'payment_method_id', 'default_purpose', 'is_enabled', 'created_at', 'updated_at'],
  ledger_transactions: ['id', 'client_event_id', 'type', 'amount_minor', 'currency_code', 'transaction_date', 'captured_at', 'merchant_raw', 'merchant_normalized', 'card_raw_name', 'category_id', 'payment_method_id', 'purpose', 'note', 'location_name', 'latitude', 'longitude', 'location_source', 'source', 'review_status', 'is_excluded_from_analytics', 'deduplication_key', 'base_amount_minor', 'exchange_rate', 'exchange_rate_source', 'created_at', 'updated_at'],
  import_events: ['id', 'client_event_id', 'result', 'transaction_id', 'merchant_summary', 'amount_summary', 'source', 'request_identity', 'created_at'],
} as const

type RestorableTable = keyof typeof TABLE_COLUMNS

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class RestoreService {
  constructor(private readonly database: D1Database) {}

  validate(value: unknown): BackupDocument {
    if (!isRecord(value) || value.format !== 'tapledger-backup' || value.version !== 1 || !isRecord(value.tables)) {
      throw new HttpError(422, 'Invalid TapLedger backup document')
    }
    for (const table of Object.keys(TABLE_COLUMNS) as RestorableTable[]) {
      if (!Array.isArray(value.tables[table]) || !value.tables[table].every(isRecord)) throw new HttpError(422, `Backup table ${table} is invalid`)
      for (const row of value.tables[table]) {
        const unknownColumn = Object.keys(row).find((column) => !(TABLE_COLUMNS[table] as readonly string[]).includes(column))
        if (unknownColumn) throw new HttpError(422, `Backup table ${table} contains an unknown column`)
      }
    }
    const document = value as unknown as BackupDocument
    if (document.tables.app_settings.length !== 1) throw new HttpError(422, 'Backup must contain exactly one settings record')
    if (!document.tables.categories.some((row) => row.id === 'cat-uncategorized')) throw new HttpError(422, 'Backup is missing the Uncategorized category')
    return document
  }

  counts(document: BackupDocument): Record<RestorableTable, number> {
    return Object.fromEntries(
      (Object.keys(TABLE_COLUMNS) as RestorableTable[]).map((table) => [table, document.tables[table].length]),
    ) as Record<RestorableTable, number>
  }

  private insertDocumentStatement(table: RestorableTable, rows: Record<string, unknown>[]): D1PreparedStatement {
    const columns = TABLE_COLUMNS[table]
    const selections = columns.map((column) => `json_extract(value, '$.${column}')`).join(', ')
    const insert = table === 'app_settings' ? 'INSERT OR REPLACE' : 'INSERT'
    return this.database.prepare(`
      ${insert} INTO ${table} (${columns.join(', ')})
      SELECT ${selections} FROM json_each(?)
    `).bind(JSON.stringify(rows))
  }

  async restore(value: unknown): Promise<{ restored_transactions: number; restored_at: string }> {
    const document = this.validate(value)
    const tableOrder = Object.keys(TABLE_COLUMNS) as RestorableTable[]
    const statements = [
      this.database.prepare('DELETE FROM import_events'),
      this.database.prepare('DELETE FROM merchant_rules'),
      this.database.prepare('DELETE FROM ledger_transactions'),
      this.database.prepare('DELETE FROM payment_methods'),
      this.database.prepare('DELETE FROM categories'),
      ...tableOrder.map((table) => this.insertDocumentStatement(table, document.tables[table])),
    ]
    // A D1 batch is a transaction: any invalid row rolls back the deletes and
    // every insert together. JSON table parameters keep the query count fixed.
    try {
      await this.database.batch(statements)
    } catch {
      throw new HttpError(422, 'Backup data failed database validation; no data was changed')
    }
    return { restored_transactions: document.tables.ledger_transactions.length, restored_at: nowIso() }
  }
}
