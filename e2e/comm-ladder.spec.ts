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

// Helper function to get the comm ladder input
async function getCommLadderInput(page: Page) {
  const commLadderFormItem = page.locator('.n-form-item', { hasText: 'Comm Ladder' })
  await commLadderFormItem.waitFor({ state: 'visible', timeout: 5000 })
  return commLadderFormItem.locator('.n-input input').first()
}

// Helper function to get the default mode selector
async function getDefaultModeSelector(page: Page) {
  const defaultFormItem = page.locator('.n-form-item', { hasText: 'Default' })
  await defaultFormItem.waitFor({ state: 'visible', timeout: 5000 })
  return defaultFormItem.locator('.n-select').first()
}

// Helper function to get the preset selector (when in preset mode)
async function getPresetSelector(page: Page) {
  const defaultFormItem = page.locator('.n-form-item', { hasText: 'Default' })
  return defaultFormItem.locator('.n-select').nth(1)
}

// Helper function to get the frequency input (when in manual mode)
async function getFrequencyInput(page: Page) {
  const defaultFormItem = page.locator('.n-form-item', { hasText: 'Default' })
  return defaultFormItem.locator('.n-input-number input')
}

test.describe('Comm Ladder and Radio Default Functionality', () => {
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

  test('should type freeform text into comm ladder field', async ({ page }) => {
    const input = await getCommLadderInput(page)

    // Type comm ladder text
    await input.fill('1-2-3-4-12')
    await page.waitForTimeout(300)

    // Verify the text was entered
    await expect(input).toHaveValue('1-2-3-4-12')
  })

  test('should select default mode as Preset and choose preset number', async ({ page }) => {
    const modeSelector = await getDefaultModeSelector(page)

    // Default should be Preset mode
    await expect(modeSelector).toContainText('Preset')

    // The preset selector should be visible
    const presetSelector = await getPresetSelector(page)
    await expect(presetSelector).toBeVisible()

    // Select preset 5
    await presetSelector.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.locator('.n-base-select-option', { hasText: '5' }).click()
    await page.waitForTimeout(300)

    // Verify preset 5 is selected
    await expect(presetSelector).toContainText('5')
  })

  test('should switch to Manual mode and enter frequency', async ({ page }) => {
    const modeSelector = await getDefaultModeSelector(page)

    // Click to open mode selector and choose Manual
    await modeSelector.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.locator('.n-base-select-option', { hasText: 'Manual' }).click()
    await page.waitForTimeout(300)

    // Verify Manual mode is selected
    await expect(modeSelector).toContainText('Manual')

    // The frequency input should now be visible
    const frequencyInput = await getFrequencyInput(page)
    await expect(frequencyInput).toBeVisible()

    // Enter a frequency
    await frequencyInput.fill('251.5')
    await page.waitForTimeout(300)

    // Verify the frequency was entered
    await expect(frequencyInput).toHaveValue('251.5')
  })

  test('should switch between different radio tabs and preserve settings', async ({ page }) => {
    // Test UHF radio (COM 1)
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')

    // Enter comm ladder text for UHF
    const uhfCommLadder = await getCommLadderInput(page)
    await uhfCommLadder.fill('1-2-3')
    await page.waitForTimeout(300)

    // Switch to VHF radio (COM 2)
    await switchToRadioTab(page, 'COMM 2 (VHF) AN/ARC-222')

    // VHF comm ladder should be empty
    const vhfCommLadder = await getCommLadderInput(page)
    await expect(vhfCommLadder).toHaveValue('')

    // Enter comm ladder text for VHF
    await vhfCommLadder.fill('4-5-6')
    await page.waitForTimeout(300)

    // Switch back to UHF - should still have the original text
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')
    const uhfCommLadderAgain = await getCommLadderInput(page)
    await expect(uhfCommLadderAgain).toHaveValue('1-2-3')

    // Switch back to VHF - should still have its text
    await switchToRadioTab(page, 'COMM 2 (VHF) AN/ARC-222')
    const vhfCommLadderAgain = await getCommLadderInput(page)
    await expect(vhfCommLadderAgain).toHaveValue('4-5-6')
  })

  test('should preserve radio default settings across tab switches', async ({ page }) => {
    // Set UHF to Manual mode with frequency
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')
    const uhfModeSelector = await getDefaultModeSelector(page)
    await uhfModeSelector.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.locator('.n-base-select-option', { hasText: 'Manual' }).click()
    await page.waitForTimeout(300)

    const uhfFrequencyInput = await getFrequencyInput(page)
    await uhfFrequencyInput.fill('305.0')
    await page.waitForTimeout(300)

    // Switch to VHF and set a different preset
    await switchToRadioTab(page, 'COMM 2 (VHF) AN/ARC-222')
    const vhfPresetSelector = await getPresetSelector(page)
    await vhfPresetSelector.click()
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 5000 })
    await page.locator('.n-base-select-option', { hasText: '10' }).click()
    await page.waitForTimeout(300)

    // Switch back to UHF - should still be Manual mode with frequency
    await switchToRadioTab(page, 'COMM 1 (UHF) AN/ARC-164')
    const uhfModeSelectorAgain = await getDefaultModeSelector(page)
    await expect(uhfModeSelectorAgain).toContainText('Manual')
    const uhfFrequencyInputAgain = await getFrequencyInput(page)
    await expect(uhfFrequencyInputAgain).toHaveValue('305.000')

    // Switch back to VHF - should still have preset 10
    await switchToRadioTab(page, 'COMM 2 (VHF) AN/ARC-222')
    const vhfPresetSelectorAgain = await getPresetSelector(page)
    await expect(vhfPresetSelectorAgain).toContainText('10')
  })
})
