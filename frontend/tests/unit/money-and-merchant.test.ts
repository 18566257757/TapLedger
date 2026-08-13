import { describe, expect, it } from 'vitest'
import { fromMinorUnits, toMinorUnits } from '../../src/worker/utils/money'
import { normalizeMerchant } from '../../src/worker/utils/merchant'

describe('Worker-safe money handling', () => {
  it.each([
    ['42.80', 'HKD', 4280],
    ['100', 'JPY', 100],
    ['1.005', 'USD', 101],
    ['19.995', 'EUR', 2000],
  ])('converts %s %s to exact minor units', (amount, currency, expected) => {
    expect(toMinorUnits(amount, currency)).toBe(expected)
  })

  it('formats currency exponents without floating point arithmetic', () => {
    expect(fromMinorUnits(4280, 'HKD')).toBe('42.80')
    expect(fromMinorUnits(100, 'JPY')).toBe('100')
  })
})

describe('merchant normalization parity', () => {
  it.each([
    ['  STARBUCKS   HK 023  ', 'STARBUCKS'],
    ["McDonald's Central", 'MCDONALDS'],
    ['MCDONALD’S - IFC', 'MCDONALDS'],
    ['香港 茶餐廳', '香港 茶餐廳'],
    ['PARKnSHOP!!!', 'PARKNSHOP'],
    ['BROWSER REVIEW WWGHMP97', 'BROWSER REVIEW WWGHMP97'],
    [null, 'UNKNOWN MERCHANT'],
  ])('normalizes %s', (raw, expected) => {
    expect(normalizeMerchant(raw)).toBe(expected)
  })
})
