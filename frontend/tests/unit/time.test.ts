import { describe, expect, it } from 'vitest'
import { isSupportedShortcutDateTime, normalizeDateTime } from '../../src/worker/utils/time'

describe('Shortcut date-time normalization', () => {
  it('normalizes both real iPhone output formats to the same UTC instant', () => {
    const shortcutGmt = '2026/9/15 GMT+8 09:41:00'
    const isoOffset = '2026-09-15T09:41:00+08:00'

    expect(isSupportedShortcutDateTime(shortcutGmt)).toBe(true)
    expect(isSupportedShortcutDateTime(isoOffset)).toBe(true)
    expect(normalizeDateTime(shortcutGmt, undefined, 'Asia/Hong_Kong')).toBe('2026-09-15T01:41:00.000Z')
    expect(normalizeDateTime(isoOffset, undefined, 'Asia/Hong_Kong')).toBe('2026-09-15T01:41:00.000Z')
  })

  it('interprets Chinese local time using the configured ledger timezone', () => {
    expect(normalizeDateTime('2026年8月13日 15:06', undefined, 'Asia/Hong_Kong')).toBe('2026-08-13T07:06:00.000Z')
  })
})
