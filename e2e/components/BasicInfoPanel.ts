import { type Page } from '@playwright/test'

/**
 * Component object for the Basic Info tab in the mission editor.
 * Handles mission type, departure/recovery airport selection, and runway selection.
 */
export class BasicInfoPanel {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Navigate to the Basic Info tab */
  async navigateToTab() {
    await this.page.getByText('Basic Info', { exact: true }).click()
  }

  /** Wait for the Basic Info tab content to be visible */
  async waitForVisible() {
    await this.page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' })
  }

  /** Fill in the mission name */
  async fillMissionName(name: string) {
    const nameInput = this.page.locator('[aria-label="Mission Name"] input')
    await nameInput.fill(name)
  }

  /** Set the mission type via the autocomplete field */
  async setMissionType(type = 'CAS') {
    await this.navigateToTab()
    const missionTypeInput = this.page.locator('[aria-label="Mission Type"] input')
    await missionTypeInput.click()
    await missionTypeInput.fill(type)
    await missionTypeInput.press('Tab')
  }

  /** Select a departure airport by typing a search string and picking the first result */
  async selectDepartureAirport(searchText: string) {
    const depCard = this.page.locator('.n-card', { hasText: 'Departure' })
    const depAirportSelect = depCard.locator('.n-base-selection').first()
    await depAirportSelect.click()

    const depAirportInput = depCard.locator('input').first()
    await depAirportInput.fill(searchText)
    await depAirportInput.press('ArrowDown')
    await depAirportInput.press('Enter')
  }

  /** Select the first available departure runway */
  async selectDepartureRunway() {
    const depCard = this.page.locator('.n-card', { hasText: 'Departure' })
    const depRunwaySelect = depCard.locator('.n-base-selection').nth(1)
    await depRunwaySelect.click()
    await this.page.keyboard.press('ArrowDown')
    await this.page.keyboard.press('Enter')
  }

  /** Clear the departure airport selection */
  async clearDepartureAirport() {
    const depCard = this.page.locator('.n-card', { hasText: 'Departure' })
    const depAirportSelect = depCard.locator('.n-base-selection').first()
    const clearButton = depAirportSelect.locator('.n-base-clear')
    const isClearVisible = await clearButton.isVisible()
    if (isClearVisible) {
      await clearButton.click()
    }
  }

  /** Clear and re-select a departure airport */
  async changeDepartureAirport(searchText: string) {
    const depCard = this.page.locator('.n-card', { hasText: 'Departure' })
    const depAirportSelect = depCard.locator('.n-base-selection').first()
    await depAirportSelect.click()

    const depAirportInput = depCard.locator('input').first()
    await depAirportInput.clear()
    await depAirportInput.fill(searchText)
    await depAirportInput.press('ArrowDown')
    await depAirportInput.press('Enter')
  }

  /** Select a recovery airport by typing a search string and picking the first result */
  async selectRecoveryAirport(searchText: string) {
    const recCard = this.page.locator('.n-card', { hasText: 'Recovery' })
    const recAirportSelect = recCard.locator('.n-base-selection').first()
    await recAirportSelect.click()

    const recAirportInput = recCard.locator('input').first()
    await recAirportInput.fill(searchText)
    await recAirportInput.press('ArrowDown')
    await recAirportInput.press('Enter')
  }

  /** Select the first available recovery runway */
  async selectRecoveryRunway() {
    const recCard = this.page.locator('.n-card', { hasText: 'Recovery' })
    const recRunwaySelect = recCard.locator('.n-base-selection').nth(1)
    await recRunwaySelect.click()
    await this.page.keyboard.press('ArrowDown')
    await this.page.keyboard.press('Enter')
  }
}
