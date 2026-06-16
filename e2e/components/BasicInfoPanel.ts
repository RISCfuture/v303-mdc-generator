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
    await this.selectAirport('departure', searchText)
  }

  /** Select the first available departure runway */
  async selectDepartureRunway() {
    await this.selectFirstRunway('departure')
  }

  /** Clear the departure airport selection */
  async clearDepartureAirport() {
    const depAirportSelect = this.page.getByTestId('departure-airport-select')
    const clearButton = depAirportSelect.locator('.n-base-clear')
    const isClearVisible = await clearButton.isVisible()
    if (isClearVisible) {
      await clearButton.click()
    }
  }

  /** Clear and re-select a departure airport */
  async changeDepartureAirport(searchText: string) {
    await this.selectAirport('departure', searchText, { clearFirst: true })
  }

  /** Select a recovery airport by typing a search string and picking the first result */
  async selectRecoveryAirport(searchText: string) {
    await this.selectAirport('recovery', searchText)
  }

  /** Select the first available recovery runway */
  async selectRecoveryRunway() {
    await this.selectFirstRunway('recovery')
  }

  /** Select an airport for the given role by typing a search string and picking the first result */
  private async selectAirport(
    role: 'departure' | 'recovery',
    searchText: string,
    options: { clearFirst?: boolean } = {},
  ) {
    const airportSelect = this.page.getByTestId(`${role}-airport-select`)
    await airportSelect.click()

    const airportInput = airportSelect.locator('input')
    if (options.clearFirst) {
      await airportInput.clear()
    }
    await airportInput.fill(searchText)
    await airportInput.press('ArrowDown')
    await airportInput.press('Enter')
  }

  /** Select the first available runway for the given role */
  private async selectFirstRunway(role: 'departure' | 'recovery') {
    const runwaySelect = this.page.getByTestId(`${role}-runway-select`)
    await runwaySelect.click()
    await this.page.keyboard.press('ArrowDown')
    await this.page.keyboard.press('Enter')
  }
}
