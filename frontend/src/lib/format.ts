function activeLocale(): string { return document.documentElement.lang || navigator.language }

export function formatMoney(amountMinor: number, currency: string, locale = activeLocale()): string {
  const exponent = currency === 'JPY' ? 0 : 2
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amountMinor / 10 ** exponent)
}

export function formatDateTime(value: string, locale = activeLocale()): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function monthRange(now = new Date()): { from: string; to: string; label: string } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: new Intl.DateTimeFormat(activeLocale(), { month: 'long', year: 'numeric' }).format(now),
  }
}
