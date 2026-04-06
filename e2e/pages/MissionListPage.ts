import { type Locator, type Page } from '@playwright/test'

/**
 * Page object for the mission list (home) page.
 * Handles mission creation, export/import, and navigation.
 */
export class MissionListPage {
  readonly page: Page
  readonly newMissionButton: Locator
  readonly createMissionButton: Locator
  readonly exportMissionsButton: Locator
  readonly importMissionsButton: Locator
  readonly fileInput: Locator
  readonly missionTable: Locator
  readonly importDialogTitle: Locator

  constructor(page: Page) {
    this.page = page
    this.newMissionButton = page.getByRole('button', { name: /New Mission/ }).first()
    this.createMissionButton = page.getByRole('button', { name: 'Create Mission' })
    this.exportMissionsButton = page.getByRole('button', { name: /Export Missions/ })
    this.importMissionsButton = page.getByRole('button', { name: /Import Missions/ })
    this.fileInput = page.locator('input[type="file"]')
    this.missionTable = page.getByRole('table')
    this.importDialogTitle = page.locator('.n-dialog__title', { hasText: 'Import Missions' })
  }

  /** Navigate to the mission list page */
  async goto() {
    await this.page.goto('/')
  }

  /** Clear localStorage and reload the page */
  async clearStorageAndReload() {
    await this.page.evaluate(() => {
      localStorage.clear()
    })
    await this.page.reload()
  }

  /** Clear localStorage, IndexedDB, and reload the page */
  async clearAllStorageAndReload() {
    await this.page.evaluate(() => {
      localStorage.clear()
      indexedDB.deleteDatabase('v303-mdc-images')
    })
    await this.page.reload()
  }

  /** Disable animations (useful for WebKit flaky click issues) */
  async disableAnimations() {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          scroll-behavior: auto !important;
          transition: none !important;
          animation: none !important;
        }
      `,
    })
  }

  /**
   * Create a new mission and wait for the editor to load.
   * Optionally set the mission name.
   */
  async createMission(name?: string) {
    await this.newMissionButton.click()

    // Wait for dialog to be visible before clicking Create Mission
    const dialog = this.page.locator('dialog, [role="dialog"]')
    await dialog.waitFor({ state: 'visible' })

    // Use JavaScript click to avoid WebKit click interception issues with overlay elements
    await this.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Mission'),
      )
      btn?.click()
    })

    // Wait for mission editor to load
    await this.page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' })

    if (name) {
      const nameInput = this.page.locator('[aria-label="Mission Name"] input')
      await nameInput.fill(name)
    }
  }

  /**
   * Create a new mission using standard button clicks (for non-WebKit browsers).
   * Optionally set the mission name.
   */
  async createMissionSimple(name?: string) {
    await this.newMissionButton.click()
    await this.createMissionButton.click()
    await this.page.waitForURL(/\/mission\/.+/)
    await this.page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' })

    if (name) {
      const nameInput = this.page.locator('[aria-label="Mission Name"] input')
      await nameInput.fill(name)
    }
  }

  /** Navigate back to the mission list from the editor */
  async goBackToMissionList() {
    await this.page.locator('.n-page-header__back').click()
    await this.missionTable.waitFor({ state: 'visible' })
  }

  /** Export all missions and return the download */
  async exportMissions() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.exportMissionsButton.click()
    return downloadPromise
  }

  /** Import missions from a file path */
  async importMissionsFromFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath)
  }

  /** Confirm the import in the confirmation dialog */
  async confirmImport() {
    await this.page.getByRole('button', { name: /Replace All Missions/i }).click()
  }

  /** Cancel the import in the confirmation dialog */
  async cancelImport() {
    await this.page.getByRole('button', { name: /Cancel/i }).click()
  }
}
