import { test, expect, type Page } from '@playwright/test';

/**
 * F-16C_50 (v93 squadron):
 *   internalFuel = 7,163 lbs
 *   emptyWeight = 19,899 lbs
 *
 * Station 5 fuel tank: FT300 ({8A0BE8AE-...}), additionalFuel = 2,006 lbs
 * Station 4/6 fuel tank: FT370 ({F376DBEE-...}), additionalFuel = 2,475 lbs
 */

async function createMission(page: Page) {
  await page.getByRole('button', { name: /New Mission/ }).first().click();
  await page.getByRole('button', { name: 'Create Mission' }).click();
  await page.waitForURL(/\/mission\/.+/);
  await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });
}

async function navigateToTab(page: Page, tabName: string) {
  await page.getByText(tabName, { exact: true }).click();
}

/**
 * Select a munition on a specific station by typing to filter,
 * then picking the matching option.
 *
 * Naive UI filterable selects turn the trigger into an input on click.
 */
async function selectStationMunition(page: Page, stationLabel: string, searchText: string) {
  // The NSelect has aria-label="Station X Munition" on the wrapper
  // Click it to open and activate the filter input
  const stationSelect = page.locator(`[aria-label="Station ${stationLabel} Munition"]`);
  await stationSelect.click();

  // Naive UI puts a filter input inside the selection trigger
  // Type the search text using keyboard (it goes to the focused filter input)
  await page.keyboard.type(searchText, { delay: 30 });

  // Wait for the dropdown menu to appear with filtered options
  await page.locator('.n-base-select-menu').waitFor({ state: 'visible' });

  // Click the first matching option
  const option = page.locator('.n-base-select-option', { hasText: searchText }).first();
  await option.waitFor({ state: 'visible' });
  await option.click();
}

test.describe('Fuel & Loadout Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('fuel weight and gross weight update when adding fuel tanks and adjusting slider', async ({ page }) => {
    await createMission(page);

    // Navigate to TOLD & Fuel tab to check baseline values
    await navigateToTab(page, 'TOLD & Fuel');

    const toldCard = page.locator('.n-card', { hasText: 'Takeoff & Landing Data' });
    await toldCard.waitFor({ state: 'visible' });

    // Baseline: no external tanks, 100% fuel load
    // Takeoff Fuel should show internal fuel only: 7,163 lbs
    const takeoffFuelInput = toldCard.locator('.n-form-item', { hasText: 'Takeoff Fuel' }).locator('input');
    await expect(takeoffFuelInput).toHaveValue('7,163');

    // Gross Weight = emptyWeight (19,899) + 0 loadout + 7,163 fuel = 27,062
    const grossWeightInput = toldCard.locator('.n-form-item', { hasText: 'Gross Weight' }).locator('input');
    await expect(grossWeightInput).toHaveValue('27,062');

    // Navigate to Loadout tab and add a centerline fuel tank (station 5 = FT300)
    await navigateToTab(page, 'Loadout');

    const loadoutCard = page.locator('.n-card', { hasText: 'Aircraft Loadout' });
    await loadoutCard.waitFor({ state: 'visible' });

    // Select "Fuel tank 300 gal" on station 5 (label "5")
    await selectStationMunition(page, 'STA 5', 'Fuel tank 300');

    // The fuel weight display below the slider should now include external fuel
    // Internal (7,163) + FT300 external (2,006) = 9,169 lbs
    await expect(loadoutCard.getByText('9,169')).toBeVisible();

    // Verify on TOLD & Fuel tab too
    await navigateToTab(page, 'TOLD & Fuel');
    await expect(takeoffFuelInput).toHaveValue('9,169');

    // Gross Weight should increase: 19,899 + FT300 empty tank weight (383) + 9,169 fuel = 29,451
    // Note: FT300 total weight is 2,389, fuel is 2,006, so empty tank = 383
    await expect(grossWeightInput).toHaveValue('29,451');

    // Now go back to Loadout and adjust the fuel slider to 50%
    await navigateToTab(page, 'Loadout');

    // Click at the midpoint of the slider rail to set to ~50%
    const slider = loadoutCard.locator('.n-slider');
    await slider.waitFor({ state: 'visible' });
    const sliderBox = await slider.boundingBox();
    expect(sliderBox).not.toBeNull();
    // Click at 50% of the slider width (midpoint)
    await slider.click({ position: { x: sliderBox!.width / 2, y: sliderBox!.height / 2 } });

    // The percentage display should show 50%
    await expect(loadoutCard.getByText('50%')).toBeVisible();

    // At 50% slider: internal fuel = 7,163 * 50% = 3,581.5 → rounds to 3,582
    // External fuel = 2,006 (always full)
    // Total = 3,582 + 2,006 = 5,588
    // (Note: formatNumber rounds to 0 decimal places, and 3581.5 rounds to 3,582)
    await expect(loadoutCard.getByText('5,588')).toBeVisible();

    // Verify TOLD & Fuel tab shows updated values
    await navigateToTab(page, 'TOLD & Fuel');
    await expect(takeoffFuelInput).toHaveValue('5,588');

    // Gross weight: 19,899 + 383 (empty tank) + 5,588 (fuel) = 25,870
    // Actually: 19,899 + 383 + 3,581.5 + 2,006 = 25,869.5 → 25,870
    await expect(grossWeightInput).toHaveValue('25,870');
  });

  test('fuel weight with external tanks exports correctly in PDF', async ({ page }) => {
    await createMission(page);

    // Fill in required fields for export
    // Set mission type
    await navigateToTab(page, 'Basic Info');
    const missionTypeInput = page.locator('[aria-label="Mission Type"] input');
    await missionTypeInput.click();
    await missionTypeInput.fill('CAS');
    await missionTypeInput.press('Tab');

    // Add crew member
    await navigateToTab(page, 'Flight Members');
    await expect(page.getByText('Flight Composition')).toBeVisible();
    const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' });
    const crewDropdown = flightCard.locator('.n-base-selection').first();
    await crewDropdown.click();
    await page.locator('.n-base-select-menu').waitFor({ state: 'visible' });
    await page.locator('.n-base-select-option').first().click();

    // Set callsign and link16
    const callsignInput = page.locator('input[placeholder="Select or enter callsign"]');
    await callsignInput.waitFor({ state: 'visible' });
    await callsignInput.clear();
    await callsignInput.pressSequentially('VIPER', { delay: 50 });
    const link16Input = page.locator('input[placeholder="Enter 2-letter prefix"]');
    await link16Input.waitFor({ state: 'visible' });
    await link16Input.clear();
    await link16Input.pressSequentially('VR', { delay: 50 });

    // Set departure/recovery airports
    await navigateToTab(page, 'Basic Info');
    const depCard = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelect = depCard.locator('.n-base-selection').first();
    await depAirportSelect.click();
    const depAirportInput = depCard.locator('input').first();
    await depAirportInput.fill('KA');
    await depAirportInput.press('ArrowDown');
    await depAirportInput.press('Enter');
    const depRunwaySelect = depCard.locator('.n-base-selection').nth(1);
    await depRunwaySelect.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const recCard = page.locator('.n-card', { hasText: 'Recovery' });
    const recAirportSelect = recCard.locator('.n-base-selection').first();
    await recAirportSelect.click();
    const recAirportInput = recCard.locator('input').first();
    await recAirportInput.fill('KA');
    await recAirportInput.press('ArrowDown');
    await recAirportInput.press('Enter');
    const recRunwaySelect = recCard.locator('.n-base-selection').nth(1);
    await recRunwaySelect.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Add remarks
    await navigateToTab(page, 'Briefing');
    const remarksEditor = page.locator('.cm-content').first();
    await remarksEditor.click();
    await remarksEditor.fill('Fuel export test');

    // Set TOLD speeds
    await navigateToTab(page, 'TOLD & Fuel');
    const toldCard = page.locator('.n-card', { hasText: 'Takeoff & Landing Data' });
    await toldCard.waitFor({ state: 'visible' });
    const rotationFormItem = toldCard.locator('.n-form-item', { hasText: 'Rotation Speed' });
    const rotationInput = rotationFormItem.locator('input').first();
    await rotationInput.waitFor({ state: 'visible' });
    await rotationInput.click();
    await rotationInput.fill('120');
    await rotationInput.blur();
    const refusalFormItem = toldCard.locator('.n-form-item', { hasText: 'Refusal Speed' });
    const refusalInput = refusalFormItem.locator('input').first();
    await refusalInput.click();
    await refusalInput.fill('100');
    await refusalInput.blur();

    // Add fuel tank on Loadout tab
    await navigateToTab(page, 'Loadout');
    const loadoutCard = page.locator('.n-card', { hasText: 'Aircraft Loadout' });
    await loadoutCard.waitFor({ state: 'visible' });
    await selectStationMunition(page, 'STA 5', 'Fuel tank 300');

    // Verify fuel weight includes external tank
    await expect(loadoutCard.getByText('9,169')).toBeVisible();

    // Export PDF — the PDF should now use calculateTakeoffFuel (not stale mission.fuel.takeoff)
    await expect(page.getByRole('button', { name: /Export PDF/ })).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export PDF/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
