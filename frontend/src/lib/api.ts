import type {
  AnalyticsSummary,
  AuthResponse,
  BreakdownItem,
  Category,
  MerchantRule,
  PaymentMethod,
  DeploymentStatus,
  Transaction,
  TransactionList,
  TrendPoint,
  User,
} from '../types/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }))
    throw new ApiError(body.detail ?? 'Request failed', response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  setupStatus: () => request<{ setup_required: boolean }>('/api/v1/setup/status'),
  setupAdmin: (payload: { username: string; password: string; base_currency: string; timezone: string }) =>
    request<AuthResponse>('/api/v1/setup/admin', { method: 'POST', body: JSON.stringify(payload) }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<User>('/api/v1/auth/me'),
  refreshCsrf: () => request<AuthResponse>('/api/v1/auth/csrf', { method: 'POST' }),
  logout: (csrf: string) => request<void>('/api/v1/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),

  transactions: (params = '') => request<TransactionList>(`/api/v1/transactions${params}`),
  createTransaction: (payload: Record<string, unknown>, csrf: string) =>
    request<{ transaction_id: string }>('/api/v1/transactions', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify(payload),
    }),
  updateTransaction: (id: string, payload: Record<string, unknown>, csrf: string) =>
    request<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify(payload),
    }),
  deleteTransaction: (id: string, csrf: string) =>
    request<void>(`/api/v1/transactions/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrf } }),

  categories: () => request<Category[]>('/api/v1/categories'),
  createCategory: (payload: Record<string, unknown>, csrf: string) =>
    request<Category>('/api/v1/categories', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: Record<string, unknown>, csrf: string) =>
    request<Category>(`/api/v1/categories/${id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) }),
  paymentMethods: () => request<PaymentMethod[]>('/api/v1/payment-methods'),
  createPaymentMethod: (payload: Record<string, unknown>, csrf: string) =>
    request<PaymentMethod>('/api/v1/payment-methods', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) }),
  updatePaymentMethod: (id: string, payload: Record<string, unknown>, csrf: string) =>
    request<PaymentMethod>(`/api/v1/payment-methods/${id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) }),
  merchantRules: () => request<MerchantRule[]>('/api/v1/merchant-rules'),
  createRule: (payload: Record<string, unknown>, csrf: string) =>
    request<MerchantRule>('/api/v1/merchant-rules', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify(payload),
    }),
  updateRule: (id: string, payload: Record<string, unknown>, csrf: string) =>
    request<MerchantRule>(`/api/v1/merchant-rules/${id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) }),
  review: () => request<Transaction[]>('/api/v1/review'),
  confirmReview: (id: string, csrf: string) =>
    request<Transaction>(`/api/v1/review/${id}/confirm`, { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),
  deleteReviewDuplicate: (id: string, csrf: string) =>
    request<void>(`/api/v1/review/${id}/delete-duplicate`, { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),

  analyticsSummary: (from: string, to: string) =>
    request<AnalyticsSummary>(`/api/v1/analytics/summary?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`),
  trend: (from: string, to: string) =>
    request<{ items: TrendPoint[] }>(`/api/v1/analytics/trend?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`),
  breakdown: (dimension: 'categories' | 'merchants' | 'payment-methods', from: string, to: string) =>
    request<{ items: BreakdownItem[] }>(`/api/v1/analytics/${dimension}?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`),

  status: () => request<DeploymentStatus>('/api/v1/status'),
  rotateToken: (csrf: string) => request<{ token: string; warning: string }>('/api/v1/automation/token/rotate', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),
  simulateImport: (csrf: string) => request<{ result: string; transaction_id: string }>('/api/v1/automation/simulate', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ amount: '12.50', currency: 'HKD', merchant: 'TapLedger Test Merchant' }) }),
  createBackup: (csrf: string) => request<{ name: string; size_bytes: number; sha256: string }>('/api/v1/admin/backup', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),
  backups: () => request<{ items: Array<{ name: string; size_bytes: number }> }>('/api/v1/admin/backups'),
  deleteAllData: (password: string, confirmation: string, csrf: string) => request<{ deleted_transactions: number; backup_name: string }>('/api/v1/admin/delete-all-data', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ password, confirmation }) }),
}
