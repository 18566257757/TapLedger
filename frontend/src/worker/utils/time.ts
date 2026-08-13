export function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeDateTime(value: string | null | undefined, fallback = nowIso()): string {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date-time value')
  return parsed.toISOString()
}

export function addHours(isoValue: string, hours: number): string {
  return new Date(new Date(isoValue).getTime() + hours * 60 * 60 * 1000).toISOString()
}
