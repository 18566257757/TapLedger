import type { TransactionResponse } from '../types'
import { sha256Hex } from '../utils/crypto'
import { TransactionRepository } from '../repositories/transactionRepository'

export interface DuplicateDecision {
  existing: TransactionResponse | null
  automatic: boolean
  candidate: boolean
}

export class DuplicateDetectionService {
  constructor(private readonly database: D1Database) {}

  buildKey(merchant: string, amountMinor: number, currency: string, cardIdentity: string | null | undefined) {
    return sha256Hex([merchant, String(amountMinor), currency, cardIdentity?.trim().toUpperCase() ?? ''].join('\u001f'))
  }

  async detect(key: string, transactionDate: string): Promise<DuplicateDecision> {
    const date = new Date(transactionDate)
    const windowStart = new Date(date.getTime() - 5 * 60 * 1000).toISOString()
    const row = await this.database.prepare(`
      SELECT id FROM ledger_transactions
      WHERE deduplication_key = ? AND transaction_date >= ? AND transaction_date <= ?
      ORDER BY transaction_date DESC LIMIT 1
    `).bind(key, windowStart, transactionDate).first<{ id: string }>()
    if (!row) return { existing: null, automatic: false, candidate: false }
    const existing = await new TransactionRepository(this.database).getById(row.id)
    if (!existing) return { existing: null, automatic: false, candidate: false }
    const seconds = Math.abs(date.getTime() - new Date(existing.transaction_date).getTime()) / 1000
    if (seconds <= 30) return { existing, automatic: true, candidate: false }
    if (seconds <= 300) return { existing, automatic: false, candidate: true }
    return { existing: null, automatic: false, candidate: false }
  }
}
