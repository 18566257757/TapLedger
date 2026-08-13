import { Hono } from 'hono'
import type { AppEnvironment } from '../types'
import { AuthService } from '../services/authService'
import { SessionService } from '../services/sessionService'
import { changePasswordSchema, loginSchema, setupSchema } from '../schemas'
import { clearSessionCookie, requireCsrf, requireSession, setSessionCookie } from '../middleware/auth'
import { parseBody } from './helpers'

export const authRoutes = new Hono<AppEnvironment>()

authRoutes.get('/setup/status', async (c) => {
  return c.json({ setup_required: await new AuthService(c.env.DB).setupRequired() })
})

authRoutes.post('/setup/admin', async (c) => {
  const payload = await parseBody(c, setupSchema)
  const user = await new AuthService(c.env.DB).createAdmin(payload.username, payload.password, payload.base_currency, payload.timezone)
  const credentials = await new SessionService(c.env.DB).create(user)
  setSessionCookie(c, credentials.token)
  return c.json({ user, csrf_token: credentials.csrfToken }, 201)
})

authRoutes.post('/auth/login', async (c) => {
  const payload = await parseBody(c, loginSchema)
  const user = await new AuthService(c.env.DB).authenticate(payload.username, payload.password)
  const credentials = await new SessionService(c.env.DB).create(user)
  setSessionCookie(c, credentials.token)
  return c.json({ user, csrf_token: credentials.csrfToken })
})

authRoutes.get('/auth/me', requireSession, (c) => c.json(c.get('auth').user))

authRoutes.post('/auth/csrf', requireSession, async (c) => {
  const auth = c.get('auth')
  const csrfToken = await new SessionService(c.env.DB).rotateCsrf(auth.session.id)
  return c.json({ user: auth.user, csrf_token: csrfToken })
})

authRoutes.post('/auth/logout', requireSession, requireCsrf, async (c) => {
  await new SessionService(c.env.DB).revoke(c.get('auth').session.id)
  clearSessionCookie(c)
  return c.body(null, 204)
})

authRoutes.post('/auth/change-password', requireSession, requireCsrf, async (c) => {
  const payload = await parseBody(c, changePasswordSchema)
  const auth = c.get('auth')
  await new AuthService(c.env.DB).changePassword(auth.user.id, payload.current_password, payload.new_password)
  await c.env.DB.prepare(`
    UPDATE user_sessions SET revoked_at = ?
    WHERE user_id = ? AND id != ? AND revoked_at IS NULL
  `).bind(new Date().toISOString(), auth.user.id, auth.session.id).run()
  return c.body(null, 204)
})
