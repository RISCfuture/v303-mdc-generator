import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the Steerpoints tab in the mission editor.
 * Handles steerpoint navigation, creation, deletion, and property access.
 */
export class SteerpointsPanel {
  readonly page: Page
  readonly waypointCards: Locator
  readonly emptyStateMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.waypointCards = page.locator('.waypoint-item')
    this.emptyStateMessage = page.locator('text="At least one steerpoint is required"')
  }

  /** Navigate to the Steerpoints tab */
  async navigateToTab() {
    await this.page.getByText('Steerpoints', { exact: true }).click()
    await this.waypointCards
      .first()
      .waitFor({ state: 'visible' })
      .catch(() => {
        // If no waypoints, wait for the empty state message instead
      })
  }

  /** Get the count of steerpoints currently displayed */
  async getSteerpointCount(): Promise<number> {
    await this.navigateToTab()

    const isEmptyVisible = await this.emptyStateMessage.isVisible()
    if (isEmptyVisible) {
      return 0
    }

    return this.waypointCards.count()
  }

  /** Get the name input value for a steerpoint at the given index */
  async getSteerpointName(index: number): Promise<string> {
    await this.navigateToTab()
    await this.waypointCards.first().waitFor({ state: 'visible' })

    const card = this.waypointCards.nth(index)
    const nameInput = card.getByTestId('waypoint-name').locator('input')
    await nameInput.waitFor({ state: 'visible' })
    return nameInput.inputValue()
  }

  /** Add a custom steerpoint with a name and default coordinates */
  async addCustomSteerpoint(name: string) {
    await this.navigateToTab()

    const countBefore = await this.waypointCards.count()

    const addButton = this.page.getByRole('button', { name: '+ Custom Steerpoint' })
    await addButton.scrollIntoViewIfNeeded()
    await addButton.click()

    await this.waypointCards.nth(countBefore).waitFor({ state: 'visible' })

    const lastCard = this.waypointCards.nth(countBefore)
    const nameInput = lastCard.getByTestId('waypoint-name').locator('input')
    await nameInput.waitFor({ state: 'visible' })
    await nameInput.fill(name)

    const coordinateInput = lastCard.getByTestId('waypoint-coordinate').locator('input')
    await coordinateInput.fill('N 32 00.000, E 066 00.000')

    const altitudeInput = lastCard.getByTestId('waypoint-altitude').locator('input')
    await altitudeInput.fill('25000')
  }

  /** Remove the first steerpoint */
  async removeFirstSteerpoint() {
    const removeButton = this.page.locator('.waypoint-item .waypoint-delete').first()
    await removeButton.scrollIntoViewIfNeeded()
    await removeButton.click({ force: true })
  }

  /** Get the waypoint card at the given index */
  getWaypointCard(index: number): Locator {
    return this.waypointCards.nth(index)
  }

  /** Fill the altitude field on a waypoint card */
  async fillAltitude(cardIndex: number, altitude: string) {
    const card = this.waypointCards.nth(cardIndex)
    await card.waitFor({ state: 'visible' })
    const altitudeInput = card.getByTestId('waypoint-altitude').locator('input')
    const isVisible = await altitudeInput.isVisible()
    if (isVisible) {
      await altitudeInput.clear()
      await altitudeInput.fill(altitude)
    }
  }

  /** Fill the TOT field on a waypoint card */
  async fillTot(cardIndex: number, tot: string) {
    const card = this.waypointCards.nth(cardIndex)
    await card.waitFor({ state: 'visible' })
    const totInput = card.getByTestId('waypoint-tot').locator('input')
    const isVisible = await totInput.isVisible()
    if (isVisible) {
      await totInput.fill(tot)
    }
  }

  /** Get the TOT input value for a waypoint card */
  async getTotValue(cardIndex: number): Promise<string | null> {
    const card = this.waypointCards.nth(cardIndex)
    await card.waitFor({ state: 'visible' })
    const totInput = card.getByTestId('waypoint-tot').locator('input')
    const isVisible = await totInput.isVisible()
    if (isVisible) {
      return totInput.inputValue()
    }
    return null
  }
}
