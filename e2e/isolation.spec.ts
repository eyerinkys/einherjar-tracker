import { test, expect } from '@playwright/test';

// Use User B's storage state for these tests
test.use({ storageState: 'e2e/.auth/userB.json' });

test.describe('Isolation Tests', () => {
  test('User B cannot see User A data', async ({ page }) => {
    // Assuming User A created "E2E Full Body" in the previous test
    await page.goto('/history');
    
    // User B should NOT see "E2E Full Body" in their history
    await expect(page.locator('text=E2E Full Body')).not.toBeVisible({ timeout: 5000 });
    
    // User B goes to Split
    await page.goto('/split');
    await expect(page.locator('text=E2E Full Body')).not.toBeVisible({ timeout: 5000 });
  });

  // Note: True API-level isolation requires making direct API calls with User B's cookies to User A's endpoints.
  // Next.js server actions are POST requests to the current page. We can test UI isolation which implies
  // data fetch isolation.
});
