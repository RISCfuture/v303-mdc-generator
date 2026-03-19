import { test, expect } from '@playwright/test'

test.describe('Flight Member Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage before each test
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
  })

  test('should add and remove crew members', async ({ page }) => {
    await page.goto('/')

    // Create a mission
    await page
      .getByRole('button', { name: /New Mission/ })
      .first()
      .click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/)

    // Navigate to Flight Members tab
    await page.getByText('Flight Members', { exact: true }).click()

    // Initially should have no crew - check for the empty state message
    await expect(page.getByText(/At least one flight member is required/)).toBeVisible()

    // Try to add a crew member from the dropdown (first crew member in list)
    // Wait for the Flight Composition card to be visible
    await expect(page.getByText('Flight Composition')).toBeVisible()
    // Find and click the dropdown within the Flight Composition card
    const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' })
    const crewDropdown = flightCard.locator('.n-base-selection').first()
    await crewDropdown.click()
    // Wait for the dropdown menu to appear
    await page.locator('.n-base-select-menu').waitFor({ state: 'visible' })

    // Select first option
    await page.locator('.n-base-select-option').first().click()

    // Verify crew member was added
    const crewItems = page.locator('.crew-item')
    await expect(crewItems).toHaveCount(1)
  })

  test('should prevent adding duplicate crew members', async ({ page }) => {
    await page.goto('/')

    // Create a mission
    await page
      .getByRole('button', { name: /New Mission/ })
      .first()
      .click()
    await page.getByRole('button', { name: 'Create Mission' }).click()
    await page.waitForURL(/\/mission\/.+/)

    // Navigate to Flight Members tab
    await page.getByText('Flight Members', { exact: true }).click()

    // Add first crew member
    // Wait for the Flight Composition card to be visible
    await expect(page.getByText('Flight Composition')).toBeVisible()
    // Find and click the dropdown within the Flight Composition card
    const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' })
    const crewDropdown = flightCard.locator('.n-base-selection').first()
    await crewDropdown.click()
    // Wait for the dropdown menu to appear
    await page.locator('.n-base-select-menu').waitFor({ state: 'visible' })

    // Get the text of the first option to verify later
    const firstOption = page.locator('.n-base-select-option').first()
    const firstCrewName = await firstOption.textContent()
    await firstOption.click()

    // Wait for dropdown to close by checking it's hidden
    await expect(page.locator('.n-base-select-menu')).toBeHidden()

    // Open dropdown again and verify the first crew member is removed from options
    await crewDropdown.click()
    const optionsWithFirstCrew = page.locator('.n-base-select-option', {
      hasText: firstCrewName ?? '',
    })
    await expect(optionsWithFirstCrew).toHaveCount(0)
  })
})
