import { Hono } from 'hono'
import { requireSession } from '../middleware/auth'
import { AnalyticsService } from '../services/analyticsService'
import type { AppEnvironment } from '../types'
import { HttpError } from '../utils/http'

function range(query: Record<string, string>): [string, string] {
  if (!query.date_from || !query.date_to) throw new HttpError(422, 'date_from and date_to are required')
  return [query.date_from, query.date_to]
}

export const analyticsRoutes = new Hono<AppEnvironment>()
analyticsRoutes.use('/analytics/*', requireSession)

analyticsRoutes.get('/analytics/summary', async (c) => {
  const [from, to] = range(c.req.query())
  return c.json(await new AnalyticsService(c.env.DB).summary(from, to))
})

analyticsRoutes.get('/analytics/trend', async (c) => {
  const [from, to] = range(c.req.query())
  return c.json(await new AnalyticsService(c.env.DB).trend(from, to))
})

analyticsRoutes.get('/analytics/categories', async (c) => {
  const [from, to] = range(c.req.query())
  return c.json(await new AnalyticsService(c.env.DB).breakdown('category', from, to))
})

analyticsRoutes.get('/analytics/merchants', async (c) => {
  const [from, to] = range(c.req.query())
  return c.json(await new AnalyticsService(c.env.DB).breakdown('merchant', from, to))
})

analyticsRoutes.get('/analytics/payment-methods', async (c) => {
  const [from, to] = range(c.req.query())
  return c.json(await new AnalyticsService(c.env.DB).breakdown('payment_method', from, to))
})
