import { Hono } from 'hono'
import { requireSession } from '../middleware/auth'
import { ExportService } from '../services/exportService'
import type { AppEnvironment } from '../types'

function attachment(name: string): Record<string, string> {
  return { 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' }
}

export const exportRoutes = new Hono<AppEnvironment>()
exportRoutes.use('/export/*', requireSession)

exportRoutes.get('/export/csv', async (c) => c.body(await new ExportService(c.env.DB).csv(), 200, {
  ...attachment('tapledger-transactions.csv'),
  'Content-Type': 'text/csv; charset=utf-8',
}))

exportRoutes.get('/export/json', async (c) => c.body(await new ExportService(c.env.DB).json(), 200, {
  ...attachment('tapledger-transactions.json'),
  'Content-Type': 'application/json; charset=utf-8',
}))

exportRoutes.get('/export/backup', async (c) => c.body(JSON.stringify(await new ExportService(c.env.DB).backupDocument(), null, 2), 200, {
  ...attachment('tapledger-backup.json'),
  'Content-Type': 'application/json; charset=utf-8',
}))
