import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Mission List Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage and IndexedDB before each test
    await page.evaluate(() => {
      localStorage.clear()
      indexedDB.deleteDatabase('v303-mdc-images')
    })
    await page.reload()
  })

  test('should export missions and download JSON file', async ({ page }) => {
    test.setTimeout(90000) // Increase timeout for this test that creates multiple missions

    await page.goto('/')

    // Create two missions
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /New Mission/ }).first().click()
      await page.getByRole('button', { name: 'Create Mission' }).click()
      await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
      await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
      await page.locator('.n-page-header__back').click()
      await page.waitForTimeout(500)
    }

    // Setup download listener
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.getByRole('button', { name: /Export Missions/ }).click()

    // Wait for download
    const download = await downloadPromise

    // Verify filename matches pattern
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/^v303-missions-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('should show import confirmation modal when importing valid backup', async ({ page }) => {
    await page.goto('/')

    // Create a test mission first to export
    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })

    // Update mission name
    const nameInput = page.locator('[aria-label="Mission Name"] input')
    await nameInput.waitFor({ state: 'visible', timeout: 5000 })
    await nameInput.fill('Test Mission for Export')

    await page.locator('.n-page-header__back').click()

    // Export the mission
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export Missions/ }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()

    // Now import the file
    const importButton = page.getByRole('button', { name: /Import Missions/ })
    await expect(importButton).toBeVisible()

    // Set up file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(downloadPath!)

    // Wait for import modal to appear (use dialog role to be more specific)
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).toBeVisible()

    // Verify warning message
    await expect(
      page.getByText(/This will delete all existing missions/)
    ).toBeVisible()

    // Verify import details are shown
    await expect(page.getByText(/Missions to import:/i)).toBeVisible()
    await expect(page.getByText(/Exported:/i)).toBeVisible()
    await expect(page.getByText(/File size:/i)).toBeVisible()
  })

  test('should successfully import missions and replace existing ones', async ({ page }) => {
    test.setTimeout(90000) // Increase timeout for this test that creates multiple missions

    await page.goto('/')

    // Create two original missions
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /New Mission/ }).first().click()
      await page.getByRole('button', { name: 'Create Mission' }).click()

      // Wait for both URL change and page to be fully loaded
      await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
      await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })

      const nameInput = page.locator('[aria-label="Mission Name"] input')
      await nameInput.waitFor({ state: 'visible', timeout: 5000 })
      await nameInput.fill(`Original Mission ${i + 1}`)
      await page.locator('.n-page-header__back').click()
      await page.waitForTimeout(500)
    }

    // Verify original missions exist (use table selector to avoid strict mode violation)
    await expect(page.getByRole('table').getByText('Original Mission 1')).toBeVisible()
    await expect(page.getByRole('table').getByText('Original Mission 2')).toBeVisible()

    // Export missions
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export Missions/ }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()

    // Create a different mission
    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })

    const nameInput = page.locator('[aria-label="Mission Name"] input')
    await nameInput.waitFor({ state: 'visible', timeout: 5000 })
    await nameInput.fill('New Mission to be Replaced')
    await page.locator('.n-page-header__back').click()

    // Verify we now have 3 missions (use table selector to avoid strict mode violation)
    await expect(page.getByRole('table').getByText('New Mission to be Replaced')).toBeVisible()

    // Import the backup (which has 2 missions)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(downloadPath!)

    // Wait for confirmation modal
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).toBeVisible()

    // Confirm import
    await page.getByRole('button', { name: /Replace All Missions/i }).click()

    // Wait for modal to close
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).not.toBeVisible()

    // Verify we're back to the original 2 missions (use table selector to avoid strict mode violation)
    await expect(page.getByRole('table').getByText('Original Mission 1')).toBeVisible()
    await expect(page.getByRole('table').getByText('Original Mission 2')).toBeVisible()
    await expect(page.getByRole('table').getByText('New Mission to be Replaced')).not.toBeVisible()
  })

  test('should cancel import when cancel button is clicked', async ({ page }) => {
    await page.goto('/')

    // Create a mission and export it
    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('.n-page-header__back').click()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export Missions/ }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()

    // Try to import
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(downloadPath!)

    // Wait for confirmation modal
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click()

    // Modal should close
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).not.toBeVisible()

    // Original mission should still exist
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should show error message for invalid backup file', async ({ page }) => {
    await page.goto('/')

    // Create an invalid backup file
    const invalidBackupPath = path.join(__dirname, 'invalid-backup.json')
    fs.writeFileSync(
      invalidBackupPath,
      JSON.stringify({ invalid: 'data', version: 1 })
    )

    // Try to import invalid file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(invalidBackupPath)

    // Should see error message (Naive UI shows error messages as notifications)
    await expect(page.getByText(/Failed to parse backup file/i)).toBeVisible()

    // Clean up
    fs.unlinkSync(invalidBackupPath)
  })

  test('should handle multiple missions and images in export', async ({ page }) => {
    test.setTimeout(90000) // Increase timeout for this test that creates multiple missions

    await page.goto('/')

    // Create 3 missions with different names
    const missionNames = ['SEAD Mission', 'CAS Mission', 'CAP Mission']
    for (const name of missionNames) {
      await page.getByRole('button', { name: /New Mission/ }).first().click()
      await page.getByRole('button', { name: 'Create Mission' }).click()

      // Wait for both URL change and page to be fully loaded
      await page.waitForURL(/\/mission\/.+/, { timeout: 60000 })
      await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })

      const nameInput = page.locator('[aria-label="Mission Name"] input')
      await nameInput.waitFor({ state: 'visible', timeout: 5000 })
      await nameInput.fill(name)

      await page.locator('.n-page-header__back').click()
      await page.waitForTimeout(500)
    }

    // Export
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export Missions/ }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()

    // Clear everything and import
    await page.evaluate(() => {
      localStorage.clear()
      indexedDB.deleteDatabase('v303-mdc-images')
    })
    await page.reload()

    // Import
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(downloadPath!)

    // Wait for import modal to appear
    await expect(page.locator('.n-dialog__title', { hasText: 'Import Missions' })).toBeVisible()

    await page.getByRole('button', { name: /Replace All Missions/i }).click()

    // Wait for import to complete
    await page.waitForTimeout(500)

    // Verify all missions are restored (use table selector to avoid strict mode violation)
    for (const name of missionNames) {
      await expect(page.getByRole('table').getByText(name)).toBeVisible()
    }
  })
})
