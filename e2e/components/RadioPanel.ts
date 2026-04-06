import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the Radios tab in the mission editor.
 * Handles comm ladder fields, default mode selection, preset/frequency inputs,
 * and radio tab switching (UHF, VHF).
 */
export class RadioPanel {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Navigate to the Radios tab within the mission editor */
  async navigateToTab() {
    await this.page.getByText('Radios', { exact: true }).click()
  }

  /** Switch to a specific radio sub-tab by name (e.g. "COMM 1 (UHF) AN/ARC-164") */
  async switchToRadioTab(radioName: string) {
    await this.page.locator('.n-tabs-tab', { hasText: radioName }).click()
  }

  /** Get the comm ladder input field for the currently selected radio */
  async getCommLadderInput(): Promise<Locator> {
    const commLadderFormItem = this.page.locator('.n-form-item', { hasText: 'Comm Ladder' })
    await commLadderFormItem.waitFor({ state: 'visible' })
    return commLadderFormItem.locator('.n-input input').first()
  }

  /** Fill the comm ladder field with the given text */
  async fillCommLadder(text: string) {
    const input = await this.getCommLadderInput()
    await input.fill(text)
  }

  /** Get the default mode selector for the currently selected radio */
  async getDefaultModeSelector(): Promise<Locator> {
    const defaultFormItem = this.page.locator('.n-form-item', { hasText: 'Default' })
    await defaultFormItem.waitFor({ state: 'visible' })
    return defaultFormItem.locator('.n-select').first()
  }

  /** Get the preset selector (visible when in preset mode) */
  getPresetSelector(): Locator {
    const defaultFormItem = this.page.locator('.n-form-item', { hasText: 'Default' })
    return defaultFormItem.locator('.n-select').nth(1)
  }

  /** Get the frequency input (visible when in manual mode) */
  getFrequencyInput(): Locator {
    const defaultFormItem = this.page.locator('.n-form-item', { hasText: 'Default' })
    return defaultFormItem.locator('.n-input-number input')
  }

  /** Select a preset number from the preset dropdown */
  async selectPreset(presetNumber: string) {
    const presetSelector = this.getPresetSelector()
    await presetSelector.click()
    await this.page.locator('.n-base-select-menu').waitFor({ state: 'visible' })
    await this.page.locator('.n-base-select-option', { hasText: presetNumber }).click()
  }

  /** Switch the default mode (e.g., "Manual", "Preset") */
  async selectDefaultMode(modeName: string) {
    const modeSelector = await this.getDefaultModeSelector()
    await modeSelector.click()
    await this.page.locator('.n-base-select-menu').waitFor({ state: 'visible' })
    await this.page.locator('.n-base-select-option', { hasText: modeName }).click()
  }

  /** Fill the frequency input (when in manual mode) */
  async fillFrequency(frequency: string) {
    const frequencyInput = this.getFrequencyInput()
    await frequencyInput.fill(frequency)
  }
}
