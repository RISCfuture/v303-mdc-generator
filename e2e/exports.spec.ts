import { test, expect, type Page } from '@playwright/test';

// Helper function to add a steerpoint with valid coordinates to enable PDF export
async function addValidSteerpoint(page: Page) {
  // Wait for the mission editor to load by checking for the Basic Info tab
  await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });

  await page.getByText('Steerpoints', { exact: true }).click();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /Custom Steerpoint/ }).click();

  // Wait for the waypoint to be added
  await page.waitForTimeout(1000);

  // Fill in the waypoint name - find the first visible input with aria-label "Name"
  const waypointNameInput = page.locator('[aria-label="Name"] input').first();
  await waypointNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await waypointNameInput.click();
  await waypointNameInput.pressSequentially('WP1', { delay: 50 });
  await waypointNameInput.blur(); // Trigger blur to save
  await page.waitForTimeout(300);

  // Fill in coordinates using the CoordinateField component
  // Find the coordinate input within the coordinate field
  const coordInput = page.locator('.coordinate-input input').first();
  await coordInput.waitFor({ state: 'visible', timeout: 10000 });
  await coordInput.click();
  await coordInput.fill("N 33°30.346', E 065°50.859'");
  await coordInput.blur();
  await page.waitForTimeout(300);

  const altInput = page.locator('[aria-label="Altitude"] input').first();
  await altInput.click();
  await altInput.pressSequentially('5000', { delay: 30 });
  await altInput.blur();
  await page.waitForTimeout(300);
}

// Helper function to set mission type (required field)
async function setMissionType(page: Page, type: string = 'CAS') {
  // Navigate to Basic Info tab if not already there
  await page.getByText('Basic Info', { exact: true }).click();
  await page.waitForTimeout(200);

  // Fill in the Mission Type field (it's an autocomplete)
  const missionTypeInput = page.locator('[aria-label="Mission Type"] input');
  await missionTypeInput.click();
  await missionTypeInput.fill(type);
  // Press Tab to commit the value and move to next field
  await missionTypeInput.press('Tab');
  await page.waitForTimeout(200);
}

// Helper function to fill in all required fields for a complete/exportable mission
async function fillRequiredFields(page: Page) {
  // Navigate to Basic Info tab
  await page.getByText('Basic Info', { exact: true }).click();
  await page.waitForTimeout(200);

  // Set mission type (required)
  await setMissionType(page, 'CAS');

  // Navigate to Flight Members tab
  await page.getByText('Flight Members', { exact: true }).click();
  await page.waitForTimeout(500);

  // Add at least one crew member FIRST (this may auto-populate callsign/link16)
  await expect(page.getByText('Flight Composition')).toBeVisible();
  const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' });
  const crewDropdown = flightCard.locator('.n-base-selection').first();
  await crewDropdown.click();
  await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  await page.locator('.n-base-select-option').first().click();
  await page.waitForTimeout(500);

  // Now set Flight Callsign and Link16 Prefix (overriding crew defaults)
  const callsignInput = page.locator('input[placeholder="Select or enter callsign"]');
  await callsignInput.waitFor({ state: 'visible', timeout: 5000 });
  await callsignInput.clear();
  await callsignInput.pressSequentially('VIPER', { delay: 50 });
  await page.waitForTimeout(200);

  const link16Input = page.locator('input[placeholder="Enter 2-letter prefix"]');
  await link16Input.waitFor({ state: 'visible', timeout: 5000 });
  await link16Input.clear();
  await link16Input.pressSequentially('VR', { delay: 50 });
  await page.waitForTimeout(200);

  // Stay on Basic Info tab to fill in departure/recovery fields
  await page.getByText('Basic Info', { exact: true }).click();
  await page.waitForTimeout(500);

  // Fill in departure airport (required) - find within the "Departure" card
  const depCard = page.locator('.n-card', { hasText: 'Departure' });
  const depAirportSelect = depCard.locator('.n-base-selection').first();
  await depAirportSelect.click();

  // Type to filter airports - the input appears after clicking
  await page.waitForTimeout(300);
  const depAirportInput = depCard.locator('input').first();
  await depAirportInput.fill('KA');
  await page.waitForTimeout(500);

  // Click first option - use keyboard to select to avoid timing issues
  await depAirportInput.press('ArrowDown');
  await page.waitForTimeout(200);
  await depAirportInput.press('Enter');
  await page.waitForTimeout(800); // Wait for airport selection to process

  // Fill in departure runway (required)
  const depRunwaySelect = depCard.locator('.n-base-selection').nth(1);
  await depRunwaySelect.click();
  await page.waitForTimeout(500);

  // Use keyboard to select first runway option
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Fill in recovery airport (required) - find within the "Recovery" card
  const recCard = page.locator('.n-card', { hasText: 'Recovery' });
  const recAirportSelect = recCard.locator('.n-base-selection').first();
  await recAirportSelect.click();

  // Type to filter airports - the input appears after clicking
  await page.waitForTimeout(300);
  const recAirportInput = recCard.locator('input').first();
  await recAirportInput.fill('KA');
  await page.waitForTimeout(500);

  // Click first option - use keyboard to select to avoid timing issues
  await recAirportInput.press('ArrowDown');
  await page.waitForTimeout(200);
  await recAirportInput.press('Enter');
  await page.waitForTimeout(800); // Wait for airport selection to process

  // Fill in recovery runway (required)
  const recRunwaySelect = recCard.locator('.n-base-selection').nth(1);
  await recRunwaySelect.click();
  await page.waitForTimeout(500);

  // Use keyboard to select first runway option
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Navigate to Briefing tab
  await page.getByText('Briefing', { exact: true }).click();
  await page.waitForTimeout(500);

  // Fill in remarks (required) - find the markdown editor
  const remarksEditor = page.locator('.cm-content').first();
  await remarksEditor.click();
  await remarksEditor.fill('Test mission remarks');
  await page.waitForTimeout(200);

  // Add at least one steerpoint with valid coordinates (required)
  await addValidSteerpoint(page);

  // Navigate to TOLD & Fuel tab to fill in required rotation/refusal speeds
  await page.getByText('TOLD & Fuel', { exact: true }).click();
  await page.waitForTimeout(500);

  // Fill in rotation speed (required) - find within the "Takeoff & Landing Data" card
  const toldCard = page.locator('.n-card', { hasText: 'Takeoff & Landing Data' });
  await toldCard.waitFor({ state: 'visible', timeout: 5000 });

  // Rotation speed is after "Gross Weight" label
  const rotationFormItem = toldCard.locator('.n-form-item', { hasText: 'Rotation Speed' });
  const rotationInput = rotationFormItem.locator('input').first();
  await rotationInput.waitFor({ state: 'visible', timeout: 5000 });
  await rotationInput.click();
  await rotationInput.fill('120');
  await rotationInput.blur();
  await page.waitForTimeout(200);

  // Fill in refusal speed (required)
  const refusalFormItem = toldCard.locator('.n-form-item', { hasText: 'Refusal Speed' });
  const refusalInput = refusalFormItem.locator('input').first();
  await refusalInput.click();
  await refusalInput.fill('100');
  await refusalInput.blur();
  await page.waitForTimeout(200);

  // Note: Takeoff fuel, Joker, and Bingo should already have defaults from mission creation
  // No need to fill them unless they're 0

  // Wait for all changes to be saved and validation to complete (debounce delay + reactivity)
  // Increase wait time to ensure all async updates complete
  await page.waitForTimeout(3000);
}

test.describe('Mission Export Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should trigger PDF download when clicking Export PDF', async ({ page }) => {
    await page.goto('/');

    // Create a mission with all required fields
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });

    // Add mission name
    const nameInput = page.locator('[aria-label="Mission Name"] input');
    await nameInput.fill('Export Test Mission');

    // Fill in all required fields to make mission exportable
    await fillRequiredFields(page);

    // Wait for the Export PDF button to become enabled
    await expect(page.getByRole('button', { name: /Export PDF/ })).toBeEnabled({ timeout: 10000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export PDF button
    await page.getByRole('button', { name: /Export PDF/ }).click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename contains expected pattern
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should trigger JSON MDC download when clicking Export MDC', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });

    // Add mission name
    const nameInput = page.locator('[aria-label="Mission Name"] input');
    await nameInput.fill('MDC Export Test');

    // Fill in all required fields to make mission exportable
    await fillRequiredFields(page);

    // First wait for Export PDF button to be enabled (this works)
    await expect(page.getByRole('button', { name: /Export PDF/ })).toBeEnabled({ timeout: 15000 });

    // Then wait for the Export MDC button to become enabled
    // Give extra time since validation must complete
    await expect(page.getByRole('button', { name: /Export MDC/ })).toBeEnabled({ timeout: 15000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export MDC dropdown button to open the menu
    await page.getByRole('button', { name: /Export MDC/ }).click();

    // Wait for dropdown menu to appear
    await page.waitForTimeout(500);

    // Click the first crew member option in the dropdown (VIPER-1)
    await page.locator('.n-dropdown-option').first().click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename contains expected pattern
    expect(download.suggestedFilename()).toMatch(/\.jafdtc$/);  // Matches pattern like "MDC Export Test_Wing.jafdtc"
  });

  test('should export PDF with embedded images in remarks', async ({ page }) => {
    await page.goto('/');

    // Create a mission - click button to open modal
    await page.getByRole('button', { name: /New Mission/ }).first().click();

    // Click "Create Mission" button in the modal
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Fill in all required fields to make mission exportable
    await fillRequiredFields(page);

    // Navigate to Briefing tab to add image (test-specific setup)
    await page.getByText('Briefing', { exact: true }).click();
    await page.waitForTimeout(500);

    // Create a simple test image (1x1 red pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    // Find the image button in the first markdown editor (Remarks)
    const imageButton = page.getByRole('button', { name: 'image' }).first();
    await expect(imageButton).toBeVisible();

    // Click the image button to open menu
    await imageButton.click();

    // Set up file chooser listener BEFORE clicking Upload Images
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click "Upload Images" from the menu - this will trigger the file chooser
    await page.getByRole('menuitem', { name: 'Upload Images' }).click();

    // Wait for the file chooser to appear
    const fileChooser = await fileChooserPromise;

    // Set the file
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer,
    });

    // Wait for image to be processed and added to editor
    await page.waitForTimeout(2000);

    // Wait for the Export PDF button to become enabled
    await expect(page.getByRole('button', { name: /Export PDF/ })).toBeEnabled({ timeout: 10000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export PDF button
    await page.getByRole('button', { name: /Export PDF/ }).click();

    // Wait for download
    const download = await downloadPromise;

    // Verify the PDF was downloaded
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
})
