import { z } from 'zod'

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable().optional()
const identifier = z.string().trim().min(1).max(128)
const dateTime = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date-time value')
const coordinate = z.union([z.string(), z.number()]).nullable().optional()

export const setupSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(12).max(256),
  base_currency: z.string().trim().length(3).default('HKD'),
  timezone: z.string().trim().min(1).max(80).default('Asia/Hong_Kong'),
})

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(256),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(256),
  new_password: z.string().min(12).max(256),
})

export const shortcutTransactionSchema = z.object({
  schema_version: z.literal(1).default(1),
  client_event_id: z.string().trim().min(1).max(64),
  amount: z.string().trim().min(1).max(40),
  currency: z.string().trim().length(3).nullable().optional(),
  merchant: nullableText(500),
  card: nullableText(240),
  transaction_date: dateTime.nullable().optional(),
  captured_at: dateTime.nullable().optional(),
  purpose: nullableText(240),
  location_name: nullableText(240),
  latitude: coordinate,
  longitude: coordinate,
  source: z.enum(['wallet_shortcut', 'manual_pwa', 'csv_import', 'recurring', 'simulator']).default('wallet_shortcut'),
})

export const shortcutBatchSchema = z.object({
  transactions: z.array(shortcutTransactionSchema).min(1).max(100),
})

export const manualTransactionSchema = z.object({
  client_event_id: z.string().trim().min(1).max(64).optional(),
  type: z.enum(['expense', 'income', 'refund', 'transfer', 'adjustment']).default('expense'),
  amount: z.string().trim().min(1).max(40),
  currency: z.string().trim().length(3),
  merchant: z.string().trim().min(1).max(500),
  category_id: identifier.nullable().optional(),
  payment_method_id: identifier.nullable().optional(),
  transaction_date: dateTime,
  purpose: nullableText(240),
  note: nullableText(4000),
  location_name: nullableText(240),
  latitude: coordinate,
  longitude: coordinate,
  is_excluded_from_analytics: z.boolean().default(false),
})

export const transactionUpdateSchema = z.object({
  type: z.enum(['expense', 'income', 'refund', 'transfer', 'adjustment']).optional(),
  amount: z.string().trim().min(1).max(40).optional(),
  currency: z.string().trim().length(3).optional(),
  merchant: z.string().trim().min(1).max(500).optional(),
  category_id: identifier.nullable().optional(),
  payment_method_id: identifier.nullable().optional(),
  purpose: nullableText(240),
  note: nullableText(4000),
  transaction_date: dateTime.optional(),
  location_name: nullableText(240),
  latitude: coordinate,
  longitude: coordinate,
  review_status: z.enum(['confirmed', 'needs_review', 'missing_information', 'duplicate_candidate']).optional(),
  is_excluded_from_analytics: z.boolean().optional(),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(80).default('circle'),
  sort_order: z.number().int().default(0),
})

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().min(1).max(80).optional(),
  sort_order: z.number().int().optional(),
  is_archived: z.boolean().optional(),
})

export const paymentMethodCreateSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  issuer: nullableText(120),
  last_four: z.string().regex(/^\d{4}$/u).nullable().optional(),
  method_type: z.enum(['credit_card', 'debit_card', 'transit_card', 'cash', 'digital_wallet', 'bank_transfer', 'other']).default('credit_card'),
  shortcut_match_text: nullableText(180),
  icon: z.string().trim().min(1).max(80).default('credit-card'),
})

export const paymentMethodUpdateSchema = paymentMethodCreateSchema.partial().extend({
  is_archived: z.boolean().optional(),
})

export const merchantRuleCreateSchema = z.object({
  pattern: z.string().trim().min(1).max(240),
  match_type: z.enum(['exact', 'contains', 'regex']).default('exact'),
  priority: z.number().int().min(0).max(10_000).default(100),
  category_id: identifier.nullable().optional(),
  payment_method_id: identifier.nullable().optional(),
  default_purpose: nullableText(240),
  is_enabled: z.boolean().default(true),
})

export const merchantRuleUpdateSchema = merchantRuleCreateSchema.partial()

export const simulationSchema = z.object({
  amount: z.string().trim().min(1).max(40).default('12.50'),
  currency: z.string().trim().length(3).default('HKD'),
  merchant: z.string().trim().min(1).max(500).default('TapLedger Test Merchant'),
})

export const deleteAllDataSchema = z.object({
  password: z.string().min(1).max(256),
  confirmation: z.string(),
})

export const restoreSchema = z.object({
  password: z.string().min(1).max(256),
  backup: z.unknown(),
})
