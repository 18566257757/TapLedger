import { Hono } from 'hono'
import { requireCsrf, requireSession } from '../middleware/auth'
import { TransactionRepository } from '../repositories/transactionRepository'
import { merchantRuleCreateSchema } from '../schemas'
import { MerchantRuleService } from '../services/merchantRuleService'
import { TransactionService } from '../services/transactionService'
import type { AppEnvironment } from '../types'
import { HttpError } from '../utils/http'
import { nowIso } from '../utils/time'
import { parseBody } from './helpers'

export const reviewRoutes = new Hono<AppEnvironment>()
reviewRoutes.use('/review', requireSession)
reviewRoutes.use('/review/*', requireSession)

reviewRoutes.get('/review', async (c) => c.json(await new TransactionRepository(c.env.DB).listReview()))

reviewRoutes.post('/review/:id/confirm', requireCsrf, async (c) => {
  const transaction = await new TransactionRepository(c.env.DB).setReviewStatus(c.req.param('id'), 'confirmed', nowIso())
  if (!transaction) throw new HttpError(404, 'Transaction not found')
  return c.json(transaction)
})

reviewRoutes.post('/review/:id/mark-not-duplicate', requireCsrf, async (c) => {
  const transaction = await new TransactionRepository(c.env.DB).setReviewStatus(c.req.param('id'), 'confirmed', nowIso())
  if (!transaction) throw new HttpError(404, 'Transaction not found')
  return c.json(transaction)
})

reviewRoutes.post('/review/:id/create-rule', requireCsrf, async (c) => {
  const id = c.req.param('id')
  const transaction = await new TransactionService(c.env.DB).get(id)
  const payload = await parseBody(c, merchantRuleCreateSchema)
  await new MerchantRuleService(c.env.DB).create({
    ...payload,
    pattern: payload.pattern || transaction.merchant_normalized,
    category_id: payload.category_id ?? transaction.category_id,
    payment_method_id: payload.payment_method_id ?? transaction.payment_method_id,
  })
  const updated = await new TransactionRepository(c.env.DB).setReviewStatus(id, 'confirmed', nowIso())
  return c.json(updated!)
})

reviewRoutes.post('/review/:id/delete-duplicate', requireCsrf, async (c) => {
  await new TransactionService(c.env.DB).delete(c.req.param('id'))
  return c.body(null, 204)
})
