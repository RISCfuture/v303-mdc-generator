import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { test, expect } from './fixtures/fixtures'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Mission List Export/Import', () => {
  test.beforeEach(async ({ missionListPage }) => {
    await missionListPage.goto()
    await missionListPage.clearAllStorageAndReload()
    await missionListPage.disableAnimations()
  })

  test('should export missions and download JSON file', async ({ missionListPage }) => {
    await missionListPage.goto()

    // Create two missions
    for (let i = 0; i < 2; i++) {
      await missionListPage.createMission()
      await missionListPage.goBackToMissionList()
    }

    // Export and verify download
    const download = await missionListPage.exportMissions()
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/^v303-missions-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('should show import confirmation modal when importing valid backup', async ({
    missionListPage,
  }) => {
    await missionListPage.goto()

    // Create a test mission first to export
    await missionListPage.createMission('Test Mission for Export')
    await missionListPage.goBackToMissionList()

    // Export the mission
    const download = await missionListPage.exportMissions()
    const downloadPath = await download.path()

    // Import the file
    await expect(missionListPage.importMissionsButton).toBeVisible()
    await missionListPage.importMissionsFromFile(downloadPath!)

    // Wait for import modal to appear
    await expect(missionListPage.importDialogTitle).toBeVisible()

    // Verify warning message
    await expect(
      missionListPage.page.getByText(/This will delete all existing missions/),
    ).toBeVisible()

    // Verify import details are shown
    await expect(missionListPage.page.getByText(/Missions to import:/i)).toBeVisible()
    await expect(missionListPage.page.getByText(/Exported:/i)).toBeVisible()
    await expect(missionListPage.page.getByText(/File size:/i)).toBeVisible()
  })

  test('should successfully import missions and replace existing ones', async ({
    missionListPage,
  }) => {
    await missionListPage.goto()

    // Create two original missions
    for (let i = 0; i < 2; i++) {
      await missionListPage.createMission(`Original Mission ${i + 1}`)
      await missionListPage.goBackToMissionList()
    }

    // Verify original missions exist
    await expect(missionListPage.missionTable.getByText('Original Mission 1')).toBeVisible()
    await expect(missionListPage.missionTable.getByText('Original Mission 2')).toBeVisible()

    // Export missions
    const download = await missionListPage.exportMissions()
    const downloadPath = await download.path()

    // Create a different mission
    await missionListPage.createMission('New Mission to be Replaced')
    await missionListPage.goBackToMissionList()

    // Verify we now have 3 missions
    await expect(missionListPage.missionTable.getByText('New Mission to be Replaced')).toBeVisible()

    // Import the backup (which has 2 missions)
    await missionListPage.importMissionsFromFile(downloadPath!)

    // Wait for confirmation modal
    await expect(missionListPage.importDialogTitle).toBeVisible()

    // Confirm import
    await missionListPage.confirmImport()

    // Wait for modal to close
    await expect(missionListPage.importDialogTitle).not.toBeVisible()

    // Verify we're back to the original 2 missions
    await expect(missionListPage.missionTable.getByText('Original Mission 1')).toBeVisible()
    await expect(missionListPage.missionTable.getByText('Original Mission 2')).toBeVisible()
    await expect(
      missionListPage.missionTable.getByText('New Mission to be Replaced'),
    ).not.toBeVisible()
  })

  test('should cancel import when cancel button is clicked', async ({ missionListPage }) => {
    await missionListPage.goto()

    // Create a mission and export it
    await missionListPage.createMission()
    await missionListPage.goBackToMissionList()

    const download = await missionListPage.exportMissions()
    const downloadPath = await download.path()

    // Try to import
    await missionListPage.importMissionsFromFile(downloadPath!)

    // Wait for confirmation modal
    await expect(missionListPage.importDialogTitle).toBeVisible()

    // Click cancel
    await missionListPage.cancelImport()

    // Modal should close
    await expect(missionListPage.importDialogTitle).not.toBeVisible()

    // Original mission should still exist
    await expect(missionListPage.missionTable).toBeVisible()
  })

  test('should show error message for invalid backup file', async ({ missionListPage }) => {
    await missionListPage.goto()

    // Create an invalid backup file
    const invalidBackupPath = path.join(__dirname, 'invalid-backup.json')
    fs.writeFileSync(invalidBackupPath, JSON.stringify({ invalid: 'data', version: 1 }))

    // Try to import invalid file
    await missionListPage.importMissionsFromFile(invalidBackupPath)

    // Should see error message
    await expect(missionListPage.page.getByText(/Failed to parse backup file/i)).toBeVisible()

    // Clean up
    fs.unlinkSync(invalidBackupPath)
  })

  test('should handle multiple missions and images in export', async ({
    page,
    missionListPage,
  }) => {
    await missionListPage.goto()

    // Create 3 missions with different names
    const missionNames = ['SEAD Mission', 'CAS Mission', 'CAP Mission']
    for (const name of missionNames) {
      await missionListPage.createMission(name)
      await missionListPage.goBackToMissionList()
    }

    // Export
    const download = await missionListPage.exportMissions()
    const downloadPath = await download.path()

    // Clear everything and import
    await page.evaluate(() => {
      localStorage.clear()
      indexedDB.deleteDatabase('v303-mdc-images')
    })
    await page.reload()

    // Import
    await missionListPage.importMissionsFromFile(downloadPath!)

    // Wait for import modal to appear
    await expect(missionListPage.importDialogTitle).toBeVisible()

    await missionListPage.confirmImport()

    // Wait for modal to close
    await expect(missionListPage.importDialogTitle).not.toBeVisible()

    // Verify all missions are restored
    for (const name of missionNames) {
      await expect(missionListPage.missionTable.getByText(name)).toBeVisible()
    }
  })
})
