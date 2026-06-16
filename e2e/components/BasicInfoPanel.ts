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
    await this.selectAirport('departure-airport-select', searchText)
  }

  /** Select the first available departure runway */
  async selectDepartureRunway() {
    await this.selectFirstRunway('departure-runway-select')
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
    await this.selectAirport('departure-airport-select', searchText, { clearFirst: true })
  }

  /** Select a recovery airport by typing a search string and picking the first result */
  async selectRecoveryAirport(searchText: string) {
    await this.selectAirport('recovery-airport-select', searchText)
  }

  /** Select the first available recovery runway */
  async selectRecoveryRunway() {
    await this.selectFirstRunway('recovery-runway-select')
  }

  /** Open an airport select by test id, type a search string, and pick the first match */
  private async selectAirport(
    testId: string,
    searchText: string,
    options: { clearFirst?: boolean } = {},
  ) {
    const select = this.page.getByTestId(testId)
    await select.click()

    const searchInput = select.locator('input')
    if (options.clearFirst) {
      await searchInput.clear()
    }
    await searchInput.fill(searchText)
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')
  }

  /** Open a runway select by test id and pick the first available option */
  private async selectFirstRunway(testId: string) {
    await this.page.getByTestId(testId).click()
    await this.page.keyboard.press('ArrowDown')
    await this.page.keyboard.press('Enter')
  }
}
