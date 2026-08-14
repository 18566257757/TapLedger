import { normalizeDateTime } from '../utils/time'
import { HttpError } from '../utils/http'

export class AnalyticsService {
  constructor(private readonly database: D1Database) {}

  private range(dateFrom: string, dateTo: string): [string, string] {
    const from = normalizeDateTime(dateFrom)
    const to = normalizeDateTime(dateTo)
    if (from >= to) throw new HttpError(422, 'date_from must be before date_to')
    return [from, to]
  }

  async summary(dateFrom: string, dateTo: string) {
    const [from, to] = this.range(dateFrom, dateTo)
    const rows = await this.database.prepare(`
      SELECT
        currency_code AS currency,
        SUM(CASE type WHEN 'expense' THEN amount_minor WHEN 'refund' THEN -amount_minor ELSE 0 END) AS net_spending_minor,
        SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) AS net_income_minor,
        SUM(CASE type WHEN 'expense' THEN -amount_minor WHEN 'refund' THEN amount_minor WHEN 'income' THEN amount_minor ELSE 0 END) AS total_minor,
        COUNT(CASE WHEN type IN ('expense', 'refund') THEN 1 END) AS transaction_count,
        MAX(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) AS largest_minor
      FROM ledger_transactions
      WHERE transaction_date >= ? AND transaction_date < ?
        AND is_excluded_from_analytics = 0
        AND type IN ('expense', 'refund', 'income')
      GROUP BY currency_code
      ORDER BY currency_code
    `).bind(from, to).all<{
      currency: string
      net_spending_minor: number
      net_income_minor: number
      total_minor: number
      transaction_count: number
      largest_minor: number
    }>()
    return { multiple_currencies: rows.results.length > 1, currencies: rows.results }
  }

  async trend(dateFrom: string, dateTo: string) {
    const [from, to] = this.range(dateFrom, dateTo)
    const rows = await this.database.prepare(`
      SELECT
        currency_code AS currency,
        substr(transaction_date, 1, 10) AS date,
        SUM(CASE type WHEN 'expense' THEN amount_minor WHEN 'refund' THEN -amount_minor ELSE 0 END) AS amount_minor,
        SUM(CASE type WHEN 'expense' THEN amount_minor WHEN 'refund' THEN -amount_minor ELSE 0 END) AS net_spending_minor,
        SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) AS net_income_minor,
        SUM(CASE type WHEN 'expense' THEN -amount_minor WHEN 'refund' THEN amount_minor WHEN 'income' THEN amount_minor ELSE 0 END) AS total_minor
      FROM ledger_transactions
      WHERE transaction_date >= ? AND transaction_date < ?
        AND is_excluded_from_analytics = 0
        AND type IN ('expense', 'refund', 'income')
      GROUP BY currency_code, substr(transaction_date, 1, 10)
      ORDER BY currency_code, date
    `).bind(from, to).all<{ currency: string; date: string; amount_minor: number; net_spending_minor: number; net_income_minor: number; total_minor: number }>()
    return { items: rows.results }
  }

  async breakdown(dimension: 'category' | 'merchant' | 'payment_method', dateFrom: string, dateTo: string) {
    const [from, to] = this.range(dateFrom, dateTo)
    const label = {
      category: "COALESCE(c.name, 'Uncategorized')",
      merchant: 't.merchant_normalized',
      payment_method: "COALESCE(p.display_name, NULLIF(TRIM(t.card_raw_name), ''), 'Unmapped')",
    }[dimension]
    const rows = await this.database.prepare(`
      SELECT
        t.currency_code AS currency,
        ${label} AS label,
        SUM(CASE t.type WHEN 'expense' THEN t.amount_minor WHEN 'refund' THEN -t.amount_minor ELSE 0 END) AS amount_minor,
        SUM(CASE t.type WHEN 'expense' THEN t.amount_minor WHEN 'refund' THEN -t.amount_minor ELSE 0 END) AS net_spending_minor,
        SUM(CASE WHEN t.type = 'income' THEN t.amount_minor ELSE 0 END) AS net_income_minor,
        SUM(CASE t.type WHEN 'expense' THEN -t.amount_minor WHEN 'refund' THEN t.amount_minor WHEN 'income' THEN t.amount_minor ELSE 0 END) AS total_minor
      FROM ledger_transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN payment_methods p ON p.id = t.payment_method_id
      WHERE t.transaction_date >= ? AND t.transaction_date < ?
        AND t.is_excluded_from_analytics = 0
        AND t.type IN ('expense', 'refund', 'income')
      GROUP BY t.currency_code, ${label}
      ORDER BY amount_minor DESC
    `).bind(from, to).all<{ currency: string; label: string; amount_minor: number; net_spending_minor: number; net_income_minor: number; total_minor: number }>()
    return { items: rows.results }
  }
}
