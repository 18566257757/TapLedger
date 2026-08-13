const encoder = new TextEncoder()
const PASSWORD_ALGORITHM = 'PBKDF2'
const PASSWORD_DIGEST = 'SHA-256'
// Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
// Keep the encoded count versioned so it can be raised or migrated later.
const PASSWORD_ITERATIONS = 100_000
const PASSWORD_BYTES = 32

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), PASSWORD_ALGORITHM, false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: PASSWORD_ALGORITHM, hash: PASSWORD_DIGEST, salt, iterations },
    key,
    PASSWORD_BYTES * 8,
  )
  return new Uint8Array(bits)
}

export function newSecret(byteCount = 32): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteCount)))
}

export async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest(PASSWORD_DIGEST, encoder.encode(value))))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await derivePassword(password, salt, PASSWORD_ITERATIONS)
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(derived)}`
}

export async function verifyPassword(encoded: string, password: string): Promise<boolean> {
  const [scheme, iterationsValue, saltValue, expectedValue] = encoded.split('$')
  const iterations = Number.parseInt(iterationsValue ?? '', 10)
  if (scheme !== 'pbkdf2-sha256' || !Number.isInteger(iterations) || iterations < 100_000 || !saltValue || !expectedValue) return false
  try {
    const actual = await derivePassword(password, base64UrlToBytes(saltValue), iterations)
    return constantTimeEqual(actual, base64UrlToBytes(expectedValue))
  } catch {
    return false
  }
}
