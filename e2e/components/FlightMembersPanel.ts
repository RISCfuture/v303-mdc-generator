import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the Flight Members tab in the mission editor.
 * Handles crew member selection, callsign, and Link16 prefix.
 */
export class FlightMembersPanel {
  readonly page: Page
  readonly flightCard: Locator
  readonly crewDropdown: Locator
  readonly crewItems: Locator

  constructor(page: Page) {
    this.page = page
    this.flightCard = page.locator('.n-card', { hasText: 'Flight Composition' })
    this.crewDropdown = this.flightCard.locator('.n-base-selection').first()
    this.crewItems = page.locator('.crew-item')
  }

  /** Navigate to the Flight Members tab */
  async navigateToTab() {
    await this.page.getByText('Flight Members', { exact: true }).click()
  }

  /** Wait for the Flight Composition card to be visible */
  async waitForVisible() {
    await this.page.getByText('Flight Composition').waitFor({ state: 'visible' })
  }

  /** Add the first available crew member from the dropdown */
  async addFirstCrewMember() {
    await this.crewDropdown.click()
    await this.page.locator('.n-base-select-menu').waitFor({ state: 'visible' })
    await this.page.locator('.n-base-select-option').first().click()
  }

  /** Get the text of the first available crew option (before selecting) */
  async getFirstCrewOptionText(): Promise<string | null> {
    await this.crewDropdown.click()
    await this.page.locator('.n-base-select-menu').waitFor({ state: 'visible' })
    const firstOption = this.page.locator('.n-base-select-option').first()
    return firstOption.textContent()
  }

  /** Set the flight callsign */
  async setCallsign(callsign: string) {
    const callsignInput = this.page.locator('input[placeholder="Select or enter callsign"]')
    await callsignInput.waitFor({ state: 'visible' })
    await callsignInput.clear()
    await callsignInput.pressSequentially(callsign, { delay: 50 })
  }

  /** Set the Link16 prefix */
  async setLink16Prefix(prefix: string) {
    const link16Input = this.page.locator('input[placeholder="Enter 2-letter prefix"]')
    await link16Input.waitFor({ state: 'visible' })
    await link16Input.clear()
    await link16Input.pressSequentially(prefix, { delay: 50 })
  }
}
