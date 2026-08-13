type JsonRecord = Record<string, unknown>

const CURRENCY_ALIASES: Readonly<Record<string, string>> = {
  港币: 'HKD',
  港幣: 'HKD',
  港元: 'HKD',
  人民币: 'CNY',
  人民幣: 'CNY',
  人民币元: 'CNY',
  人民幣元: 'CNY',
  美元: 'USD',
  加元: 'CAD',
  日元: 'JPY',
  日圓: 'JPY',
  欧元: 'EUR',
  歐元: 'EUR',
  英镑: 'GBP',
  英鎊: 'GBP',
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function first(record: JsonRecord, canonical: string, aliases: readonly string[]): unknown {
  if (Object.hasOwn(record, canonical)) return record[canonical]
  for (const alias of aliases) if (Object.hasOwn(record, alias)) return record[alias]
  return undefined
}

function text(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value === 'string') return value.trim()
  if (!isRecord(value)) return undefined
  const nested = first(value, 'name', ['Name', '名称', '名稱', 'displayName', 'display_name', 'title', '标题', '標題'])
  return typeof nested === 'string' ? nested.trim() : undefined
}

function scalar(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined
  if (typeof value === 'string') return value.trim()
  if (!isRecord(value)) return undefined
  return scalar(first(value, 'value', ['Value', 'amount', 'Amount', 'number', 'Number', '数量', '數量', '数值', '數值', '值']))
}

function amount(value: unknown): string | undefined {
  const raw = scalar(value)?.normalize('NFKC').replaceAll(',', '').trim()
  if (!raw) return undefined
  const match = /^(?:(?:HKD|HK\$|CNY|RMB|CN¥|USD|US\$|CAD|CA\$|JPY|EUR|GBP|[$¥￥€£])\s*)?(\d+(?:\.\d+)?)$/iu.exec(raw)
  return match?.[1] ?? raw
}

function currency(value: unknown): string | null | undefined {
  if (value === null) return null
  const raw = scalar(value)?.normalize('NFKC').trim()
  if (!raw) return undefined
  return CURRENCY_ALIASES[raw] ?? raw.toUpperCase()
}

function currencyFromAmount(value: unknown): string | undefined {
  const raw = scalar(value)?.normalize('NFKC').replaceAll(' ', '').toUpperCase()
  if (!raw) return undefined
  if (/^(?:HKD|HK\$)/u.test(raw)) return 'HKD'
  if (/^(?:CNY|RMB|CN¥|¥|￥)/u.test(raw)) return 'CNY'
  if (/^(?:USD|US\$)/u.test(raw)) return 'USD'
  if (/^(?:CAD|CA\$)/u.test(raw)) return 'CAD'
  if (raw.startsWith('JPY')) return 'JPY'
  if (/^(?:EUR|€)/u.test(raw)) return 'EUR'
  if (/^(?:GBP|£)/u.test(raw)) return 'GBP'
  return undefined
}

function dateTime(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value === 'string') return value.trim()
  if (!isRecord(value)) return undefined
  const nested = first(value, 'date', ['Date', 'time', 'Time', 'value', 'Value', '日期', '时间', '時間'])
  return typeof nested === 'string' ? nested.trim() : undefined
}

function coordinate(value: unknown): string | number | null | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  return undefined
}

function source(value: unknown): string | undefined {
  const raw = scalar(value)
  if (!raw) return undefined
  if (['钱包', '錢包', '钱包快捷指令', '錢包捷徑', 'Wallet'].includes(raw)) return 'wallet_shortcut'
  return raw
}

function assign(record: JsonRecord, key: string, value: unknown): void {
  if (value !== undefined) record[key] = value
}

/**
 * Accepts the canonical public API contract plus localized iPhone Shortcut
 * dictionary labels. Canonical English keys always take precedence.
 */
export function adaptShortcutPayload(input: unknown): unknown {
  if (!isRecord(input)) return input
  const nested = first(input, 'transaction', [
    'transaction_info', 'transactionInfo', '交易信息', '交易資訊', '交易资料', '交易資料',
  ])
  const payload: JsonRecord = isRecord(nested) ? { ...nested, ...input } : input
  const adapted: JsonRecord = { ...payload }
  const rawAmount = first(payload, 'amount', ['金额', '金額'])
  const rawLocation = first(payload, 'location_name', ['位置名称', '位置名稱', '位置', '地点', '地點'])
  const location = isRecord(rawLocation) ? rawLocation : undefined

  const version = first(payload, 'schema_version', ['版本', '架构版本', '架構版本'])
  const normalizedVersion = version === '1' ? 1 : version
  assign(adapted, 'schema_version', normalizedVersion)
  assign(adapted, 'client_event_id', text(first(payload, 'client_event_id', [
    '事件ID', '事件 ID', '客户端事件ID', '客户端事件 ID', '客戶端事件ID', '客戶端事件 ID',
  ])))
  assign(adapted, 'amount', amount(rawAmount))
  assign(adapted, 'currency', currency(first(payload, 'currency', ['币种', '幣種', '货币', '貨幣'])) ?? currencyFromAmount(rawAmount))
  assign(adapted, 'merchant', text(first(payload, 'merchant', ['商户', '商戶', '商家'])))
  assign(adapted, 'card', text(first(payload, 'card', ['卡片', '卡片或凭证', '卡片或憑證', '付款卡片'])))
  assign(adapted, 'transaction_date', dateTime(first(payload, 'transaction_date', ['交易时间', '交易時間', '时间', '時間', '日期'])))
  assign(adapted, 'captured_at', dateTime(first(payload, 'captured_at', ['捕获时间', '擷取時間', '记录时间', '記錄時間'])))
  assign(adapted, 'purpose', text(first(payload, 'purpose', ['交易名称', '交易名稱', '用途', '目的'])))
  assign(adapted, 'location_name', text(rawLocation))
  assign(adapted, 'latitude', coordinate(first(payload, 'latitude', ['纬度', '緯度']) ?? (location ? first(location, 'latitude', ['Latitude', '纬度', '緯度']) : undefined)))
  assign(adapted, 'longitude', coordinate(first(payload, 'longitude', ['经度', '經度']) ?? (location ? first(location, 'longitude', ['Longitude', '经度', '經度']) : undefined)))
  assign(adapted, 'source', source(first(payload, 'source', ['来源', '來源'])))
  return adapted
}
