import { test, expect } from '@playwright/test'

test('page title contains SAE', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/SAE/)
})
