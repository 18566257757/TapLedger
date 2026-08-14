import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

const PASSWORD = 'correct horse battery staple'

interface ClientState {
  cookie: string
  csrf: string
}

async function request(path: string, init: RequestInit = {}, state?: ClientState): Promise<Response> {
  const headers = new Headers(init.headers)
  if (state?.cookie) headers.set('Cookie', state.cookie)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return SELF.fetch(`https://tapledger.test${path}`, { ...init, headers })
}

async function setup(): Promise<ClientState> {
  const response = await request('/api/v1/setup/admin', {
    method: 'POST',
    body: JSON.stringify({
      username: 'owner',
      password: PASSWORD,
      base_currency: 'HKD',
      timezone: 'Asia/Hong_Kong',
    }),
  })
  expect(response.status).toBe(201)
  const body = await response.json<{ csrf_token: string }>()
  return {
    cookie: response.headers.get('set-cookie')!.split(';', 1)[0],
    csrf: body.csrf_token,
  }
}

async function mutate(path: string, body: unknown, state: ClientState, method = 'POST'): Promise<Response> {
  return request(path, {
    method,
    headers: { 'X-CSRF-Token': state.csrf },
    body: JSON.stringify(body),
  }, state)
}

describe('TapLedger Worker API with D1', () => {
  it('supports authentication, catalogs, transactions, review, analytics, exports and backups', async () => {
    expect(await (await request('/api/v1/setup/status')).json()).toEqual({ setup_required: true })
    const state = await setup()
    expect((await request('/api/v1/auth/me', {}, state)).status).toBe(200)
    expect((await request('/api/v1/auth/logout', { method: 'POST' }, state)).status).toBe(403)

    const profileResponse = await mutate('/api/v1/auth/profile', { display_name: '小明' }, state, 'PATCH')
    expect(profileResponse.status, await profileResponse.clone().text()).toBe(200)
    expect(await profileResponse.json()).toMatchObject({ username: 'owner', display_name: '小明' })
    expect(await (await request('/api/v1/auth/me', {}, state)).json()).toMatchObject({ display_name: '小明' })

    const categoriesResponse = await request('/api/v1/categories', {}, state)
    expect(categoriesResponse.status, await categoriesResponse.clone().text()).toBe(200)
    const categories = await categoriesResponse.json<Array<{ id: string; name: string }>>()
    const coffee = categories.find((item) => item.name === 'Coffee')!
    expect(categories).toHaveLength(15)

    const paymentResponse = await mutate('/api/v1/payment-methods', {
      display_name: 'HSBC Visa',
      issuer: 'HSBC',
      last_four: '1234',
    }, state)
    expect(paymentResponse.status).toBe(201)
    expect(await paymentResponse.json()).toMatchObject({ shortcut_match_text: 'HSBC Visa' })

    const ruleResponse = await mutate('/api/v1/merchant-rules', {
      pattern: 'STARBUCKS',
      match_type: 'contains',
      category_id: coffee.id,
    }, state)
    expect(ruleResponse.status).toBe(201)

    const when = '2026-08-12T06:00:00.000Z'
    const expense = await mutate('/api/v1/transactions', {
      client_event_id: 'manual-expense-hkd',
      type: 'expense',
      amount: '100.00',
      currency: 'HKD',
      merchant: 'Shop',
      transaction_date: when,
    }, state)
    expect(expense.status).toBe(201)
    const expenseBody = await expense.json<{ transaction_id: string }>()
    expect((await mutate(`/api/v1/transactions/${expenseBody.transaction_id}`, { note: '第一行\n第二行' }, state, 'PATCH')).status).toBe(200)

    expect((await mutate('/api/v1/transactions', {
      client_event_id: 'manual-refund-hkd', type: 'refund', amount: '20.00', currency: 'HKD', merchant: 'Shop', transaction_date: '2026-08-12T06:10:00.000Z',
    }, state)).status).toBe(201)
    expect((await mutate('/api/v1/transactions', {
      client_event_id: 'manual-expense-cny', type: 'expense', amount: '30.00', currency: 'CNY', merchant: 'Store', transaction_date: when,
    }, state)).status).toBe(201)
    expect((await mutate('/api/v1/transactions', {
      client_event_id: 'manual-income-hkd', type: 'income', amount: '500.00', currency: 'HKD', merchant: 'Salary', transaction_date: when,
    }, state)).status).toBe(201)

    const summary = await request('/api/v1/analytics/summary?date_from=2026-08-11T00:00:00.000Z&date_to=2026-08-13T00:00:00.000Z', {}, state)
    expect(summary.status).toBe(200)
    const summaryBody = await summary.json<{ multiple_currencies: boolean; currencies: Array<{ currency: string; net_spending_minor: number; net_income_minor: number; total_minor: number }> }>()
    expect(summaryBody.multiple_currencies).toBe(true)
    expect(Object.fromEntries(summaryBody.currencies.map((item) => [item.currency, item.net_spending_minor]))).toEqual({ CNY: 3000, HKD: 8000 })
    expect(summaryBody.currencies.find((item) => item.currency === 'HKD')).toMatchObject({ net_spending_minor: 8000, net_income_minor: 50000, total_minor: 58000 })

    const trendResponse = await request('/api/v1/analytics/trend?date_from=2026-08-11T00:00:00.000Z&date_to=2026-08-13T00:00:00.000Z', {}, state)
    expect(trendResponse.status).toBe(200)
    const trendBody = await trendResponse.json<{ items: Array<{ currency: string; net_spending_minor: number; net_income_minor: number; total_minor: number }> }>()
    expect(trendBody.items.find((item) => item.currency === 'HKD')).toMatchObject({ net_spending_minor: 8000, net_income_minor: 50000, total_minor: 58000 })

    const categoryResponse = await request('/api/v1/analytics/categories?date_from=2026-08-11T00:00:00.000Z&date_to=2026-08-13T00:00:00.000Z', {}, state)
    expect(categoryResponse.status).toBe(200)
    const categoryBody = await categoryResponse.json<{ items: Array<{ currency: string; net_spending_minor: number; net_income_minor: number; total_minor: number }> }>()
    expect(categoryBody.items.find((item) => item.currency === 'HKD')).toMatchObject({ net_spending_minor: 8000, net_income_minor: 50000, total_minor: 58000 })

    const tokenResponse = await mutate('/api/v1/automation/token/rotate', undefined, state)
    const token = (await tokenResponse.json<{ token: string }>()).token
    const shortcutPayload = {
      schema_version: 1,
      client_event_id: 'shortcut-classified',
      amount: '42.80',
      currency: 'HKD',
      merchant: 'STARBUCKS HK 023',
      card: 'HSBC VISA',
      transaction_date: '2026-08-12T08:00:00.000Z',
      captured_at: '2026-08-12T08:00:00.000Z',
    }
    const shortcut = await request('/api/v1/shortcut/transactions', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(shortcutPayload),
    })
    expect(shortcut.status).toBe(200)
    expect(await shortcut.json()).toMatchObject({ category: 'Coffee', review_status: 'confirmed', duplicate: false })
    const repeated = await request('/api/v1/shortcut/transactions', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(shortcutPayload),
    })
    expect(await repeated.json()).toMatchObject({ result: 'already_processed', duplicate: true })

    const missing = await request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ client_event_id: 'shortcut-missing', amount: '10.00', captured_at: '2026-08-12T09:00:00.000Z' }),
    })
    expect(await missing.json()).toMatchObject({ result: 'created_needs_review', review_status: 'missing_information' })
    const review = await request('/api/v1/review', {}, state)
    const reviewItems = await review.json<Array<{ id: string }>>()
    expect(reviewItems.length).toBeGreaterThan(0)
    expect((await mutate(`/api/v1/review/${reviewItems[0].id}/confirm`, undefined, state)).status).toBe(200)

    const csv = await request('/api/v1/export/csv', {}, state)
    expect(csv.status).toBe(200)
    expect(new Uint8Array(await csv.arrayBuffer()).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]))
    expect((await request('/api/v1/export/json', {}, state)).status).toBe(200)

    const backup = await mutate('/api/v1/admin/backup', undefined, state)
    const backupBody = await backup.json<{ name: string; sha256: string }>()
    expect(backupBody.name.endsWith('.json')).toBe(true)
    expect(backupBody.sha256).toHaveLength(64)
    const backups = await request('/api/v1/admin/backups', {}, state)
    expect(await backups.json()).toMatchObject({ items: [{ name: backupBody.name }] })

    const health = await request('/api/v1/health')
    expect(health.status).toBe(200)
    expect(health.headers.get('x-content-type-options')).toBe('nosniff')
    expect(health.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  }, 30_000)

  it('enforces password confirmation before deleting financial data', async () => {
    const state = await setup()
    await mutate('/api/v1/transactions', {
      client_event_id: 'delete-me', type: 'expense', amount: '5.00', currency: 'HKD', merchant: 'Temporary', transaction_date: '2026-08-12T10:00:00.000Z',
    }, state)
    const rejected = await mutate('/api/v1/admin/delete-all-data', { password: PASSWORD, confirmation: 'DELETE' }, state)
    expect(rejected.status).toBe(400)
    const deleted = await mutate('/api/v1/admin/delete-all-data', { password: PASSWORD, confirmation: 'DELETE ALL DATA' }, state)
    expect(await deleted.json()).toMatchObject({ deleted_transactions: 1 })
    const list = await request('/api/v1/transactions', {}, state)
    expect(await list.json()).toMatchObject({ total: 0 })
  }, 30_000)

  it('keeps restore atomic and validates portable backups before replacing ledger data', async () => {
    const state = await setup()
    expect((await mutate('/api/v1/transactions', {
      client_event_id: 'restore-original', type: 'expense', amount: '8.75', currency: 'HKD', merchant: '原始商户', transaction_date: '2026-08-12T10:00:00.000Z', note: 'comma, quote " and\nnewline',
    }, state)).status).toBe(201)
    const createdBackup = await mutate('/api/v1/admin/backup', undefined, state)
    const { name } = await createdBackup.json<{ name: string }>()
    const downloaded = await request(`/api/v1/admin/backups/${encodeURIComponent(name)}`, {}, state)
    expect(downloaded.status).toBe(200)
    const document = await downloaded.json<Record<string, any>>()

    const preview = await mutate('/api/v1/admin/restore/validate', { password: PASSWORD, backup: document }, state)
    expect(preview.status).toBe(200)
    expect(await preview.json()).toMatchObject({ valid: true, counts: { ledger_transactions: 1 } })

    const invalid = structuredClone(document)
    invalid.tables.ledger_transactions[0].currency_code = 'INVALID'
    const rejected = await mutate('/api/v1/admin/restore', { password: PASSWORD, backup: invalid }, state)
    expect(rejected.status).toBe(422)
    expect(await (await request('/api/v1/transactions', {}, state)).json()).toMatchObject({ total: 1 })

    await mutate('/api/v1/transactions', {
      client_event_id: 'restore-extra', type: 'expense', amount: '1.00', currency: 'HKD', merchant: 'Extra', transaction_date: '2026-08-12T11:00:00.000Z',
    }, state)
    const restored = await mutate('/api/v1/admin/restore', { password: PASSWORD, backup: document }, state)
    expect(restored.status).toBe(200)
    expect(await restored.json()).toMatchObject({ restored_transactions: 1 })
    const list = await request('/api/v1/transactions', {}, state)
    const listBody = await list.json<{ total: number; items: Array<{ client_event_id: string }> }>()
    expect(listBody.total).toBe(1)
    expect(listBody.items[0].client_event_id).toBe('restore-original')
  }, 30_000)

  it('enforces token rotation and both duplicate-detection windows', async () => {
    const state = await setup()
    const payment = await mutate('/api/v1/payment-methods', {
      display_name: 'Wallet Card', method_type: 'credit_card', shortcut_match_text: 'WALLET CARD', icon: 'credit-card',
    }, state)
    expect(payment.status).toBe(201)
    const firstToken = (await (await mutate('/api/v1/automation/token/rotate', undefined, state)).json<{ token: string }>()).token
    const send = (clientEventId: string, when: string, token = firstToken) => request('/api/v1/shortcut/transactions', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({
        schema_version: 1, client_event_id: clientEventId, amount: '12.34', currency: 'HKD', merchant: 'Same Shop', card: 'WALLET CARD', transaction_date: when, captured_at: when,
      }),
    })
    expect((await send('invalid-token', '2026-08-12T00:00:00.000Z', 'invalid')).status).toBe(401)
    const first = await send('duplicate-base', '2026-08-12T00:00:00.000Z')
    const firstBody = await first.json<{ transaction_id: string }>()
    const automatic = await send('duplicate-20s', '2026-08-12T00:00:20.000Z')
    expect(await automatic.json()).toMatchObject({ transaction_id: firstBody.transaction_id, duplicate: true, result: 'already_processed' })
    const candidate = await send('duplicate-2m', '2026-08-12T00:02:00.000Z')
    expect(await candidate.json()).toMatchObject({ duplicate: false, review_status: 'duplicate_candidate' })
    const later = await send('duplicate-301s', '2026-08-12T00:05:01.000Z')
    expect(await later.json()).toMatchObject({ duplicate: false })

    const secondToken = (await (await mutate('/api/v1/automation/token/rotate', undefined, state)).json<{ token: string }>()).token
    expect((await send('revoked-token', '2026-08-12T01:00:00.000Z')).status).toBe(401)
    expect((await request('/api/v1/shortcut/test', { method: 'POST', headers: { Authorization: `Bearer ${secondToken}` } })).status).toBe(200)
  }, 30_000)

  it('accepts localized Chinese Shortcut keys, numeric amounts and generated event identities', async () => {
    const state = await setup()
    const token = (await (await mutate('/api/v1/automation/token/rotate', undefined, state)).json<{ token: string }>()).token
    const localizedPayload = {
      金额: 8,
      币种: '港币',
      商户: '7-Eleven, HK (0746)',
      交易名称: '钱包交易',
      卡片: 'BOC CHILL WORLD MASTERCARD',
      时间: '2026-08-13T06:39:00.000Z',
      位置: { 名称: '测试地点', 纬度: 22.3, 经度: 114.17 },
    }
    const sendLocalized = () => request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(localizedPayload),
    })

    const created = await sendLocalized()
    expect(created.status, await created.clone().text()).toBe(200)
    expect(await created.json()).toMatchObject({ success: true, duplicate: false, review_status: 'missing_information' })
    expect(await (await sendLocalized()).json()).toMatchObject({ success: true, duplicate: true, result: 'already_processed' })

    const realWalletFormat = await request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        事件ID: 'localized-real-wallet-format',
        金额: 'HK$9.00',
        商户: '便利店测试',
        交易名称: '便利店测试',
        卡片: '测试钱包卡片',
        时间: '2026/8/13 GMT+8 15:06:00',
        位置: '测试地区\n测试道路 74-76 号',
      }),
    })
    expect(realWalletFormat.status, await realWalletFormat.clone().text()).toBe(200)

    const nestedShortcutFormat = await request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currency: 'HKD',
        交易信息: {
          事件ID: 'localized-nested-wallet-format',
          金额: 'HK$10.25',
          币种: 'CNY',
          商户: '嵌套便利店测试',
          交易名称: '嵌套钱包交易',
          卡片: '嵌套测试钱包卡片',
          时间: '2026/8/13 GMT+8 15:20:00',
          位置: '嵌套测试地区\n嵌套测试道路',
        },
      }),
    })
    expect(nestedShortcutFormat.status, await nestedShortcutFormat.clone().text()).toBe(200)
    expect(await nestedShortcutFormat.json()).toMatchObject({ success: true, duplicate: false })

    const serializedJsonShortcutFormat = await request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        交易信息: JSON.stringify({
          事件ID: 'localized-serialized-json-format',
          金额: 'HK$11.50',
          商户: '字符串 JSON 便利店',
          时间: '2026/8/13 GMT+8 15:30:00',
        }),
      }),
    })
    expect(serializedJsonShortcutFormat.status, await serializedJsonShortcutFormat.clone().text()).toBe(200)

    const serializedTextShortcutFormat = await request('/api/v1/shortcut/transactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        交易信息: '{\n事件ID = "localized-serialized-text-format";\n金额 = "HK$12.75";\n商户 = "字符串文本便利店";\n时间 = "2026/8/13 GMT+8 15:40:00";\n位置 = "测试区\n测试路";\n}',
      }),
    })
    expect(serializedTextShortcutFormat.status, await serializedTextShortcutFormat.clone().text()).toBe(200)

    const list = await request('/api/v1/transactions', {}, state)
    const body = await list.json<{ total: number; items: Array<Record<string, unknown>> }>()
    expect(body.total).toBe(5)
    const generated = body.items.find((item) => String(item.client_event_id).startsWith('shortcut-generated-'))
    expect(generated).toMatchObject({
      amount: '8.00',
      currency: 'HKD',
      merchant_raw: '7-Eleven, HK (0746)',
      card_raw_name: 'BOC CHILL WORLD MASTERCARD',
      purpose: '钱包交易',
      location_name: '测试地点',
      latitude: '22.3',
      longitude: '114.17',
      source: 'wallet_shortcut',
    })
    expect(String(generated?.client_event_id)).toMatch(/^shortcut-generated-[0-9a-f]{40}$/u)
    expect(body.items.find((item) => item.client_event_id === 'localized-real-wallet-format')).toMatchObject({
      amount: '9.00',
      currency: 'HKD',
      transaction_date: '2026-08-13T07:06:00.000Z',
      location_name: '测试地区\n测试道路 74-76 号',
    })
    expect(body.items.find((item) => item.client_event_id === 'localized-nested-wallet-format')).toMatchObject({
      amount: '10.25',
      currency: 'HKD',
      merchant_raw: '嵌套便利店测试',
      card_raw_name: '嵌套测试钱包卡片',
      purpose: '嵌套钱包交易',
      transaction_date: '2026-08-13T07:20:00.000Z',
      location_name: '嵌套测试地区\n嵌套测试道路',
    })
    expect(body.items.find((item) => item.client_event_id === 'localized-serialized-json-format')).toMatchObject({
      amount: '11.50',
      merchant_raw: '字符串 JSON 便利店',
      transaction_date: '2026-08-13T07:30:00.000Z',
    })
    expect(body.items.find((item) => item.client_event_id === 'localized-serialized-text-format')).toMatchObject({
      amount: '12.75',
      merchant_raw: '字符串文本便利店',
      transaction_date: '2026-08-13T07:40:00.000Z',
      location_name: '测试区\n测试路',
    })

    const paymentBreakdown = await request('/api/v1/analytics/payment-methods?date_from=2026-08-13T00:00:00.000Z&date_to=2026-08-14T00:00:00.000Z', {}, state)
    expect(paymentBreakdown.status, await paymentBreakdown.clone().text()).toBe(200)
    const paymentItems = await paymentBreakdown.json<{ items: Array<{ label: string; amount_minor: number }> }>()
    expect(paymentItems.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'BOC CHILL WORLD MASTERCARD', amount_minor: 800 }),
      expect.objectContaining({ label: '测试钱包卡片', amount_minor: 900 }),
      expect.objectContaining({ label: '嵌套测试钱包卡片', amount_minor: 1025 }),
    ]))
  }, 30_000)

  it('revokes other sessions after a password change and rejects expired sessions', async () => {
    const first = await setup()
    const secondLogin = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner', password: PASSWORD }) })
    const secondBody = await secondLogin.json<{ csrf_token: string }>()
    const second = { cookie: secondLogin.headers.get('set-cookie')!.split(';', 1)[0], csrf: secondBody.csrf_token }
    const newPassword = 'a newly rotated strong password'
    expect((await mutate('/api/v1/auth/change-password', { current_password: PASSWORD, new_password: newPassword }, first)).status).toBe(204)
    expect((await request('/api/v1/auth/me', {}, first)).status).toBe(200)
    expect((await request('/api/v1/auth/me', {}, second)).status).toBe(401)
    expect((await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner', password: PASSWORD }) })).status).toBe(401)
    expect((await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner', password: newPassword }) })).status).toBe(200)

    await env.DB.prepare("UPDATE user_sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run()
    expect((await request('/api/v1/auth/me', {}, first)).status).toBe(401)
  }, 30_000)
})
