import { beforeEach, describe, expect, it } from 'vitest'
import { enqueueTransaction, readPendingTransactions, removePendingTransaction } from '../src/lib/pendingQueue'

describe('pending transaction queue', () => {
  beforeEach(() => localStorage.clear())

  it('stores and removes pending entries without sending them automatically', () => {
    const item = enqueueTransaction({ amount: '12.50', currency: 'HKD' })
    expect(readPendingTransactions()).toHaveLength(1)
    expect(readPendingTransactions()[0].payload.amount).toBe('12.50')
    removePendingTransaction(item.id)
    expect(readPendingTransactions()).toEqual([])
  })

  it('recovers safely from malformed storage', () => {
    localStorage.setItem('tapledger-pending-transactions-v1', '{bad')
    expect(readPendingTransactions()).toEqual([])
  })
})
