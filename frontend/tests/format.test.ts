import { describe, expect, it } from 'vitest'
import { formatMoney, monthRange } from '../src/lib/format'

describe('formatMoney', () => {
  it('uses two minor-unit digits for HKD', () => {
    expect(formatMoney(842630, 'HKD', 'en-HK')).toContain('8,426.30')
  })

  it('uses zero minor-unit digits for JPY', () => {
    expect(formatMoney(1200, 'JPY', 'en-US')).toBe('¥1,200')
  })
})

describe('monthRange', () => {
  it('returns an exclusive next-month boundary', () => {
    const range = monthRange(new Date('2026-08-12T09:00:00Z'))
    expect(range.from).toBe('2026-08-01T00:00:00.000Z')
    expect(range.to).toBe('2026-09-01T00:00:00.000Z')
  })
})
