import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper to select an option by label text in a <select> that is the ONLY
// select in the row whose first cell contains the given variable name.
async function setRole(page: Page, varName: string, role: string) {
  const row = page.locator('table tbody tr').filter({ hasText: varName }).first()
  await row.locator('select').first().selectOption({ label: role })
}

test.describe('Wizard happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('full flow: upload codebook → assign roles → set flags → find FH → download R', async ({ page }) => {
    // ── Step 1: Upload codebook ─────────────────────────────────────────────
    const fileInput = page.locator('[data-testid="file-input"]')
    const fixturePath = path.resolve(__dirname, 'fixtures/test-codebook.csv')
    await fileInput.setInputFiles(fixturePath)

    // Verify variables appear in the preview table (exact match on the name cell)
    await expect(page.getByText('income', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('district', { exact: true }).first()).toBeVisible()

    // Advance to Step 2
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 2: Assign roles ────────────────────────────────────────────────
    await expect(page.getByText('Variable roles')).toBeVisible()

    // income → target
    await setRole(page, 'income', 'Target')
    // district is auto-suggested as area-id (type=identifier), confirm it
    // edu_rate → auxiliary (default auto-suggest is 'ignored', set manually)
    await setRole(page, 'edu_rate', 'Auxiliary')
    await setRole(page, 'urban_pct', 'Auxiliary')
    await setRole(page, 'survey_weight', 'Survey weight')
    await setRole(page, 'dir_est', 'Direct estimate')
    await setRole(page, 'dir_var', 'Sampling variance')

    // Advance to Step 3
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 3: Data availability ───────────────────────────────────────────
    await expect(page.getByText('Data availability')).toBeVisible()

    // Tick: microdata, area aggregates, weights, census auxiliaries (so FH and BHF both eligible)
    const checkByLabel = (label: string) =>
      page.getByText(label, { exact: false }).first().click()

    await checkByLabel('individual household/unit records')
    await checkByLabel('area-level direct estimates')
    await checkByLabel('sampling weights')
    await checkByLabel('population-level auxiliary variables')

    // Stata version: already defaults to 14; no change needed
    // No spatial, no outliers (leave unchecked)

    // Advance to Step 4
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 4: Methods ─────────────────────────────────────────────────────
    await expect(page.getByText('Recommended methods')).toBeVisible()

    // At least one method card is shown
    const methodCards = page.locator('[data-testid^="select-"]')
    await expect(methodCards.first()).toBeVisible()

    // FH-EBLUP card is present (eligible because area aggregates + census auxiliaries)
    const fhRadio = page.locator('[data-testid="select-fh-eblup"]')
    await expect(fhRadio).toBeVisible()

    // Select FH-EBLUP
    await fhRadio.click()

    // Advance to Step 5
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 5: Download ────────────────────────────────────────────────────
    await expect(page.getByText('Download scripts')).toBeVisible()

    // Verify R script preview contains expected content
    const pre = page.locator('pre').first()
    await expect(pre).toContainText('library(')

    // Download R script and verify a file download is triggered
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="download-r-fh-eblup"]').click()
    const dl = await downloadPromise
    expect(dl.suggestedFilename()).toContain('.R')
  })

  test('sample-based auxiliaries: FH-ME appears and standard FH shows the sampling-error caveat', async ({ page }) => {
    // ── Step 1: Upload codebook ─────────────────────────────────────────────
    const fileInput = page.locator('[data-testid="file-input"]')
    const fixturePath = path.resolve(__dirname, 'fixtures/test-codebook.csv')
    await fileInput.setInputFiles(fixturePath)
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 2: Assign roles ────────────────────────────────────────────────
    await expect(page.getByText('Variable roles')).toBeVisible()
    await setRole(page, 'income', 'Target')
    await setRole(page, 'edu_rate', 'Auxiliary')
    await setRole(page, 'urban_pct', 'Auxiliary')
    await setRole(page, 'dir_est', 'Direct estimate')
    await setRole(page, 'dir_var', 'Sampling variance')
    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 3: Data availability ───────────────────────────────────────────
    await expect(page.getByText('Data availability')).toBeVisible()

    // Continuous target
    await page.getByText('Continuous (e.g. income', { exact: false }).first().click()

    // Area aggregates + census auxiliaries so FH-EBLUP and FH-ME are both eligible
    await page.getByText('area-level direct estimates', { exact: false }).first().click()
    await page.getByText('population-level auxiliary variables', { exact: false }).first().click()

    // Declare sample-based auxiliaries, with variances available
    await page.locator('[data-testid="aux-source-sample"]').click()
    await page.locator('[data-testid="aux-has-variances"]').check()

    await page.getByRole('button', { name: /next/i }).click()

    // ── Step 4: Methods ─────────────────────────────────────────────────────
    await expect(page.getByText('Recommended methods')).toBeVisible()

    // FH-ME card is present and selectable
    const fhMeRadio = page.locator('[data-testid="select-fh-me"]')
    await expect(fhMeRadio).toBeVisible()

    // Standard FH-EBLUP card shows the prominent sampling-error caveat
    await expect(page.locator('[data-testid="sampling-error-note-fh-eblup"]')).toBeVisible()

    // FH-ME is selectable
    await fhMeRadio.click()
    await expect(fhMeRadio).toBeChecked()
  })
})
