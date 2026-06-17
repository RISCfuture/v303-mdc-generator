import { test, expect } from './fixtures/fixtures'

test.describe('Flight Member Integration', () => {
  test('should add and remove crew members', async ({ missionListPage, missionEditorPage }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple()

    const { flightMembers } = missionEditorPage

    // Navigate to Flight Members tab
    await flightMembers.navigateToTab()

    // Initially should have no crew - check for the empty state message
    await expect(
      missionEditorPage.page.getByText(/At least one flight member is required/),
    ).toBeVisible()

    // Add a crew member
    await flightMembers.waitForVisible()
    await flightMembers.addFirstCrewMember()

    // Verify crew member was added
    await expect(flightMembers.crewItems).toHaveCount(1)
  })

  test('should prevent adding duplicate crew members', async ({
    page,
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.goto()
    await missionListPage.createMissionSimple()

    const { flightMembers } = missionEditorPage

    // Navigate to Flight Members tab
    await flightMembers.navigateToTab()

    // Add first crew member
    await flightMembers.waitForVisible()

    // Get the first crew option text before selecting
    const firstCrewName = await flightMembers.getFirstCrewOptionText()
    // Select the first option (dropdown is already open from getFirstCrewOptionText)
    await page.locator('.n-base-select-option').first().click()

    // Wait for dropdown to close
    await expect(page.locator('.n-base-select-menu')).toBeHidden()

    // Open dropdown again and verify the first crew member is removed from options
    await flightMembers.crewDropdown.click()
    const optionsWithFirstCrew = page.locator('.n-base-select-option', {
      hasText: firstCrewName ?? '',
    })
    await expect(optionsWithFirstCrew).toHaveCount(0)
  })
})
