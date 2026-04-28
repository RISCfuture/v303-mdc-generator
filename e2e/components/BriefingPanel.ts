import { type Locator, type Page } from '@playwright/test'

/**
 * Component object for the Briefing tab in the mission editor.
 * Handles remarks editing and image upload.
 */
export class BriefingPanel {
  readonly page: Page
  readonly remarksEditor: Locator

  constructor(page: Page) {
    this.page = page
    this.remarksEditor = page.locator('.cm-content').first()
  }

  /** Navigate to the Briefing tab */
  async navigateToTab() {
    await this.page.getByText('Briefing', { exact: true }).click()
  }

  /** Fill in the remarks field */
  async fillRemarks(text: string) {
    await this.remarksEditor.click()
    await this.remarksEditor.fill(text)
  }

  /** Upload an image via the image button menu */
  async uploadImage(fileName: string, mimeType: string, buffer: Buffer) {
    const imageButton = this.page.getByRole('button', { name: 'image' }).first()
    await imageButton.click()

    // Wait for the dropdown menu to be fully rendered before clicking — Firefox
    // can otherwise miss the click while Naive UI's open animation is in flight.
    const uploadMenuItem = this.page.getByRole('menuitem', { name: 'Upload Images' })
    await uploadMenuItem.waitFor({ state: 'visible' })

    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await uploadMenuItem.click({ force: true })

    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({ name: fileName, mimeType, buffer })
  }
}
