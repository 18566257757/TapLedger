import { Hono } from 'hono'
import { requireCsrf, requireSession } from '../middleware/auth'
import { CatalogRepository, type CategoryRecord, type PaymentMethodRecord, presentCategory, presentMerchantRule, presentPaymentMethod } from '../repositories/catalogRepository'
import { categoryCreateSchema, categoryUpdateSchema, merchantRuleCreateSchema, merchantRuleUpdateSchema, paymentMethodCreateSchema, paymentMethodUpdateSchema } from '../schemas'
import { MerchantRuleService } from '../services/merchantRuleService'
import type { AppEnvironment } from '../types'
import { HttpError } from '../utils/http'
import { nowIso } from '../utils/time'
import { parseBody } from './helpers'

export const catalogRoutes = new Hono<AppEnvironment>()
catalogRoutes.use('/categories', requireSession)
catalogRoutes.use('/categories/*', requireSession)
catalogRoutes.use('/payment-methods', requireSession)
catalogRoutes.use('/payment-methods/*', requireSession)
catalogRoutes.use('/merchant-rules', requireSession)
catalogRoutes.use('/merchant-rules/*', requireSession)

catalogRoutes.get('/categories', async (c) => c.json(await new CatalogRepository(c.env.DB).categories()))

catalogRoutes.post('/categories', requireCsrf, async (c) => {
  const payload = await parseBody(c, categoryCreateSchema)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO categories (id, name, icon, sort_order, is_system, is_archived)
    VALUES (?, ?, ?, ?, 0, 0)
  `).bind(id, payload.name, payload.icon, payload.sort_order).run()
  const row = await c.env.DB.prepare('SELECT id, name, icon, sort_order, is_system, is_archived FROM categories WHERE id = ?').bind(id).first<CategoryRecord>()
  return c.json(presentCategory(row!), 201)
})

catalogRoutes.patch('/categories/:id', requireCsrf, async (c) => {
  const payload = await parseBody(c, categoryUpdateSchema)
  const id = c.req.param('id')
  const current = await c.env.DB.prepare('SELECT id, name, icon, sort_order, is_system, is_archived FROM categories WHERE id = ?').bind(id).first<CategoryRecord>()
  if (!current) throw new HttpError(404, 'Category not found')
  await c.env.DB.prepare(`
    UPDATE categories SET name = ?, icon = ?, sort_order = ?, is_archived = ?, updated_at = ? WHERE id = ?
  `).bind(
    payload.name ?? current.name,
    payload.icon ?? current.icon,
    payload.sort_order ?? current.sort_order,
    payload.is_archived === undefined ? current.is_archived : payload.is_archived ? 1 : 0,
    nowIso(),
    id,
  ).run()
  const row = await c.env.DB.prepare('SELECT id, name, icon, sort_order, is_system, is_archived FROM categories WHERE id = ?').bind(id).first<CategoryRecord>()
  return c.json(presentCategory(row!))
})

catalogRoutes.get('/payment-methods', async (c) => c.json(await new CatalogRepository(c.env.DB).paymentMethods()))

catalogRoutes.post('/payment-methods', requireCsrf, async (c) => {
  const payload = await parseBody(c, paymentMethodCreateSchema)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO payment_methods (
      id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(id, payload.display_name, payload.issuer ?? null, payload.last_four ?? null, payload.method_type, payload.shortcut_match_text ?? payload.display_name, payload.icon).run()
  const row = await c.env.DB.prepare(`
    SELECT id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
    FROM payment_methods WHERE id = ?
  `).bind(id).first<PaymentMethodRecord>()
  return c.json(presentPaymentMethod(row!), 201)
})

catalogRoutes.patch('/payment-methods/:id', requireCsrf, async (c) => {
  const payload = await parseBody(c, paymentMethodUpdateSchema)
  const id = c.req.param('id')
  const current = await c.env.DB.prepare(`
    SELECT id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
    FROM payment_methods WHERE id = ?
  `).bind(id).first<PaymentMethodRecord>()
  if (!current) throw new HttpError(404, 'Payment method not found')
  await c.env.DB.prepare(`
    UPDATE payment_methods SET display_name = ?, issuer = ?, last_four = ?, method_type = ?,
      shortcut_match_text = ?, icon = ?, is_archived = ?, updated_at = ? WHERE id = ?
  `).bind(
    payload.display_name ?? current.display_name,
    payload.issuer === undefined ? current.issuer : payload.issuer,
    payload.last_four === undefined ? current.last_four : payload.last_four,
    payload.method_type ?? current.method_type,
    payload.shortcut_match_text === undefined ? current.shortcut_match_text : payload.shortcut_match_text,
    payload.icon ?? current.icon,
    payload.is_archived === undefined ? current.is_archived : payload.is_archived ? 1 : 0,
    nowIso(),
    id,
  ).run()
  const row = await c.env.DB.prepare(`
    SELECT id, display_name, issuer, last_four, method_type, shortcut_match_text, icon, is_archived
    FROM payment_methods WHERE id = ?
  `).bind(id).first<PaymentMethodRecord>()
  return c.json(presentPaymentMethod(row!))
})

catalogRoutes.get('/merchant-rules', async (c) => {
  const rows = await new CatalogRepository(c.env.DB).merchantRules(true)
  return c.json(rows.map(presentMerchantRule))
})

catalogRoutes.post('/merchant-rules', requireCsrf, async (c) => {
  const payload = await parseBody(c, merchantRuleCreateSchema)
  return c.json(await new MerchantRuleService(c.env.DB).create(payload), 201)
})

catalogRoutes.patch('/merchant-rules/:id', requireCsrf, async (c) => {
  const payload = await parseBody(c, merchantRuleUpdateSchema)
  return c.json(await new MerchantRuleService(c.env.DB).update(c.req.param('id'), payload))
})
