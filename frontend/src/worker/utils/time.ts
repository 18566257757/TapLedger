export function nowIso(): string {
  return new Date().toISOString()
}

interface LocalDateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const CHINESE_LOCAL_DATE_TIME = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/u
const SHORTCUT_GMT_DATE_TIME = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+GMT([+-])(\d{1,2})(?::?(\d{2}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/iu

function validParts(parts: LocalDateTimeParts): boolean {
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))
  return check.getUTCFullYear() === parts.year && check.getUTCMonth() === parts.month - 1 && check.getUTCDate() === parts.day
    && check.getUTCHours() === parts.hour && check.getUTCMinutes() === parts.minute && check.getUTCSeconds() === parts.second
}

function localizedParts(value: string): LocalDateTimeParts | null {
  const match = CHINESE_LOCAL_DATE_TIME.exec(value.trim())
  if (!match) return null
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  }
  return validParts(parts) ? parts : null
}

function shortcutGmtIso(value: string): string | null {
  const match = SHORTCUT_GMT_DATE_TIME.exec(value.trim())
  if (!match) return null
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[7]),
    minute: Number(match[8]),
    second: Number(match[9] ?? 0),
  }
  const offsetHours = Number(match[5])
  const offsetMinutes = Number(match[6] ?? 0)
  if (!validParts(parts) || offsetHours > 14 || offsetMinutes > 59) return null
  const direction = match[4] === '+' ? 1 : -1
  const offset = direction * (offsetHours * 60 + offsetMinutes) * 60_000
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - offset).toISOString()
}

function partsAt(instant: number, timeZone: string): LocalDateTimeParts {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const values = Object.fromEntries(formatted.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function matches(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day
    && left.hour === right.hour && left.minute === right.minute && left.second === right.second
}

function localDateTimeToIso(parts: LocalDateTimeParts, timeZone: string): string {
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const offsetAt = (instant: number) => {
    const zoned = partsAt(instant, timeZone)
    return Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second) - instant
  }
  let instant = wallClock - offsetAt(wallClock)
  instant = wallClock - offsetAt(instant)
  if (!matches(partsAt(instant, timeZone), parts)) throw new Error('Invalid local date-time value')
  return new Date(instant).toISOString()
}

export function isSupportedShortcutDateTime(value: string): boolean {
  return localizedParts(value) !== null || shortcutGmtIso(value) !== null || !Number.isNaN(new Date(value).getTime())
}

export function normalizeDateTime(value: string | null | undefined, fallback = nowIso(), timeZone = 'UTC'): string {
  if (!value) return fallback
  const shortcutGmt = shortcutGmtIso(value)
  if (shortcutGmt) return shortcutGmt
  const local = localizedParts(value)
  if (local) return localDateTimeToIso(local, timeZone)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date-time value')
  return parsed.toISOString()
}

export function addHours(isoValue: string, hours: number): string {
  return new Date(new Date(isoValue).getTime() + hours * 60 * 60 * 1000).toISOString()
}
