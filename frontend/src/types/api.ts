export type TransactionType = 'expense' | 'income' | 'refund' | 'transfer' | 'adjustment'
export type ReviewStatus = 'confirmed' | 'needs_review' | 'missing_information' | 'duplicate_candidate'
export type TransactionSource = 'wallet_shortcut' | 'manual_pwa' | 'csv_import' | 'recurring' | 'simulator'
export type AnalyticsMetric = 'net_spending' | 'net_income' | 'total'

export interface User {
  id: string
  username: string
  display_name: string
}

export interface AuthResponse {
  user: User
  csrf_token: string
}

export interface Transaction {
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

export interface TransactionList {
  items: Transaction[]
  total: number
  page: number
  page_size: number
}

export interface Category {
  id: string
  name: string
  icon: string
  sort_order: number
  is_system: boolean
  is_archived: boolean
}

export interface PaymentMethod {
  id: string
  display_name: string
  issuer: string | null
  last_four: string | null
  method_type: string
  shortcut_match_text: string | null
  icon: string
  is_archived: boolean
}

export interface MerchantRule {
  id: string
  pattern: string
  normalized_pattern: string
  match_type: 'exact' | 'contains' | 'regex'
  priority: number
  category_id: string | null
  payment_method_id: string | null
  default_purpose: string | null
  is_enabled: boolean
}

export interface CurrencySummary {
  currency: string
  net_spending_minor: number
  net_income_minor: number
  total_minor: number
  transaction_count: number
  largest_minor: number
}

export interface AnalyticsSummary {
  multiple_currencies: boolean
  currencies: CurrencySummary[]
}

export interface TrendPoint {
  currency: string
  date: string
  amount_minor: number
  net_spending_minor: number
  net_income_minor: number
  total_minor: number
}

export interface BreakdownItem {
  currency: string
  label: string
  amount_minor: number
  net_spending_minor: number
  net_income_minor: number
  total_minor: number
}

export interface DeploymentStatus {
  service_health: string
  database_health: string
  database_binding: string
  database_size: number
  deployment_url: string
  last_import: string | null
  recent_import_result: string | null
  pending_reviews: number
  last_backup: string | null
  version: string
  uptime_seconds: number
}
