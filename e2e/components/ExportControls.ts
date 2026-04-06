import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for export functionality in the mission editor.
 * Handles Export PDF button and Export MDC dropdown with format submenus.
 */
export class ExportControls {
  readonly page: Page
  readonly exportPdfButton: Locator
  readonly exportMdcButton: Locator

  constructor(page: Page) {
    this.page = page
    this.exportPdfButton = page.getByRole('button', { name: /Export PDF/ })
    this.exportMdcButton = page.getByRole('button', { name: /Export MDC/ })
  }

  /** Click the Export PDF button and return the download */
  async exportPdf() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.exportPdfButton.click()
    return downloadPromise
  }

  /**
   * Export MDC in a specific format via the submenu dropdown.
   * Opens "Export MDC" -> hovers first crew member -> clicks the specified format.
   */
  async exportMdcFormat(formatLabel: string) {
    await this.exportMdcButton.click()

    const crewOption = this.page.locator('.n-dropdown-option').first()
    await crewOption.waitFor({ state: 'visible' })
    await crewOption.hover({ force: true })

    const formatOption = this.page
      .locator('.n-dropdown-option-body__label', { hasText: formatLabel })
      .first()
    await formatOption.waitFor({ state: 'visible', timeout: 3000 })
    await formatOption.click()
  }

  /** Open the MDC dropdown and hover the first crew member to reveal format submenus */
  async openMdcSubmenu() {
    await this.exportMdcButton.click()
    const crewOption = this.page.locator('.n-dropdown-option').first()
    await crewOption.waitFor({ state: 'visible' })
    await crewOption.hover({ force: true })
  }

  /** Get a format option label locator in the MDC submenu */
  getFormatOption(formatLabel: string): Locator {
    return this.page.locator('.n-dropdown-option-body__label', { hasText: formatLabel }).first()
  }
}
