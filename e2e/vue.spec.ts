import { test, expect } from '@playwright/test';

test.describe('Mission CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display mission list page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /New Mission/ }).first()).toBeVisible();
  });

  test('should create a new mission', async ({ page }) => {
    await page.goto('/');

    // Click button to open modal
    await page.getByRole('button', { name: /New Mission/ }).first().click();

    // Click "Create Mission" button in the modal
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Should see the mission editor with tabs
    await expect(page.getByText('Basic Info')).toBeVisible();
    await expect(page.getByText('Steerpoints')).toBeVisible();
  });

  test('should update mission name and details', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);
    await page.getByText('Basic Info', { exact: true }).waitFor({ state: 'visible' });

    // Update mission name - find the input element within the aria-labeled container
    const nameInput = page.locator('[aria-label="Mission Name"] input');
    await nameInput.fill('Test SEAD Mission');

    // Select mission type (it's an autocomplete field)
    const missionTypeInput = page.locator('[aria-label="Mission Type"] input');
    await missionTypeInput.click();
    await missionTypeInput.fill('SEAD');
    await missionTypeInput.press('Tab');
    await page.waitForTimeout(200);

    // Go back to list - click the back arrow in the page header
    await page.locator('.n-page-header__back').click();

    // Verify the mission appears in the list table
    await expect(page.getByRole('table').getByText('Test SEAD Mission')).toBeVisible();
  });

  test('should add and remove steerpoints', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Navigate to Steerpoints tab
    await page.getByText('Steerpoints', { exact: true }).click();

    // Add a custom steerpoint
    await page.getByRole('button', { name: /Custom Steerpoint/ }).click();

    // Verify steerpoint was added - check for the waypoint item
    const steerpoints = page.locator('.waypoint-item');
    await expect(steerpoints).toHaveCount(1);

    // Remove the steerpoint - use the delete button with class waypoint-delete
    await page.locator('.waypoint-item .waypoint-delete').click();

    // Verify it was removed
    await expect(steerpoints).toHaveCount(0);
  });

  test('should add and remove crew members', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Navigate to Flight Members tab
    await page.getByText('Flight Members', { exact: true }).click();
    await page.waitForTimeout(1000); // Wait for tab content to load

    // Initially should have no crew - check for the empty state message
    await expect(page.getByText(/At least one flight member is required/)).toBeVisible();

    // Try to add a crew member from the dropdown (first crew member in list)
    // Wait for the Flight Composition card to be visible
    await expect(page.getByText('Flight Composition')).toBeVisible();
    // Find and click the dropdown within the Flight Composition card
    const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' });
    const crewDropdown = flightCard.locator('.n-base-selection').first();
    await crewDropdown.click();
    // Wait for the dropdown menu to appear, then wait for options
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Give options time to render

    // Select first option
    await page.locator('.n-base-select-option').first().click();

    // Verify crew member was added
    const crewItems = page.locator('.crew-item');
    await expect(crewItems).toHaveCount(1);
  });

  test('should prevent adding duplicate crew members', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Navigate to Flight Members tab
    await page.getByText('Flight Members', { exact: true }).click();
    await page.waitForTimeout(1000); // Wait for tab content to load

    // Add first crew member
    // Wait for the Flight Composition card to be visible
    await expect(page.getByText('Flight Composition')).toBeVisible();
    // Find and click the dropdown within the Flight Composition card
    const flightCard = page.locator('.n-card', { hasText: 'Flight Composition' });
    const crewDropdown = flightCard.locator('.n-base-selection').first();
    await crewDropdown.click();
    // Wait for the dropdown menu to appear, then wait for options
    await page.waitForSelector('.n-base-select-menu', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Give options time to render

    // Get the text of the first option to verify later
    const firstOption = page.locator('.n-base-select-option').first();
    const firstCrewName = await firstOption.textContent();
    await firstOption.click();

    // Wait for dropdown to close by checking it's hidden
    await expect(page.locator('.n-base-select-menu')).toBeHidden();

    // Open dropdown again and verify the first crew member is removed from options
    await crewDropdown.click();
    const optionsWithFirstCrew = page.locator('.n-base-select-option', { hasText: firstCrewName || '' });
    await expect(optionsWithFirstCrew).toHaveCount(0);
  });

  test('should delete a mission', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    // Update name so we can identify it
    const nameInput = page.locator('[aria-label="Mission Name"] input');
    await nameInput.fill('Mission To Delete');

    // Go back to list
    await page.goBack();

    // Verify mission appears in the table
    await expect(page.getByRole('table').getByText('Mission To Delete')).toBeVisible();

    // Find and click delete button for this mission
    const missionCard = page.locator('.n-card', { hasText: 'Mission To Delete' });
    await missionCard.getByRole('button', { name: /delete|trash/i }).click();

    // Confirm deletion in the confirmation dialog (need to be more specific to avoid the table delete button)
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // Wait a moment for the deletion to process
    await page.waitForTimeout(500);

    // Verify mission is gone from the table
    await expect(page.getByRole('table').getByText('Mission To Delete')).toBeHidden();
  });

  test('should persist missions in localStorage', async ({ page }) => {
    await page.goto('/');

    // Create a mission
    await page.getByRole('button', { name: /New Mission/ }).first().click();
    await page.getByRole('button', { name: 'Create Mission' }).click();
    await page.waitForURL(/\/mission\/.+/);

    const nameInput = page.locator('[aria-label="Mission Name"] input');
    await nameInput.fill('Persisted Mission');

    // Go back
    await page.goBack();

    // Reload the page
    await page.reload();

    // Verify mission still appears in the table
    await expect(page.getByRole('table').getByText('Persisted Mission')).toBeVisible();
  });
})
