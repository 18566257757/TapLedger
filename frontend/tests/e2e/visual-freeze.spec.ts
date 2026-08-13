import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const visualDirectory = path.resolve(
  projectRoot,
  'tests',
  process.env.TAPLEDGER_VISUAL_DIR ?? 'visual-baseline',
)
const pathFromProject = path.relative(projectRoot, visualDirectory)
if (!pathFromProject || pathFromProject === '..' || pathFromProject.startsWith(`..${path.sep}`) || path.isAbsolute(pathFromProject)) {
  throw new Error(`Visual evidence directory must remain inside PROJECT_ROOT: ${visualDirectory}`)
}

test.skip(
  !process.env.TAPLEDGER_VISUAL_DIR,
  'Set TAPLEDGER_VISUAL_DIR explicitly so an ordinary E2E run cannot overwrite UI freeze evidence.',
)

async function stabilize(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(450)
}

async function capture(page: Page, name: string, fullPage = false) {
  await stabilize(page)
  await page.screenshot({
    path: path.join(visualDirectory, `${name}.png`),
    fullPage,
    animations: 'disabled',
  })
}

async function login(page: Page) {
  await page.goto('/login')
  const setupHeading = page.getByRole('heading', { name: 'Set up your private ledger' })
  const loginHeading = page.getByRole('heading', { name: 'Welcome back' })
  await expect(setupHeading.or(loginHeading)).toBeVisible()
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password', { exact: true }).fill('TapLedger-E2E-Password!')
  if (await setupHeading.isVisible()) {
    await page.getByRole('button', { name: 'Create administrator' }).click()
  } else {
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)|TapLedger/ }).first()).toBeVisible()
}

async function seedCloudflareVisualState(page: Page) {
  if (process.env.TAPLEDGER_VISUAL_DIR !== 'visual-after-cloudflare' && process.env.TAPLEDGER_SEED_VISUAL_BACKUPS !== '1') return
  const loaded = page.waitForResponse((response) => response.url().endsWith('/api/v1/admin/backups') && response.ok())
  await page.goto('/settings')
  await loaded
  const backupCard = page.locator('.setting-card').filter({ hasText: 'Data & backups' })
  const backupRows = backupCard.locator('.simple-list > div')
  while (await backupRows.count() < 3) {
    const before = await backupRows.count()
    await backupCard.getByRole('button', { name: 'Back up now' }).click()
    await expect(backupRows).toHaveCount(before + 1)
    await page.waitForTimeout(20)
  }
}

test.beforeAll(async () => {
  await mkdir(visualDirectory, { recursive: true })
})

test('desktop UI freeze baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 1045 })
  await page.addInitScript(() => {
    if (!localStorage.getItem('tapledger-language')) localStorage.setItem('tapledger-language', 'en')
    if (!localStorage.getItem('tapledger-theme')) localStorage.setItem('tapledger-theme', 'light')
  })

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Set up your private ledger|Welcome back/ })).toBeVisible()
  await capture(page, 'desktop-light-login')

  await login(page)
  await capture(page, 'desktop-light-home')

  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await capture(page, 'desktop-light-transactions', true)
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await capture(page, 'desktop-light-transaction-editor')
  await page.getByRole('button', { name: 'Close editor' }).click()

  await page.goto('/insights')
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await capture(page, 'desktop-light-insights', true)

  await seedCloudflareVisualState(page)
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await capture(page, 'desktop-light-settings', true)

  await page.goto('/review')
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible()
  await capture(page, 'desktop-light-review', true)

  await page.getByRole('button', { name: 'Use dark mode' }).click()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await capture(page, 'desktop-dark-home')
})

test('mobile UI freeze baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    if (!localStorage.getItem('tapledger-language')) localStorage.setItem('tapledger-language', 'en')
    if (!localStorage.getItem('tapledger-theme')) localStorage.setItem('tapledger-theme', 'light')
  })
  await login(page)
  await expect(page.getByRole('heading', { name: 'TapLedger', exact: true })).toBeVisible()
  await capture(page, 'mobile-light-home')

  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await capture(page, 'mobile-light-transactions')
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await capture(page, 'mobile-light-transaction-editor')
  await page.getByRole('button', { name: 'Close editor' }).click()

  await page.goto('/review')
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible()
  await capture(page, 'mobile-light-review')

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('tapledger-theme', 'dark')
    location.reload()
  })
  await expect(page.getByRole('heading', { name: 'TapLedger', exact: true })).toBeVisible()
  await capture(page, 'mobile-dark-home')
})
