import { test, expect, type Page } from '@playwright/test';

// Helper function to create a new mission
async function createNewMission(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /New Mission/ }).first().click();
  await page.getByRole('button', { name: 'Create Mission' }).click();
  await page.waitForURL(/\/mission\/.+/);
  await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });
}

// Helper function to navigate to steerpoints tab
async function navigateToSteerpoints(page: Page): Promise<void> {
  await page.getByText('Steerpoints', { exact: true }).click();
  await page.waitForTimeout(500);
}

// Helper function to navigate to basic info tab
async function navigateToBasicInfo(page: Page): Promise<void> {
  await page.getByText('Basic Info', { exact: true }).click();
  await page.waitForTimeout(500);
}

// Helper function to select a departure airport
async function selectDepartureAirport(page: Page, airportName: string): Promise<void> {
  const depCard = page.locator('.n-card', { hasText: 'Departure' });
  const depAirportSelect = depCard.locator('.n-base-selection').first();
  await depAirportSelect.click();

  // Type to filter airports
  await page.waitForTimeout(300);
  const depAirportInput = depCard.locator('input').first();
  await depAirportInput.fill(airportName.slice(0, 2)); // Type first 2 chars
  await page.waitForTimeout(500);

  // Use keyboard to select the matching airport
  await depAirportInput.press('ArrowDown');
  await page.waitForTimeout(200);
  await depAirportInput.press('Enter');
  await page.waitForTimeout(1000); // Wait longer for airport selection to process and trigger steerpoint creation
}

// Helper function to add a custom steerpoint
async function addCustomSteerpoint(page: Page, name: string): Promise<void> {
  await navigateToSteerpoints(page);

  // Click the "+ Custom Steerpoint" button
  const addButton = page.getByRole('button', { name: '+ Custom Steerpoint' });
  await addButton.click();
  await page.waitForTimeout(500);

  // After clicking the button, a new waypoint card should appear
  // We need to wait for it and then fill in the fields
  // Waypoint cards are identified by having a .waypoint-seq element
  const waypointCards = page.locator('.waypoint-item');
  const newCardCount = await waypointCards.count();

  // Get the last card (the newly added one)
  const lastCard = waypointCards.nth(newCardCount - 1);

  // Fill in the waypoint name - first input in the card is the name
  const nameInput = lastCard.locator('input').first();
  await nameInput.waitFor({ state: 'visible' });
  await nameInput.fill(name);

  // Fill in some coordinates - lat/lon inputs don't have specific aria-labels
  // They're in the CoordinateField component
  const latInput = lastCard.locator('input').nth(2); // Third input (after name and type)
  await latInput.fill('32.000000');

  const lonInput = lastCard.locator('input').nth(3); // Fourth input
  await lonInput.fill('66.000000');

  await page.waitForTimeout(500);
}

// Helper function to verify steerpoint properties
async function verifySteerpointName(page: Page, index: number, expectedName: string): Promise<void> {
  await navigateToSteerpoints(page);

  // Wait for waypoint cards to be visible
  // Waypoint cards are wrapped in .waypoint-item divs
  const waypointCards = page.locator('.waypoint-item');
  await waypointCards.first().waitFor({ state: 'visible', timeout: 5000 });

  const card = waypointCards.nth(index);
  const nameInput = card.locator('input').first(); // First input in the card is the name
  await nameInput.waitFor({ state: 'visible' });

  // Get the input value
  const actualName = await nameInput.inputValue();
  expect(actualName).toBe(expectedName);
}

// Helper function to count steerpoints
async function getSteerpointCount(page: Page): Promise<number> {
  await navigateToSteerpoints(page);

  // Check if there's an empty state message
  const emptyStateError = page.locator('text="At least one steerpoint is required"');
  const isEmptyVisible = await emptyStateError.isVisible();

  if (isEmptyVisible) {
    return 0;
  }

  // Count waypoint cards - they are wrapped in .waypoint-item divs
  const waypointCards = page.locator('.waypoint-item');
  const count = await waypointCards.count();
  return count;
}

test.describe('Steerpoint Departure Airport Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should update existing default steerpoint when departure airport is selected', async ({ page }) => {
    await createNewMission(page);

    // Afghanistan theater has Kandahar as default, which creates an initial steerpoint
    const initialCount = await getSteerpointCount(page);
    expect(initialCount).toBe(1);

    // Verify the initial steerpoint is Kandahar (the default)
    await verifySteerpointName(page, 0, 'Kandahar');

    // Select a different departure airport
    await navigateToBasicInfo(page);

    // Clear the current selection first
    const depCard = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelect = depCard.locator('.n-base-selection').first();

    // Clear and re-select
    await depAirportSelect.click();
    await page.waitForTimeout(300);
    const depAirportInput = depCard.locator('input').first();
    await depAirportInput.clear();
    await depAirportInput.fill('Ba'); // Type first 2 chars - matches Bamyan first alphabetically
    await page.waitForTimeout(500);
    await depAirportInput.press('ArrowDown');
    await page.waitForTimeout(200);
    await depAirportInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify steerpoint count is still 1 (updated, not added)
    const newCount = await getSteerpointCount(page);
    expect(newCount).toBe(1);

    // Verify the steerpoint has been updated to the new airport name
    await verifySteerpointName(page, 0, 'Bamyan');
  });

  test('should create steerpoint when there are zero steerpoints (custom test with cleared waypoints)', async ({ page }) => {
    await createNewMission(page);

    // Afghanistan theater creates Kandahar as default steerpoint, so we need to remove it first
    await navigateToSteerpoints(page);

    // Remove the default steerpoint - waypoint cards are wrapped in .waypoint-item
    const waypointCard = page.locator('.waypoint-item').first();
    await waypointCard.waitFor({ state: 'visible' });
    const removeButton = waypointCard.locator('button').filter({ hasText: '' }).last(); // Delete button is the last button
    await removeButton.click();
    await page.waitForTimeout(500);

    // Verify no steerpoints now
    const emptyStateError = page.locator('text="At least one steerpoint is required"');
    await expect(emptyStateError).toBeVisible();

    // Select a departure airport - use "Sh" to select Shindand (a unique airport)
    await navigateToBasicInfo(page);
    await selectDepartureAirport(page, 'Shindand');

    // Verify steerpoint was created
    const newCount = await getSteerpointCount(page);
    expect(newCount).toBe(1);

    // Verify the steerpoint has the airport name
    await verifySteerpointName(page, 0, 'Shindand');
  });

  test('should preserve multiple steerpoints when departure airport is changed', async ({ page }) => {
    await createNewMission(page);

    // Afghanistan theater already creates Kandahar as steerpoint 1
    // Add a second custom steerpoint
    await addCustomSteerpoint(page, 'Custom Waypoint');

    // Verify we have 2 steerpoints
    const initialCount = await getSteerpointCount(page);
    expect(initialCount).toBe(2);

    // Store the original names
    await verifySteerpointName(page, 0, 'Kandahar');
    await verifySteerpointName(page, 1, 'Custom Waypoint');

    // Now change the departure airport
    await navigateToBasicInfo(page);

    const depCard = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelect = depCard.locator('.n-base-selection').first();

    // Clear and re-select
    await depAirportSelect.click();
    await page.waitForTimeout(300);
    const depAirportInput = depCard.locator('input').first();
    await depAirportInput.clear();
    await depAirportInput.fill('Ba'); // Type first 2 chars of Bagram
    await page.waitForTimeout(500);
    await depAirportInput.press('ArrowDown');
    await page.waitForTimeout(200);
    await depAirportInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify we still have 2 steerpoints (no changes)
    const finalCount = await getSteerpointCount(page);
    expect(finalCount).toBe(2);

    // Verify the steerpoints were NOT modified (preserved when 2+ exist)
    await verifySteerpointName(page, 0, 'Kandahar');
    await verifySteerpointName(page, 1, 'Custom Waypoint');
  });

  test('should handle clearing and re-selecting departure airport', async ({ page }) => {
    await createNewMission(page);

    // Afghanistan theater already creates Kandahar as steerpoint 1
    // Verify initial steerpoint
    await verifySteerpointName(page, 0, 'Kandahar');

    // Clear the departure airport
    await navigateToBasicInfo(page);
    const depCard = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelect = depCard.locator('.n-base-selection').first();

    // Click the clear button (x) if visible
    const clearButton = depAirportSelect.locator('.n-base-clear');
    const isClearVisible = await clearButton.isVisible();
    if (isClearVisible) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }

    // The steerpoint should still exist (clearing airport doesn't remove steerpoints)
    const countAfterClear = await getSteerpointCount(page);
    expect(countAfterClear).toBe(1);

    // Select a different airport - do it inline since we're already on Basic Info
    await navigateToBasicInfo(page); // Ensure we're on Basic Info
    const depCardAgain = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelectAgain = depCardAgain.locator('.n-base-selection').first();
    await depAirportSelectAgain.click();

    await page.waitForTimeout(300);
    const depAirportInput = depCardAgain.locator('input').first();
    await depAirportInput.fill('Sh'); // Type first 2 chars of Shindand
    await page.waitForTimeout(500);
    await depAirportInput.press('ArrowDown');
    await page.waitForTimeout(200);
    await depAirportInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify steerpoint was updated, not added
    const finalCount = await getSteerpointCount(page);
    expect(finalCount).toBe(1);
    await verifySteerpointName(page, 0, 'Shindand');
  });

  test('should preserve custom steerpoint properties when updating from departure airport', async ({ page }) => {
    await createNewMission(page);

    // Afghanistan theater already creates Kandahar as steerpoint 1
    // Navigate to steerpoints and modify some properties
    await navigateToSteerpoints(page);
    const waypointCard = page.locator('.waypoint-item').first();
    await waypointCard.waitFor({ state: 'visible' });

    // Change the altitude - use aria-label selector
    const altitudeInput = waypointCard.locator('input[aria-label="Altitude"]');
    const isAltitudeVisible = await altitudeInput.isVisible();
    if (isAltitudeVisible) {
      await altitudeInput.clear();
      await altitudeInput.fill('5000');
    }

    // Add a TOT (Time on Target) - find the TOT form item
    const totFormItem = waypointCard.locator('.n-form-item').filter({ hasText: 'TOT' });
    const totInput = totFormItem.locator('input');
    const isTotVisible = await totInput.isVisible();
    if (isTotVisible) {
      await totInput.fill('12:30:00');
    }

    await page.waitForTimeout(500);

    // Change departure airport
    await navigateToBasicInfo(page);

    const depCard = page.locator('.n-card', { hasText: 'Departure' });
    const depAirportSelect = depCard.locator('.n-base-selection').first();

    // Clear and re-select
    await depAirportSelect.click();
    await page.waitForTimeout(300);
    const depAirportInput = depCard.locator('input').first();
    await depAirportInput.clear();
    await depAirportInput.fill('Ba'); // Type first 2 chars of Bagram
    await page.waitForTimeout(500);
    await depAirportInput.press('ArrowDown');
    await page.waitForTimeout(200);
    await depAirportInput.press('Enter');
    await page.waitForTimeout(1000);

    // Verify the steerpoint was updated but some properties preserved
    await navigateToSteerpoints(page);
    const updatedCard = page.locator('.waypoint-item').first();
    await updatedCard.waitFor({ state: 'visible' });

    // Name should be updated - first input in the card is the name
    const updatedNameInput = updatedCard.locator('input').first();
    const name = await updatedNameInput.inputValue();
    expect(name).toBe('Bamyan'); // "Ba" matches Bamyan first alphabetically

    // TOT should be preserved - it's the 6th input (name, type, lat, lon, alt, speed, TOT)
    // Actually TOT is the last input in the waypoint fields
    const totInputAfter = updatedCard.locator('input').nth(5); // 6th input (0-indexed)
    const isTotVisibleAfter = await totInputAfter.isVisible();
    if (isTotVisibleAfter) {
      const tot = await totInputAfter.inputValue();
      expect(tot).toBe('12:30:00');
    }
  });
});