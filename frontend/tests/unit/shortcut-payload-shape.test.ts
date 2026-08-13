import { describe, expect, it } from 'vitest'
import { describeShortcutPayloadShape } from '../../src/worker/adapters/shortcutPayload'

describe('Shortcut payload shape diagnostics', () => {
  it('reports only recognized keys and types for nested dictionaries', () => {
    const shape = describeShortcutPayloadShape({
      交易信息: { 金额: 'HK$9.00', 商户: 'Private merchant', 位置: 'Private address', 未知字段: 'Private value' },
    })
    expect(shape).toEqual({
      body_type: 'object',
      top_level_recognized: [],
      wrappers: [{
        key: '交易信息',
        value_type: 'object',
        serialization: 'object',
        recognized_fields: ['金额:string', '商户:string', '位置:string'],
        unknown_field_count: 1,
      }],
      unknown_top_level_count: 0,
    })
    expect(JSON.stringify(shape)).not.toContain('Private')
    expect(JSON.stringify(shape)).not.toContain('HK$9.00')
  })

  it('recognizes JSON and native key-value dictionary text without reporting values', () => {
    const jsonShape = describeShortcutPayloadShape({ 交易信息: JSON.stringify({ 金额: 'HK$9.00', 商户: 'Private merchant' }) })
    expect(jsonShape).toMatchObject({
      wrappers: [{ key: '交易信息', value_type: 'string', serialization: 'json', recognized_fields: ['金额:string', '商户:string'] }],
    })
    const textShape = describeShortcutPayloadShape({ 交易信息: '金额： HK$9.00\n商户： Private merchant' })
    expect(textShape).toMatchObject({
      wrappers: [{ key: '交易信息', value_type: 'string', serialization: 'key_value_text', recognized_fields: ['金额:string', '商户:string'] }],
    })
    expect(JSON.stringify([jsonShape, textShape])).not.toContain('Private')
    expect(JSON.stringify([jsonShape, textShape])).not.toContain('HK$9.00')
  })
})
