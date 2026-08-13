import { expect, test, type Page } from '@playwright/test'

const USERNAME = 'admin'
const PASSWORD = 'TapLedger-E2E-Password!'

async function authenticate(page: Page) {
  await page.goto('/login')
  const setup = page.getByRole('heading', { name: 'Set up your private ledger' })
  const login = page.getByRole('heading', { name: 'Welcome back' })
  await expect(setup.or(login)).toBeVisible()
  await page.getByLabel('Username').fill(USERNAME)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: await setup.isVisible() ? 'Create administrator' : 'Sign in' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)|TapLedger/ }).first()).toBeVisible()
}

async function openSettingCard(page: Page, title: string) {
  const card = page.locator('details.setting-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
  if (!(await card.getAttribute('open'))) await card.locator(':scope > summary').click()
  return card
}

test('real Worker/D1 core flow: CRUD, review, analytics, automation, exports and logout', async ({ page, isMobile }) => {
  test.setTimeout(90_000)
  test.skip(isMobile, 'The complete mutation flow runs once in desktop Chromium; mobile layout has a focused test.')
  await authenticate(page)
  const reviewMerchant = `BROWSER REVIEW ${Math.random().toString(36).slice(2, 10).toUpperCase()}`

  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  let editor = page.getByRole('dialog')
  await editor.getByRole('textbox', { name: /Amount/ }).fill('77.35')
  await editor.getByLabel('Merchant').fill('Browser Core Merchant')
  await editor.getByLabel('Category').selectOption({ label: 'Coffee' })
  await editor.getByLabel('Note').fill('Created by the Cloudflare Playwright flow')
  await page.getByRole('button', { name: 'Save transaction' }).click()

  const search = page.getByPlaceholder(/Search merchant/)
  await search.fill('Browser Core Merchant')
  const row = page.getByRole('button', { name: /BROWSER CORE MERCHANT/ }).first()
  await expect(row).toBeVisible()
  await row.click()
  await expect(page.getByRole('heading', { name: 'Edit transaction' })).toBeVisible()
  editor = page.getByRole('dialog')
  await editor.getByRole('textbox', { name: /Amount/ }).fill('78.40')
  await editor.getByLabel('Note').fill('Updated by the Cloudflare Playwright flow')
  await page.getByRole('button', { name: 'Save transaction' }).click()
  await expect(page.getByText('HK$78.40').first()).toBeVisible()

  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  editor = page.getByRole('dialog')
  await editor.getByRole('textbox', { name: /Amount/ }).fill('3.21')
  await editor.getByLabel('Merchant').fill(reviewMerchant)
  await page.getByRole('button', { name: 'Save transaction' }).click()

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await openSettingCard(page, 'Automation')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Rotate Shortcut token' }).click()
  await expect(page.getByText('Copy this token now', { exact: true })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Send simulated import' }).click()
  await expect(page.getByText(/Simulated import accepted:/)).toBeVisible()

  await openSettingCard(page, 'Data & backups')
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Export CSV' }).click()
  expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/u)
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Export JSON' }).click()
  expect((await jsonDownload).suggestedFilename()).toMatch(/\.json$/u)

  await openSettingCard(page, 'Preferences')
  await page.getByLabel('Language').selectOption('zh-CN')
  await expect(page.getByText('供 iPhone 快捷指令使用的私人接口。')).toBeVisible()
  await openSettingCard(page, '类别')
  await expect(page.getByText('餐饮', { exact: true }).first()).toBeVisible()
  await page.getByRole('textbox', { name: /昵称/ }).fill('中文昵称')
  await page.getByRole('button', { name: '保存昵称' }).click()
  await expect(page.getByText('昵称已更新。', { exact: true })).toBeVisible()
  await page.goto('/')
  await expect(page.locator('.home-heading h1')).toContainText('中文昵称')
  await page.goto('/settings')
  await openSettingCard(page, '偏好设置')
  await page.getByLabel('语言').selectOption('en')
  await openSettingCard(page, 'Automation')
  await expect(page.getByText('Private endpoint for your iPhone Shortcut.')).toBeVisible()

  await page.goto('/review')
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible()
  const reviewItem = page.getByRole('heading', { name: reviewMerchant }).first()
  await expect(reviewItem).toBeVisible()
  await reviewItem.locator('xpath=ancestor::article').getByRole('button', { name: 'Confirm' }).click()
  await expect(reviewItem).toBeHidden()

  await page.goto('/insights')
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await expect(page.getByText('By category')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()

  await page.goto('/transactions')
  await search.fill('Browser Core Merchant')
  const matchingRows = page.getByRole('button', { name: /BROWSER CORE MERCHANT/ })
  await expect(matchingRows.first()).toBeVisible()
  const countBeforeDelete = await matchingRows.count()
  await matchingRows.first().click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(matchingRows).toHaveCount(countBeforeDelete - 1)

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('mobile Cloudflare UI preserves navigation, editor interaction and width', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only responsive verification.')
  await authenticate(page)
  await page.evaluate(() => localStorage.setItem('tapledger-theme', 'dark'))
  await page.reload()
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  expect(await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))).toEqual({ client: 402, scroll: 402 })
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'More information' }).click()
  await expect(page.getByLabel('Location')).toBeVisible()
  const editorWidth = await page.getByRole('dialog').evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }))
  expect(editorWidth.scroll).toBeLessThanOrEqual(editorWidth.client)
  await page.getByRole('button', { name: 'Close editor' }).click()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()

  await page.goto('/insights')
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  const dateFields = await page.locator('.date-range label').evaluateAll((labels) => labels.map((label) => {
    const rect = label.getBoundingClientRect()
    return { top: rect.top, left: rect.left, right: rect.right }
  }))
  expect(dateFields).toHaveLength(3)
  expect(dateFields[0].top).toBeLessThan(dateFields[1].top)
  expect(dateFields[1].top).toBeLessThan(dateFields[2].top)
  for (const field of dateFields) {
    expect(field.left).toBeGreaterThanOrEqual(0)
    expect(field.right).toBeLessThanOrEqual(402)
  }
  const dateInputs = await page.locator('.date-range input, .date-range select').evaluateAll((inputs) => inputs.map((input) => {
    const rect = input.getBoundingClientRect()
    const style = getComputedStyle(input)
    return { left: rect.left, right: rect.right, width: rect.width, appearance: style.appearance, webkitAppearance: style.webkitAppearance, type: input.getAttribute('type') }
  }))
  expect(dateInputs).toHaveLength(3)
  for (const input of dateInputs) {
    expect(input.left).toBeGreaterThanOrEqual(0)
    expect(input.right).toBeLessThanOrEqual(402)
    expect(input.width).toBeGreaterThan(0)
  }
  expect(dateInputs[1].width).toBe(dateInputs[0].width)
  expect(dateInputs[2].width).toBe(dateInputs[0].width)
  expect(dateInputs[1].appearance).toBe('none')
  expect(dateInputs[2].appearance).toBe('none')
  expect(dateInputs[1].webkitAppearance).toBe('none')
  expect(dateInputs[2].webkitAppearance).toBe('none')
  expect(dateInputs[1].type).toBe('date')
  expect(dateInputs[2].type).toBe('date')
  const metricCard = await page.locator('.metric-card').first().evaluate((card) => {
    const rect = card.getBoundingClientRect()
    return { left: rect.left, right: rect.right }
  })
  expect(Math.round(dateInputs[1].left)).toBe(Math.round(metricCard.left))
  expect(Math.round(dateInputs[1].right)).toBe(Math.round(metricCard.right))
  expect(Math.round(dateInputs[2].left)).toBe(Math.round(metricCard.left))
  expect(Math.round(dateInputs[2].right)).toBe(Math.round(metricCard.right))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(402)
  const pageBackgrounds = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    root: getComputedStyle(document.documentElement).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
  }))
  expect(pageBackgrounds.theme).toBe('dark')
  expect(pageBackgrounds.root).toBe(pageBackgrounds.body)

  await page.goto('/settings')
  await expect(page.locator('details.setting-card[open]')).toHaveCount(0)
  const automationCard = await openSettingCard(page, 'Automation')
  await expect(automationCard.getByRole('button', { name: 'Rotate Shortcut token' })).toBeVisible()
  await automationCard.locator(':scope > summary').click()
  await expect(automationCard.getByRole('button', { name: 'Rotate Shortcut token' })).toBeHidden()
})
