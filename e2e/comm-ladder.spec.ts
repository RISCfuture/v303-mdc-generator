import { test, expect, type Page } from '@playwright/test'

// Helper function to navigate to the Radios tab
async function navigateToRadiosTab(page: Page) {
  // Wait for the mission editor to load
  await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' })

  // Click on the Radios tab
  await page.getByText('Radios', { exact: true }).click()
  await page.waitForTimeout(500)
}

// Helper function to switch to a specific radio tab
async function switchToRadioTab(page: Page, radioName: string) {
  await page.locator('.n-tabs-tab', { hasText: radioName }).click()
  await page.waitForTimeout(300)
}

// Helper function to get the comm ladder select component
async function getCommLadderSelect(page: Page) {
  const commLadderFormItem = page.locator('.n-form-item', { hasText: 'Comm Ladder' })
  await commLadderFormItem.waitFor({ state: 'visible', timeout: 5000 })
  return commLadderFormItem.locator('.n-base-selection').first()
}

// Helper function to count the number of tags in the comm ladder
async function getCommLadderTags(page: Page) {
  const commLadderFormItem = page.locator('.n-form-item', { hasText: 'Comm Ladder' })
  return commLadderFormItem.locator('.n-tag')
}

test.describe('Comm Ladder Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Create a new F-16C mission
    await page.getByRole('button', { name: /New Mission/ }).first().click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/)

    // Navigate to Radios tab
    await navigateToRadiosTab(page)

    // Switch to first radio tab (UHF)
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')
  })

  test('should add preset numbers and custom frequencies to comm ladder', async ({ page }) => {
    // Get the comm ladder select
    const select = await getCommLadderSelect(page)

    // Click to open dropdown and select preset 1
    await select.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.locator('.n-base-select-option', { hasText: 'Preset 1' }).first().click()
    await page.waitForTimeout(300)

    // Click again to add preset 2
    await select.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.locator('.n-base-select-option', { hasText: 'Preset 2' }).first().click()
    await page.waitForTimeout(300)

    // Verify that 2 tags are present
    let tags = await getCommLadderTags(page)
    await expect(tags).toHaveCount(2)

    // Add a custom frequency
    await select.click()
    await page.waitForTimeout(300)
    await page.keyboard.type('251.5')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Verify that 3 tags are now present
    tags = await getCommLadderTags(page)
    await expect(tags).toHaveCount(3)
    await expect(tags.nth(2)).toContainText('251.5')
  })

  test('should remove tokens from comm ladder', async ({ page }) => {
    // Get the comm ladder select
    const select = await getCommLadderSelect(page)

    // Add two presets
    await select.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.locator('.n-base-select-option', { hasText: 'Preset 1' }).first().click()
    await page.waitForTimeout(300)

    await select.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.locator('.n-base-select-option', { hasText: 'Preset 2' }).first().click()
    await page.waitForTimeout(300)

    // Verify 2 tags exist
    let tags = await getCommLadderTags(page)
    await expect(tags).toHaveCount(2)

    // Remove the first tag by clicking its close button
    const firstTagClose = tags.nth(0).locator('.n-base-close')
    await firstTagClose.click()
    await page.waitForTimeout(300)

    // Verify only 1 tag remains
    tags = await getCommLadderTags(page)
    await expect(tags).toHaveCount(1)

    // Verify the remaining tag is preset 2
    await expect(tags.nth(0)).toContainText('2')
  })

  test('should switch between different radio tabs and manage separate comm ladders', async ({ page }) => {
    // Test UHF radio (COM 1)
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')

    const uhfSelect = await getCommLadderSelect(page)

    // Add a frequency to UHF
    await uhfSelect.click()
    await page.waitForTimeout(300)
    await page.keyboard.type('251.5')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Verify tag was added
    let uhfTags = await getCommLadderTags(page)
    await expect(uhfTags).toHaveCount(1)
    await expect(uhfTags.nth(0)).toContainText('251.5')

    // Switch to VHF radio (COM 2) - should have empty comm ladder
    await switchToRadioTab(page, 'COMM 2 (VHF) AN/ARC-222')

    const vhfSelect = await getCommLadderSelect(page)

    // VHF comm ladder should be empty
    let vhfTags = await getCommLadderTags(page)
    await expect(vhfTags).toHaveCount(0)

    // Add a frequency to VHF
    await vhfSelect.click()
    await page.waitForTimeout(300)
    await page.keyboard.type('45.5')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Verify tag was added for VHF
    vhfTags = await getCommLadderTags(page)
    await expect(vhfTags).toHaveCount(1)
    await expect(vhfTags.nth(0)).toContainText('45.5')

    // Switch back to UHF - should still have the original frequency
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')
    uhfTags = await getCommLadderTags(page)
    await expect(uhfTags).toHaveCount(1)
    await expect(uhfTags.nth(0)).toContainText('251.5')
  })
})
