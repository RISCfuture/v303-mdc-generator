import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the TOLD & Fuel tab in the mission editor.
 * Handles Takeoff & Landing Data card: rotation speed, refusal speed,
 * takeoff fuel, and gross weight fields.
 */
export class ToldFuelPanel {
  readonly page: Page
  readonly toldCard: Locator

  constructor(page: Page) {
    this.page = page
    this.toldCard = page.locator('.n-card', { hasText: 'Takeoff & Landing Data' })
  }

  /** Navigate to the TOLD & Fuel tab */
  async navigateToTab() {
    await this.page.getByText('TOLD & Fuel', { exact: true }).click()
  }

  /** Wait for the TOLD card to be visible */
  async waitForVisible() {
    await this.toldCard.waitFor({ state: 'visible' })
  }

  /** Get the takeoff fuel input */
  get takeoffFuelInput(): Locator {
    return this.toldCard.locator('.n-form-item', { hasText: 'Takeoff Fuel' }).locator('input')
  }

  /** Get the gross weight input */
  get grossWeightInput(): Locator {
    return this.toldCard.locator('.n-form-item', { hasText: 'Gross Weight' }).locator('input')
  }

  /** Fill in the rotation speed */
  async fillRotationSpeed(speed: string) {
    const rotationFormItem = this.toldCard.locator('.n-form-item', { hasText: 'Rotation Speed' })
    const rotationInput = rotationFormItem.locator('input').first()
    await rotationInput.waitFor({ state: 'visible' })
    await rotationInput.click()
    await rotationInput.fill(speed)
    await rotationInput.blur()
  }

  /** Fill in the refusal speed */
  async fillRefusalSpeed(speed: string) {
    const refusalFormItem = this.toldCard.locator('.n-form-item', { hasText: 'Refusal Speed' })
    const refusalInput = refusalFormItem.locator('input').first()
    await refusalInput.click()
    await refusalInput.fill(speed)
    await refusalInput.blur()
  }
}
