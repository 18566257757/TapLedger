import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { adminRoutes } from './routes/admin'
import { analyticsRoutes } from './routes/analytics'
import { authRoutes } from './routes/auth'
import { catalogRoutes } from './routes/catalog'
import { exportRoutes } from './routes/export'
import { reviewRoutes } from './routes/review'
import { shortcutRoutes } from './routes/shortcut'
import { transactionRoutes } from './routes/transactions'
import type { AppEnvironment } from './types'
import { HttpError } from './utils/http'
import { MoneyError } from './utils/money'

const app = new Hono<AppEnvironment>()

app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  c.header('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'")
  if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'no-store')
})

app.use('/api/*', bodyLimit({
  maxSize: 1_048_576,
  onError: (c) => c.json({ detail: 'Request body is too large' }, 413),
}))

app.get('/api/v1/health', async (c) => {
  await c.env.DB.prepare('SELECT 1').first()
  return c.json({ status: 'ok', version: '0.2.0' })
})

app.route('/api/v1', authRoutes)
app.route('/api/v1', shortcutRoutes)
app.route('/api/v1', transactionRoutes)
app.route('/api/v1', catalogRoutes)
app.route('/api/v1', reviewRoutes)
app.route('/api/v1', analyticsRoutes)
app.route('/api/v1', exportRoutes)
app.route('/api/v1', adminRoutes)

app.notFound((c) => c.req.path.startsWith('/api/')
  ? c.json({ detail: 'Not found' }, 404)
  : c.text('Not found', 404))

app.onError((error, c) => {
  if (error instanceof HttpError) return c.json({ detail: error.message }, error.status)
  if (error instanceof MoneyError) return c.json({ detail: error.message }, 422)
  const message = error instanceof Error ? error.message : ''
  if (/UNIQUE constraint failed/iu.test(message)) return c.json({ detail: 'A record with this value already exists' }, 409)
  if (/FOREIGN KEY constraint failed/iu.test(message)) return c.json({ detail: 'A referenced record does not exist' }, 422)
  console.error('Unhandled Worker error', JSON.stringify({
    name: error instanceof Error ? error.name : 'UnknownError',
    message: message.slice(0, 500),
  }))
  return c.json({ detail: 'Internal server error' }, 500)
})

export default app
