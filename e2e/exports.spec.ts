import { test, expect } from './fixtures/fixtures'

test.describe('Mission Export Operations', () => {
  test('should trigger PDF download when clicking Export PDF', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple('Export Test Mission')

    await missionEditorPage.fillRequiredFields()

    await expect(missionEditorPage.exportControls.exportPdfButton).toBeEnabled()

    const download = await missionEditorPage.exportControls.exportPdf()

    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('should trigger DCS-DTC JSON download via Export MDC submenu', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple('MDC Export Test')

    await missionEditorPage.fillRequiredFields()

    await expect(missionEditorPage.exportControls.exportMdcButton).toBeEnabled()

    const downloadPromise = missionEditorPage.page.waitForEvent('download')
    await missionEditorPage.exportControls.exportMdcFormat('DCS-DTC')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })

  test('should trigger JAFDTC download via Export MDC submenu', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple('JAFDTC Export Test')

    await missionEditorPage.fillRequiredFields()

    await expect(missionEditorPage.exportControls.exportMdcButton).toBeEnabled()

    const downloadPromise = missionEditorPage.page.waitForEvent('download')
    await missionEditorPage.exportControls.exportMdcFormat('JAFDTC')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.jafdtc$/)
  })

  test('should trigger DCS ME download via Export MDC submenu', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple('DCS ME Export Test')

    await missionEditorPage.fillRequiredFields()

    await expect(missionEditorPage.exportControls.exportMdcButton).toBeEnabled()

    const downloadPromise = missionEditorPage.page.waitForEvent('download')
    await missionEditorPage.exportControls.exportMdcFormat('DCS Mission Editor')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.dtc$/)
  })

  test('should show Export MDC button with format submenus for F-16C squadron', async ({
    page,
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple()

    await missionEditorPage.fillRequiredFields()

    const { exportControls } = missionEditorPage

    await expect(exportControls.exportMdcButton).toBeVisible()
    await expect(exportControls.exportMdcButton).toBeEnabled()

    // Open dropdown and hover first crew member to open submenu
    await exportControls.openMdcSubmenu()

    // F-16C should show all 3 format options in the submenu
    await expect(exportControls.getFormatOption('DCS-DTC')).toBeVisible()
    await expect(exportControls.getFormatOption('JAFDTC')).toBeVisible()
    await expect(exportControls.getFormatOption('DCS Mission Editor')).toBeVisible()

    // Close the dropdown
    await page.keyboard.press('Escape')
  })

  test('should export PDF with embedded images in remarks', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple()

    await missionEditorPage.fillRequiredFields()

    // Navigate to Briefing tab to add image
    await missionEditorPage.briefing.navigateToTab()

    // Create a simple test image (1x1 red pixel PNG)
    const testImageBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    const testImageBuffer = Buffer.from(testImageBase64, 'base64')

    await missionEditorPage.briefing.uploadImage('test-image.png', 'image/png', testImageBuffer)

    await expect(missionEditorPage.exportControls.exportPdfButton).toBeEnabled()

    const download = await missionEditorPage.exportControls.exportPdf()

    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })
})
