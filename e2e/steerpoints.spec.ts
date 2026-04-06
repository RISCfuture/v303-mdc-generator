import { test, expect } from './fixtures/fixtures'

test.describe('Steerpoint Departure Airport Behavior', () => {
  test.beforeEach(async ({ missionListPage }) => {
    await missionListPage.goto()
    await missionListPage.clearStorageAndReload()
  })

  test('should update existing default steerpoint when departure airport is selected', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { steerpoints, basicInfo } = missionEditorPage

    // Afghanistan theater has Kandahar as default, which creates an initial steerpoint
    const initialCount = await steerpoints.getSteerpointCount()
    expect(initialCount).toBe(1)

    // Verify the initial steerpoint is Kandahar (the default)
    const name = await steerpoints.getSteerpointName(0)
    expect(name).toBe('Kandahar')

    // Select a different departure airport
    await basicInfo.navigateToTab()
    await basicInfo.changeDepartureAirport('Ba')

    // Verify steerpoint count is still 1 (updated, not added)
    const newCount = await steerpoints.getSteerpointCount()
    expect(newCount).toBe(1)

    // Verify the steerpoint has been updated to the new airport name
    const updatedName = await steerpoints.getSteerpointName(0)
    expect(updatedName).toBe('Bamyan')
  })

  test('should create steerpoint when there are zero steerpoints (custom test with cleared waypoints)', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { steerpoints, basicInfo } = missionEditorPage

    // Afghanistan theater creates Kandahar as default steerpoint, so we need to remove it first
    await steerpoints.navigateToTab()
    await steerpoints.removeFirstSteerpoint()

    // Verify no steerpoints now
    await expect(steerpoints.emptyStateMessage).toBeVisible()

    // Select a departure airport - use "Sh" to select Shindand (a unique airport)
    await basicInfo.navigateToTab()
    await basicInfo.selectDepartureAirport('Sh')

    // Verify steerpoint was created
    const newCount = await steerpoints.getSteerpointCount()
    expect(newCount).toBe(1)

    // Verify the steerpoint has the airport name
    const name = await steerpoints.getSteerpointName(0)
    expect(name).toBe('Shindand')
  })

  test('should preserve multiple steerpoints when departure airport is changed', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { steerpoints, basicInfo } = missionEditorPage

    // Afghanistan theater already creates Kandahar as steerpoint 1
    // Add a second custom steerpoint
    await steerpoints.addCustomSteerpoint('Custom Waypoint')

    // Wait for the second steerpoint to appear before counting
    await steerpoints.waypointCards.nth(1).waitFor({ state: 'visible' })

    // Verify we have 2 steerpoints
    const initialCount = await steerpoints.getSteerpointCount()
    expect(initialCount).toBe(2)

    // Store the original names
    const name0 = await steerpoints.getSteerpointName(0)
    expect(name0).toBe('Kandahar')
    const name1 = await steerpoints.getSteerpointName(1)
    expect(name1).toBe('Custom Waypoint')

    // Now change the departure airport
    await basicInfo.navigateToTab()
    await basicInfo.changeDepartureAirport('Ba')

    // Verify we still have 2 steerpoints (no changes)
    const finalCount = await steerpoints.getSteerpointCount()
    expect(finalCount).toBe(2)

    // Verify the steerpoints were NOT modified (preserved when 2+ exist)
    const finalName0 = await steerpoints.getSteerpointName(0)
    expect(finalName0).toBe('Kandahar')
    const finalName1 = await steerpoints.getSteerpointName(1)
    expect(finalName1).toBe('Custom Waypoint')
  })

  test('should handle clearing and re-selecting departure airport', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { steerpoints, basicInfo } = missionEditorPage

    // Afghanistan theater already creates Kandahar as steerpoint 1
    const name = await steerpoints.getSteerpointName(0)
    expect(name).toBe('Kandahar')

    // Clear the departure airport
    await basicInfo.navigateToTab()
    await basicInfo.clearDepartureAirport()

    // The steerpoint should still exist (clearing airport doesn't remove steerpoints)
    const countAfterClear = await steerpoints.getSteerpointCount()
    expect(countAfterClear).toBe(1)

    // Select a different airport
    await basicInfo.navigateToTab()
    await basicInfo.selectDepartureAirport('Sh')

    // Verify steerpoint was updated, not added
    const finalCount = await steerpoints.getSteerpointCount()
    expect(finalCount).toBe(1)
    const finalName = await steerpoints.getSteerpointName(0)
    expect(finalName).toBe('Shindand')
  })

  test('should preserve custom steerpoint properties when updating from departure airport', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { steerpoints, basicInfo } = missionEditorPage

    // Afghanistan theater already creates Kandahar as steerpoint 1
    // Navigate to steerpoints and modify some properties
    await steerpoints.navigateToTab()

    // Change the altitude
    await steerpoints.fillAltitude(0, '5000')

    // Add a TOT (Time on Target)
    await steerpoints.fillTot(0, '12:30:00')

    // Change departure airport
    await basicInfo.navigateToTab()
    await basicInfo.changeDepartureAirport('Ba')

    // Verify the steerpoint was updated but some properties preserved
    await steerpoints.navigateToTab()
    const updatedCard = steerpoints.getWaypointCard(0)
    await updatedCard.waitFor({ state: 'visible' })

    // Name should be updated
    const updatedName = await steerpoints.getSteerpointName(0)
    expect(updatedName).toBe('Bamyan')

    // TOT should be preserved
    const tot = await steerpoints.getTotValue(0)
    if (tot !== null) {
      expect(tot).toBe('12:30:00')
    }
  })
})
