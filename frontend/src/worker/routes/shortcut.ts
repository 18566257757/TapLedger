import { Hono } from 'hono'
import { describeShortcutPayloadShape } from '../adapters/shortcutPayload'
import { requireShortcutToken } from '../middleware/auth'
import { shortcutBatchSchema, shortcutTransactionSchema } from '../schemas'
import { TransactionService } from '../services/transactionService'
import type { AppEnvironment, IngestionResult } from '../types'
import { parseBody } from './helpers'

function response(result: IngestionResult) {
  return {
    success: true,
    result: result.result,
    transaction_id: result.transaction.id,
    category: result.transaction.category_name,
    review_status: result.transaction.review_status,
    duplicate: result.duplicate,
  }
}

function logValidationShape(body: unknown) {
  console.warn('Shortcut payload validation rejected', JSON.stringify(describeShortcutPayloadShape(body)))
}

export const shortcutRoutes = new Hono<AppEnvironment>()
shortcutRoutes.use('/shortcut/*', requireShortcutToken)

shortcutRoutes.post('/shortcut/test', (c) => c.json({ success: true }))

shortcutRoutes.post('/shortcut/transactions', async (c) => {
  const payload = await parseBody(c, shortcutTransactionSchema, logValidationShape)
  return c.json(response(await new TransactionService(c.env.DB).ingestShortcut(payload)))
})

shortcutRoutes.post('/shortcut/transactions/batch', async (c) => {
  const payload = await parseBody(c, shortcutBatchSchema)
  const results = []
  for (const item of payload.transactions) results.push(response(await new TransactionService(c.env.DB).ingestShortcut(item)))
  return c.json({
    results,
    created: results.filter((item) => item.result.startsWith('created')).length,
    duplicates: results.filter((item) => item.duplicate).length,
    failed: 0,
  })
})

shortcutRoutes.post('/shortcut/simulate', async (c) => {
  const payload = await parseBody(c, shortcutTransactionSchema, logValidationShape)
  return c.json(response(await new TransactionService(c.env.DB).ingestShortcut(payload, 'simulator', 'shortcut-simulator')))
})
