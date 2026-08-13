import { CatalogRepository, type MerchantRuleRecord } from '../repositories/catalogRepository'
import type { MerchantMatchType } from '../types'
import { HttpError } from '../utils/http'
import { normalizeMerchant } from '../utils/merchant'

const UNSAFE_REGEX = /(\\[1-9]|\(\?<=[^)]|\(\?<![^)]|\([^)]*[+*][^)]*\)[+*{])/u

export class MerchantRuleService {
  private readonly repository: CatalogRepository

  constructor(private readonly database: D1Database) {
    this.repository = new CatalogRepository(database)
  }

  normalizePattern(pattern: string, matchType: MerchantMatchType): string {
    if (matchType !== 'regex') return normalizeMerchant(pattern)
    if (pattern.length > 120 || UNSAFE_REGEX.test(pattern)) throw new HttpError(422, 'Regular expression is too complex')
    try {
      new RegExp(pattern, 'iu')
    } catch {
      throw new HttpError(422, 'Invalid regular expression')
    }
    return pattern
  }

  async findMatchingRule(normalizedMerchant: string): Promise<MerchantRuleRecord | null> {
    const rules = await this.repository.merchantRules(false)
    for (const rule of rules) {
      if (rule.match_type === 'exact' && normalizedMerchant === rule.normalized_pattern) return rule
      if (rule.match_type === 'contains' && normalizedMerchant.includes(rule.normalized_pattern)) return rule
      if (rule.match_type === 'regex') {
        try {
          if (new RegExp(rule.pattern, 'iu').test(normalizedMerchant.slice(0, 500))) return rule
        } catch {
          continue
        }
      }
    }
    return null
  }

  async create(input: {
    pattern: string
    match_type: MerchantMatchType
    priority: number
    category_id?: string | null
    payment_method_id?: string | null
    default_purpose?: string | null
    is_enabled: boolean
  }) {
    const id = crypto.randomUUID()
    const normalized = this.normalizePattern(input.pattern, input.match_type)
    await this.database.prepare(`
      INSERT INTO merchant_rules (
        id, pattern, normalized_pattern, match_type, priority, category_id,
        payment_method_id, default_purpose, is_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.pattern,
      normalized,
      input.match_type,
      input.priority,
      input.category_id ?? null,
      input.payment_method_id ?? null,
      input.default_purpose ?? null,
      input.is_enabled ? 1 : 0,
    ).run()
    return this.get(id)
  }

  async get(id: string) {
    const row = await this.database.prepare(`
      SELECT id, pattern, normalized_pattern, match_type, priority, category_id,
             payment_method_id, default_purpose, is_enabled, created_at
      FROM merchant_rules WHERE id = ?
    `).bind(id).first<MerchantRuleRecord>()
    if (!row) throw new HttpError(404, 'Merchant rule not found')
    const { created_at: _createdAt, ...value } = row
    return { ...value, is_enabled: Boolean(row.is_enabled) }
  }

  async update(id: string, input: Partial<{
    pattern: string
    match_type: MerchantMatchType
    priority: number
    category_id: string | null
    payment_method_id: string | null
    default_purpose: string | null
    is_enabled: boolean
  }>) {
    const current = await this.database.prepare(`
      SELECT id, pattern, normalized_pattern, match_type, priority, category_id,
             payment_method_id, default_purpose, is_enabled, created_at
      FROM merchant_rules WHERE id = ?
    `).bind(id).first<MerchantRuleRecord>()
    if (!current) throw new HttpError(404, 'Merchant rule not found')
    const pattern = input.pattern ?? current.pattern
    const matchType = input.match_type ?? current.match_type
    const normalized = this.normalizePattern(pattern, matchType)
    await this.database.prepare(`
      UPDATE merchant_rules
      SET pattern = ?, normalized_pattern = ?, match_type = ?, priority = ?,
          category_id = ?, payment_method_id = ?, default_purpose = ?,
          is_enabled = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      pattern,
      normalized,
      matchType,
      input.priority ?? current.priority,
      input.category_id === undefined ? current.category_id : input.category_id,
      input.payment_method_id === undefined ? current.payment_method_id : input.payment_method_id,
      input.default_purpose === undefined ? current.default_purpose : input.default_purpose,
      input.is_enabled === undefined ? current.is_enabled : input.is_enabled ? 1 : 0,
      new Date().toISOString(),
      id,
    ).run()
    return this.get(id)
  }
}
