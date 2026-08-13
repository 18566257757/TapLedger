import type { MerchantMatchType } from '../types'

export interface CategoryRecord {
  id: string
  name: string
  icon: string
  sort_order: number
  is_system: number
  is_archived: number
}

export interface PaymentMethodRecord {
  id: string
  display_name: string
  issuer: string | null
  last_four: string | null
  method_type: string
  shortcut_match_text: string | null
  icon: string
  is_archived: number
}

export interface MerchantRuleRecord {
  id: string
  pattern: string
  normalized_pattern: string
  match_type: MerchantMatchType
  priority: number
  category_id: string | null
  payment_method_id: string | null
  default_purpose: string | null
  is_enabled: number
  created_at: string
}

export function presentCategory(row: CategoryRecord) {
  return { ...row, is_system: Boolean(row.is_system), is_archived: Boolean(row.is_archived) }
}

export function presentPaymentMethod(row: PaymentMethodRecord) {
  return { ...row, is_archived: Boolean(row.is_archived) }
}

export function presentMerchantRule(row: MerchantRuleRecord) {
  const { created_at: _createdAt, ...presented } = row
  return { ...presented, is_enabled: Boolean(row.is_enabled) }
}

export class CatalogRepository {
  constructor(private readonly database: D1Database) {}

  async categories(includeArchived = false) {
    const rows = await this.database.prepare(`
      SELECT id, name, icon, sort_order, is_system, is_archived
      FROM categories
      ${includeArchived ? '' : 'WHERE is_archived = 0'}
      ORDER BY sort_order, name
    `).all<CategoryRecord>()
    return rows.results.map(presentCategory)
  }

  async categoryExists(id: string): Promise<boolean> {
    return Boolean(await this.database.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first())
  }

  async paymentMethods(includeArchived = false) {
    const rows = await this.database.prepare(`
      SELECT id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
      FROM payment_methods
      ${includeArchived ? '' : 'WHERE is_archived = 0'}
      ORDER BY display_name
    `).all<PaymentMethodRecord>()
    return rows.results.map(presentPaymentMethod)
  }

  async paymentMethodExists(id: string): Promise<boolean> {
    return Boolean(await this.database.prepare('SELECT id FROM payment_methods WHERE id = ?').bind(id).first())
  }

  async matchPaymentMethod(cardRawName: string | null | undefined): Promise<PaymentMethodRecord | null> {
    if (!cardRawName?.trim()) return null
    const rows = await this.database.prepare(`
      SELECT id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
      FROM payment_methods
      WHERE is_archived = 0 AND shortcut_match_text IS NOT NULL
      ORDER BY display_name
    `).all<PaymentMethodRecord>()
    const normalizedCard = cardRawName.trim().toUpperCase()
    return rows.results.find((row) => Boolean(row.shortcut_match_text?.trim()) && normalizedCard.includes(row.shortcut_match_text!.trim().toUpperCase())) ?? null
  }

  async merchantRules(includeDisabled = true): Promise<MerchantRuleRecord[]> {
    const rows = await this.database.prepare(`
      SELECT id, pattern, normalized_pattern, match_type, priority, category_id,
             payment_method_id, default_purpose, is_enabled, created_at
      FROM merchant_rules
      ${includeDisabled ? '' : 'WHERE is_enabled = 1'}
      ORDER BY CASE match_type WHEN 'exact' THEN 0 WHEN 'contains' THEN 1 ELSE 2 END,
               priority, created_at
    `).all<MerchantRuleRecord>()
    return rows.results
  }
}
