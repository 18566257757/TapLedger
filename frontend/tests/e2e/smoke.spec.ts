import { expect, test } from '@playwright/test'

test('setup, add transaction, and view the dashboard', async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('TapLedger')
  await expect(page.getByRole('heading', { name: /Set up your private ledger|Welcome back|Good (morning|afternoon|evening)/ })).toBeVisible()
  if (await page.getByRole('heading', { name: 'Set up your private ledger' }).isVisible().catch(() => false)) {
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password', { exact: true }).fill('TapLedger-E2E-Password!')
    await page.getByRole('button', { name: 'Create administrator' }).click()
  } else if (await page.getByRole('heading', { name: 'Welcome back' }).isVisible().catch(() => false)) {
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password', { exact: true }).fill('TapLedger-E2E-Password!')
    await page.getByRole('button', { name: 'Sign in' }).click()
  }
  if (isMobile) await expect(page.getByRole('heading', { name: 'TapLedger', exact: true })).toBeVisible()
  else await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await page.getByLabel('Amount').fill('45.80')
  await page.getByLabel('Merchant').fill('STARBUCKS IFC')
  await page.getByRole('button', { name: 'Save transaction' }).click()
  await expect(page.getByText('STARBUCKS', { exact: true }).first()).toBeVisible()
})
