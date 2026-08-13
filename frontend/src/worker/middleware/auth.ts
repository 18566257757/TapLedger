import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { AppEnvironment } from '../types'
import { SessionService } from '../services/sessionService'
import { ShortcutTokenService } from '../services/shortcutTokenService'
import { sha256Hex } from '../utils/crypto'
import { HttpError } from '../utils/http'

export const SESSION_COOKIE_NAME = 'tapledger_session'
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export function setSessionCookie(c: Context<AppEnvironment>, token: string): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(c: Context<AppEnvironment>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Strict',
  })
}

export const requireSession = createMiddleware<AppEnvironment>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (!token) throw new HttpError(401, 'Not authenticated')
  const auth = await new SessionService(c.env.DB).getActive(token)
  if (!auth) throw new HttpError(401, 'Session expired')
  c.set('auth', auth)
  await next()
})

export const requireCsrf = createMiddleware<AppEnvironment>(async (c, next) => {
  const auth = c.get('auth')
  const token = c.req.header('X-CSRF-Token')
  if (!token || (await sha256Hex(token)) !== auth.session.csrfTokenHash) throw new HttpError(403, 'Invalid CSRF token')
  await next()
})

export const requireShortcutToken = createMiddleware<AppEnvironment>(async (c, next) => {
  const authorization = c.req.header('Authorization')
  const bearer = authorization?.match(/^Bearer\s+(.+)$/iu)?.[1]
  const token = bearer ?? c.req.header('X-TapLedger-Token')
  const service = new ShortcutTokenService(c.env.DB)
  if (!(await service.configured())) throw new HttpError(503, 'Shortcut token is not configured')
  if (!token || !(await service.verify(token))) throw new HttpError(401, 'Invalid token')
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const recent = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM import_events WHERE created_at >= ?').bind(oneMinuteAgo).first<{ total: number }>()
  if ((recent?.total ?? 0) >= 120) throw new HttpError(429, 'Rate limit exceeded')
  await next()
})
