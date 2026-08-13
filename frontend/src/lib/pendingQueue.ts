const STORAGE_KEY = 'tapledger-pending-transactions-v1'

export interface PendingTransaction {
  id: string
  payload: Record<string, unknown>
  createdAt: string
}

export function readPendingTransactions(): PendingTransaction[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as PendingTransaction[]) : []
  } catch {
    return []
  }
}

export function enqueueTransaction(payload: Record<string, unknown>): PendingTransaction {
  const items = readPendingTransactions()
  const id = crypto.randomUUID()
  const item = { id, payload: { client_event_id: id, ...payload }, createdAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...items, item]))
  return item
}

export function removePendingTransaction(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readPendingTransactions().filter((item) => item.id !== id)))
}
