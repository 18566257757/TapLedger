import { Hono } from 'hono'
import { requireCsrf, requireSession } from '../middleware/auth'
import { TransactionRepository } from '../repositories/transactionRepository'
import { manualTransactionSchema, transactionUpdateSchema } from '../schemas'
import { TransactionService } from '../services/transactionService'
import type { AppEnvironment } from '../types'
import { HttpError } from '../utils/http'
import { normalizeDateTime } from '../utils/time'
import { numberQuery, parseBody } from './helpers'

const SORT_VALUES = new Set(['newest', 'oldest', 'amount_high', 'amount_low'])

export const transactionRoutes = new Hono<AppEnvironment>()
transactionRoutes.use('/transactions', requireSession)
transactionRoutes.use('/transactions/*', requireSession)

transactionRoutes.get('/transactions', async (c) => {
  const query = c.req.query()
  const page = numberQuery(query.page, 1, 1, 1_000_000)
  const pageSize = numberQuery(query.page_size, 50, 1, 200)
  const sort = query.sort ?? 'newest'
  if (!SORT_VALUES.has(sort)) throw new HttpError(422, 'Invalid transaction sort')
  const minimumMinor = query.min_amount_minor === undefined ? undefined : numberQuery(query.min_amount_minor, 0, 0, Number.MAX_SAFE_INTEGER)
  const maximumMinor = query.max_amount_minor === undefined ? undefined : numberQuery(query.max_amount_minor, 0, 0, Number.MAX_SAFE_INTEGER)
  const result = await new TransactionRepository(c.env.DB).list({
    page,
    pageSize,
    search: query.search?.trim() || undefined,
    dateFrom: query.date_from ? normalizeDateTime(query.date_from) : undefined,
    dateTo: query.date_to ? normalizeDateTime(query.date_to) : undefined,
    type: query.type,
    categoryId: query.category_id,
    paymentMethodId: query.payment_method_id,
    source: query.source,
    reviewStatus: query.review_status,
    currency: query.currency?.toUpperCase(),
    minimumMinor,
    maximumMinor,
    sort: sort as 'newest' | 'oldest' | 'amount_high' | 'amount_low',
  })
  return c.json({ ...result, page, page_size: pageSize })
})

transactionRoutes.post('/transactions', requireCsrf, async (c) => {
  const payload = await parseBody(c, manualTransactionSchema)
  const result = await new TransactionService(c.env.DB).ingestManual(payload)
  return c.json({
    success: true,
    result: result.result,
    transaction_id: result.transaction.id,
    category: result.transaction.category_name,
    review_status: result.transaction.review_status,
    duplicate: result.duplicate,
  }, 201)
})

transactionRoutes.get('/transactions/:id', async (c) => c.json(await new TransactionService(c.env.DB).get(c.req.param('id'))))

transactionRoutes.patch('/transactions/:id', requireCsrf, async (c) => {
  const payload = await parseBody(c, transactionUpdateSchema)
  return c.json(await new TransactionService(c.env.DB).update(c.req.param('id'), payload))
})

transactionRoutes.delete('/transactions/:id', requireCsrf, async (c) => {
  await new TransactionService(c.env.DB).delete(c.req.param('id'))
  return c.body(null, 204)
})
