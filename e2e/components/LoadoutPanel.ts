import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the Loadout tab in the mission editor.
 * Handles station munition selection and fuel slider adjustments.
 */
export class LoadoutPanel {
  readonly page: Page
  readonly loadoutCard: Locator

  constructor(page: Page) {
    this.page = page
    this.loadoutCard = page.locator('.n-card', { hasText: 'Aircraft Loadout' })
  }

  /** Navigate to the Loadout tab */
  async navigateToTab() {
    await this.page.getByText('Loadout', { exact: true }).click()
  }

  /** Wait for the loadout card to be visible */
  async waitForVisible() {
    await this.loadoutCard.waitFor({ state: 'visible' })
  }

  /**
   * Select a munition on a specific station by typing to filter,
   * then picking the matching option.
   */
  async selectStationMunition(stationLabel: string, searchText: string) {
    const stationSelect = this.page.locator(`[aria-label="Station ${stationLabel} Munition"]`)
    await stationSelect.click()
    await this.page.keyboard.type(searchText, { delay: 30 })
    await this.page.locator('.n-base-select-menu').waitFor({ state: 'visible' })

    const option = this.page.locator('.n-base-select-option', { hasText: searchText }).first()
    await option.waitFor({ state: 'visible' })
    await option.click()
  }

  /** Get the fuel slider handle */
  get sliderHandle(): Locator {
    return this.loadoutCard.locator('.n-slider-handle-wrapper[role="slider"]')
  }

  /**
   * Set the fuel slider to a target percentage by pressing ArrowLeft from 100%.
   * The slider starts at 100% by default.
   */
  async setFuelPercentage(targetPercent: number) {
    const handle = this.sliderHandle
    await handle.waitFor({ state: 'visible' })
    await handle.focus()
    const stepsDown = 100 - targetPercent
    for (let i = 0; i < stepsDown; i++) {
      await this.page.keyboard.press('ArrowLeft')
    }
  }
}
