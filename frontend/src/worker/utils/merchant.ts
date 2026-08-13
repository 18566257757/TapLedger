const TRAILING_BRANCH = /(?:\s+(?:HK|HONG\s+KONG|CENTRAL|IFC))?(?:\s+(?:STORE|SHOP|BRANCH|NO))?\s+#?\d{2,6}$/iu
const TRAILING_LOCATION = /\s+(?:HK|HONG\s+KONG|CENTRAL|IFC)$/iu
const MCDONALDS = /^MC\s*DONALD\s*S(?:\s+.*)?$/iu

export function normalizeMerchant(value: string | null | undefined): string {
  if (!value?.trim()) return 'UNKNOWN MERCHANT'
  let normalized = value.normalize('NFKC').toUpperCase().trim()
  normalized = normalized.replace(/[’‘`']/gu, '')
  normalized = normalized.replace(/[^\p{L}\p{N}_\s]/gu, ' ')
  normalized = normalized.replace(/\s+/gu, ' ').trim()
  normalized = normalized.replace(TRAILING_BRANCH, '').trim()
  normalized = normalized.replace(TRAILING_LOCATION, '').trim()
  if (MCDONALDS.test(normalized)) return 'MCDONALDS'
  return normalized || 'UNKNOWN MERCHANT'
}
