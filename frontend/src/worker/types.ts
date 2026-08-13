export type TransactionType = 'expense' | 'income' | 'refund' | 'transfer' | 'adjustment'
export type TransactionSource = 'wallet_shortcut' | 'manual_pwa' | 'csv_import' | 'recurring' | 'simulator'
export type ReviewStatus = 'confirmed' | 'needs_review' | 'missing_information' | 'duplicate_candidate'
export type MerchantMatchType = 'exact' | 'contains' | 'regex'

export interface AuthenticatedSession {
  user: {
    id: string
    username: string
  }
  session: {
    id: string
    csrfTokenHash: string
    expiresAt: string
  }
}

export type AppEnvironment = {
  Bindings: {
    DB: D1Database
  }
  Variables: {
    auth: AuthenticatedSession
  }
}

export interface TransactionRecord {
  id: string
  client_event_id: string
  type: TransactionType
  amount_minor: number
  currency_code: string
  transaction_date: string
  captured_at: string
  merchant_raw: string
  merchant_normalized: string
  card_raw_name: string | null
  category_id: string | null
  category_name: string | null
  payment_method_id: string | null
  payment_method_name: string | null
  purpose: string | null
  note: string | null
  location_name: string | null
  latitude: string | null
  longitude: string | null
  source: TransactionSource
  review_status: ReviewStatus
  is_excluded_from_analytics: number
  deduplication_key: string
  created_at: string
  updated_at: string
}

export interface TransactionResponse {
  id: string
  client_event_id: string
  type: TransactionType
  amount: string
  amount_minor: number
  currency: string
  transaction_date: string
  captured_at: string
  merchant_raw: string
  merchant_normalized: string
  card_raw_name: string | null
  category_id: string | null
  category_name: string | null
  payment_method_id: string | null
  payment_method_name: string | null
  purpose: string | null
  note: string | null
  location_name: string | null
  latitude: string | null
  longitude: string | null
  source: TransactionSource
  review_status: ReviewStatus
  is_excluded_from_analytics: boolean
  created_at: string
  updated_at: string
}

export interface IngestionResult {
  result: 'created' | 'created_needs_review' | 'already_processed'
  transaction: TransactionResponse
  duplicate: boolean
}

export interface ShortcutTransactionInput {
  schema_version?: number
  client_event_id: string
  amount: string
  currency?: string | null
  merchant?: string | null
  card?: string | null
  transaction_date?: string | null
  captured_at?: string | null
  purpose?: string | null
  location_name?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  source?: TransactionSource
}

export interface ManualTransactionInput {
  client_event_id?: string
  type?: TransactionType
  amount: string
  currency: string
  merchant: string
  category_id?: string | null
  payment_method_id?: string | null
  transaction_date: string
  purpose?: string | null
  note?: string | null
  location_name?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  is_excluded_from_analytics?: boolean
}
