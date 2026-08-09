import { test, expect } from '@playwright/test';

test.describe('Workout Core Loop', () => {
  test('creates a split day, logs a workout, and completes it', async ({ page }) => {
    await page.goto('/');

    // Ensure we are on the Split tab
    await page.click('text=Split');

    // Create a new split day
    await page.click('text=Add Day');
    await page.fill('input[placeholder="Day name (e.g. Push, Pull, Legs)"]', 'E2E Full Body');
    await page.click('button:has-text("Save")');

    // Add an exercise
    await page.click('text=Add Exercise');
    await page.selectOption('select', { label: 'Bench Press' });
    await page.fill('input[aria-label="Target Sets"]', '3');
    await page.fill('input[aria-label="Target Min Reps"]', '8');
    await page.fill('input[aria-label="Target Max Reps"]', '12');
    await page.click('button:has-text("Add")');

    // Go to Train tab
    await page.click('text=Train');

    // Start Workout
    await page.click('text=E2E Full Body');
    await page.click('button:has-text("Start Workout")');

    // Log sets
    // Wait for the workout to be active
    await expect(page.locator('text=In Progress')).toBeVisible();

    // Log the first set
    const weightInput = page.locator('input[aria-label="Weight (kg)"]').first();
    const repsInput = page.locator('input[aria-label="Reps"]').first();
    
    await weightInput.fill('60');
    await repsInput.fill('10');
    
    // Toggle completion
    const completeButton = page.locator('button[aria-label="Toggle set completion"]').first();
    await completeButton.click();

    // Save Draft
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Draft saved')).toBeVisible({ timeout: 5000 });

    // Finish Workout
    await page.click('button:has-text("Finish")');
    
    // Expect completion and redirect or success message
    await expect(page.locator('text=Finish')).not.toBeVisible({ timeout: 5000 });

    // Go to History tab
    await page.click('text=History');
    await expect(page.locator('text=E2E Full Body').first()).toBeVisible();
    await expect(page.locator('text=60kg × 10').first()).toBeVisible();
  });
});
