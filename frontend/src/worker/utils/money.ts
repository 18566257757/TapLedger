const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = {
  HKD: 2,
  CNY: 2,
  USD: 2,
  CAD: 2,
  JPY: 0,
  EUR: 2,
  GBP: 2,
}

export class MoneyError extends Error {}

export function currencyExponent(currencyCode: string): number {
  const normalized = currencyCode.trim().toUpperCase()
  const exponent = CURRENCY_EXPONENTS[normalized]
  if (exponent === undefined) throw new MoneyError(`Unsupported currency: ${normalized || '<empty>'}`)
  return exponent
}

export function toMinorUnits(value: string, currencyCode: string): number {
  if (typeof value !== 'string') throw new MoneyError('Amount must be a decimal string')
  const normalized = value.trim()
  const match = /^(\d+)(?:\.(\d+))?$/u.exec(normalized)
  if (!match) throw new MoneyError('Amount is not a valid non-negative decimal number')
  const exponent = currencyExponent(currencyCode)
  const whole = match[1]
  const fraction = match[2] ?? ''
  const kept = fraction.slice(0, exponent).padEnd(exponent, '0')
  let minor = BigInt(whole) * 10n ** BigInt(exponent) + BigInt(kept || '0')
  if ((fraction[exponent] ?? '0') >= '5') minor += 1n
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new MoneyError('Amount is too large')
  return Number(minor)
}

export function fromMinorUnits(amountMinor: number, currencyCode: string): string {
  if (!Number.isSafeInteger(amountMinor)) throw new MoneyError('Minor amount must be a safe integer')
  const exponent = currencyExponent(currencyCode)
  const negative = amountMinor < 0
  const absolute = Math.abs(amountMinor).toString().padStart(exponent + 1, '0')
  if (exponent === 0) return `${negative ? '-' : ''}${absolute}`
  return `${negative ? '-' : ''}${absolute.slice(0, -exponent)}.${absolute.slice(-exponent)}`
}
