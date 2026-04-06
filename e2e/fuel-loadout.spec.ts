import { test, expect } from './fixtures/fixtures'

/**
 * F-16C_50 (v93 squadron):
 *   internalFuel = 7,163 lbs
 *   emptyWeight = 19,899 lbs
 *
 * Station 5 fuel tank: FT300 ({8A0BE8AE-...}), additionalFuel = 2,006 lbs
 * Station 4/6 fuel tank: FT370 ({F376DBEE-...}), additionalFuel = 2,475 lbs
 */

test.describe('Fuel & Loadout Integration', () => {
  test.beforeEach(async ({ missionListPage }) => {
    await missionListPage.goto()
    await missionListPage.clearStorageAndReload()
  })

  test('fuel weight and gross weight update when adding fuel tanks and adjusting slider', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { toldFuel, loadout } = missionEditorPage

    // Navigate to TOLD & Fuel tab to check baseline values
    await toldFuel.navigateToTab()
    await toldFuel.waitForVisible()

    // Baseline: no external tanks, 100% fuel load
    // Takeoff Fuel should show internal fuel only: 7,163 lbs
    await expect(toldFuel.takeoffFuelInput).toHaveValue('7,163')

    // Gross Weight = emptyWeight (19,899) + 0 loadout + 7,163 fuel = 27,062
    await expect(toldFuel.grossWeightInput).toHaveValue('27,062')

    // Navigate to Loadout tab and add a centerline fuel tank (station 5 = FT300)
    await loadout.navigateToTab()
    await loadout.waitForVisible()

    // Select "Fuel tank 300 gal" on station 5 (label "5")
    await loadout.selectStationMunition('STA 5', 'Fuel tank 300')

    // The fuel weight display should now include external fuel
    // Internal (7,163) + FT300 external (2,006) = 9,169 lbs
    await expect(loadout.loadoutCard.getByText('9,169')).toBeVisible()

    // Verify on TOLD & Fuel tab too
    await toldFuel.navigateToTab()
    await expect(toldFuel.takeoffFuelInput).toHaveValue('9,169')

    // Gross Weight should increase: 19,899 + FT300 empty tank weight (383) + 9,169 fuel = 29,451
    await expect(toldFuel.grossWeightInput).toHaveValue('29,451')

    // Now go back to Loadout and adjust the fuel slider to 50%
    await loadout.navigateToTab()
    await loadout.setFuelPercentage(50)

    // The percentage display should show 50%
    await expect(loadout.loadoutCard.getByText('50%')).toBeVisible()

    // At 50% slider: internal fuel = 7,163 * 50% = 3,581.5 -> rounds to 3,582
    // External fuel = 2,006 (always full)
    // Total = 3,582 + 2,006 = 5,588
    await expect(loadout.loadoutCard.getByText('5,588')).toBeVisible()

    // Verify TOLD & Fuel tab shows updated values
    await toldFuel.navigateToTab()
    await expect(toldFuel.takeoffFuelInput).toHaveValue('5,588')

    // Gross weight: 19,899 + 383 (empty tank) + 5,588 (fuel) = 25,870
    await expect(toldFuel.grossWeightInput).toHaveValue('25,870')
  })

  test('fuel weight with external tanks exports correctly in PDF', async ({
    missionListPage,
    missionEditorPage,
  }) => {
    await missionListPage.createMissionSimple()

    const { basicInfo, flightMembers, briefing, toldFuel, loadout, exportControls } =
      missionEditorPage

    // Fill in required fields for export
    await basicInfo.setMissionType('CAS')

    // Add crew member
    await flightMembers.navigateToTab()
    await flightMembers.waitForVisible()
    await flightMembers.addFirstCrewMember()
    await flightMembers.setCallsign('VIPER')
    await flightMembers.setLink16Prefix('VR')

    // Set departure/recovery airports
    await basicInfo.navigateToTab()
    await basicInfo.selectDepartureAirport('KA')
    await basicInfo.selectDepartureRunway()
    await basicInfo.selectRecoveryAirport('KA')
    await basicInfo.selectRecoveryRunway()

    // Add remarks
    await briefing.navigateToTab()
    await briefing.fillRemarks('Fuel export test')

    // Set TOLD speeds
    await toldFuel.navigateToTab()
    await toldFuel.waitForVisible()
    await toldFuel.fillRotationSpeed('120')
    await toldFuel.fillRefusalSpeed('100')

    // Add fuel tank on Loadout tab
    await loadout.navigateToTab()
    await loadout.waitForVisible()
    await loadout.selectStationMunition('STA 5', 'Fuel tank 300')

    // Verify fuel weight includes external tank
    await expect(loadout.loadoutCard.getByText('9,169')).toBeVisible()

    // Export PDF -- the PDF should now use calculateTakeoffFuel (not stale mission.fuel.takeoff)
    await expect(exportControls.exportPdfButton).toBeEnabled()
    const download = await exportControls.exportPdf()
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })
})
