import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransactionRow } from '../src/components/TransactionRow'
import type { Transaction } from '../src/types/api'
import { LocaleProvider } from '../src/app/LocaleProvider'

const transaction: Transaction = {
  id: 'tx-1', client_event_id: 'event-1', type: 'expense', amount: '45.80', amount_minor: 4580, currency: 'HKD',
  transaction_date: '2026-08-12T08:00:00Z', captured_at: '2026-08-12T08:00:00Z', merchant_raw: 'STARBUCKS',
  merchant_normalized: 'Starbucks', card_raw_name: null, category_id: 'cat-1', category_name: 'Coffee', payment_method_id: null,
  payment_method_name: null, purpose: null, note: null, location_name: null, latitude: null, longitude: null,
  source: 'manual_pwa', review_status: 'confirmed', is_excluded_from_analytics: false,
  created_at: '2026-08-12T08:00:00Z', updated_at: '2026-08-12T08:00:00Z',
}

describe('TransactionRow', () => {
  it('shows merchant, category, status, and a signed currency amount', () => {
    render(<LocaleProvider><TransactionRow transaction={transaction} /></LocaleProvider>)
    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getAllByText('Coffee')).toHaveLength(2)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText(/-.*45\.80/)).toBeInTheDocument()
  })
})
