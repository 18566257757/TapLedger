import { Hono } from 'hono'
import { requireCsrf, requireSession } from '../middleware/auth'
import { deleteAllDataSchema, restoreSchema, simulationSchema } from '../schemas'
import { AuthService } from '../services/authService'
import { ExportService } from '../services/exportService'
import { RestoreService } from '../services/restoreService'
import { ShortcutTokenService } from '../services/shortcutTokenService'
import { TransactionService } from '../services/transactionService'
import type { AppEnvironment } from '../types'
import { HttpError, readJson } from '../utils/http'
import { parseBody } from './helpers'

const PROCESS_STARTED_AT = Date.now()

export const adminRoutes = new Hono<AppEnvironment>()
adminRoutes.use('/admin/*', requireSession)
adminRoutes.use('/automation/*', requireSession)
adminRoutes.use('/status', requireSession)

adminRoutes.get('/status', async (c) => {
  const [latestImport, pending, latestBackup, approximateSize] = await Promise.all([
    c.env.DB.prepare('SELECT created_at, result FROM import_events ORDER BY created_at DESC LIMIT 1').first<{ created_at: string; result: string }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS total FROM ledger_transactions WHERE review_status != 'confirmed'").first<{ total: number }>(),
    c.env.DB.prepare('SELECT name FROM backup_snapshots ORDER BY created_at DESC LIMIT 1').first<{ name: string }>(),
    c.env.DB.prepare(`
      SELECT COALESCE(SUM(
        length(id) + length(client_event_id) + length(merchant_raw) + length(merchant_normalized) +
        length(COALESCE(note, '')) + length(COALESCE(purpose, '')) + 96
      ), 0) AS bytes FROM ledger_transactions
    `).first<{ bytes: number }>(),
  ])
  return c.json({
    service_health: 'ok',
    database_health: 'ok',
    database_binding: 'Cloudflare D1 · DB',
    database_size: approximateSize?.bytes ?? 0,
    deployment_url: new URL(c.req.url).origin,
    last_import: latestImport?.created_at ?? null,
    recent_import_result: latestImport?.result ?? null,
    pending_reviews: pending?.total ?? 0,
    last_backup: latestBackup?.name ?? null,
    version: '0.2.0',
    uptime_seconds: Math.max(0, Math.floor((Date.now() - PROCESS_STARTED_AT) / 1000)),
  })
})

adminRoutes.get('/automation/import-events', async (c) => {
  const requested = Number(c.req.query('limit') ?? 10)
  const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 50) : 10
  const rows = await c.env.DB.prepare(`
    SELECT id, client_event_id, created_at AS received_at, result, merchant_summary,
           amount_summary, source
    FROM import_events ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all()
  return c.json({ items: rows.results })
})

adminRoutes.post('/automation/token/rotate', requireCsrf, async (c) => {
  return c.json({
    token: await new ShortcutTokenService(c.env.DB).rotate(),
    warning: 'Copy this token now. It will not be shown again.',
  })
})

adminRoutes.post('/automation/simulate', requireCsrf, async (c) => {
  const payload = await parseBody(c, simulationSchema)
  const now = new Date().toISOString()
  const result = await new TransactionService(c.env.DB).ingestShortcut({
    client_event_id: `sim-${crypto.randomUUID()}`,
    amount: payload.amount,
    currency: payload.currency,
    merchant: payload.merchant,
    transaction_date: now,
    captured_at: now,
    source: 'simulator',
  }, 'simulator', 'web-simulator')
  return c.json({
    success: true,
    result: result.result,
    transaction_id: result.transaction.id,
    category: result.transaction.category_name,
    review_status: result.transaction.review_status,
    duplicate: result.duplicate,
  })
})

adminRoutes.post('/admin/backup', requireCsrf, async (c) => c.json(await new ExportService(c.env.DB).createBackup()))
adminRoutes.get('/admin/backups', async (c) => c.json(await new ExportService(c.env.DB).backups()))

adminRoutes.get('/admin/backups/:name', async (c) => {
  const row = await c.env.DB.prepare('SELECT name, payload_json FROM backup_snapshots WHERE name = ?').bind(c.req.param('name')).first<{ name: string; payload_json: string }>()
  if (!row) throw new HttpError(404, 'Backup not found')
  return c.body(row.payload_json, 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${row.name}"`,
    'Cache-Control': 'no-store',
  })
})

adminRoutes.post('/admin/restore/validate', requireCsrf, async (c) => {
  const body = await readJson(c)
  if (typeof body !== 'object' || body === null || !('password' in body)) throw new HttpError(422, 'Administrator password is required')
  const password = String(body.password)
  await new AuthService(c.env.DB).authenticate(c.get('auth').user.username, password)
  const restore = new RestoreService(c.env.DB)
  if ('backup' in body) {
    const document = restore.validate(body.backup)
    return c.json({ valid: true, counts: restore.counts(document) })
  }
  if (!('name' in body)) throw new HttpError(422, 'Backup document or stored backup name is required')
  const name = String(body.name)
  const row = await c.env.DB.prepare('SELECT payload_json, sha256, size_bytes FROM backup_snapshots WHERE name = ?').bind(name).first<{ payload_json: string; sha256: string; size_bytes: number }>()
  if (!row) throw new HttpError(404, 'Backup not found')
  const document = restore.validate(JSON.parse(row.payload_json))
  return c.json({ valid: true, name, sha256: row.sha256, size_bytes: row.size_bytes, counts: restore.counts(document) })
})

adminRoutes.post('/admin/restore', requireCsrf, async (c) => {
  const payload = await parseBody(c, restoreSchema)
  await new AuthService(c.env.DB).authenticate(c.get('auth').user.username, payload.password)
  await new ExportService(c.env.DB).createBackup()
  return c.json(await new RestoreService(c.env.DB).restore(payload.backup))
})

adminRoutes.post('/admin/delete-all-data', requireCsrf, async (c) => {
  const payload = await parseBody(c, deleteAllDataSchema)
  if (payload.confirmation !== 'DELETE ALL DATA') throw new HttpError(400, 'Confirmation text does not match')
  await new AuthService(c.env.DB).authenticate(c.get('auth').user.username, payload.password)
  const backup = await new ExportService(c.env.DB).createBackup()
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM ledger_transactions').first<{ total: number }>()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM import_events'),
    c.env.DB.prepare('DELETE FROM merchant_rules'),
    c.env.DB.prepare('DELETE FROM ledger_transactions'),
    c.env.DB.prepare('DELETE FROM payment_methods'),
    c.env.DB.prepare('DELETE FROM categories WHERE is_system = 0'),
  ])
  return c.json({ deleted_transactions: count?.total ?? 0, backup_name: backup.name })
})
