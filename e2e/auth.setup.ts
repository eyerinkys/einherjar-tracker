import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFileA = path.join(__dirname, '.auth/userA.json');
const authFileB = path.join(__dirname, '.auth/userB.json');

async function authenticate(page: any, email: string, authFile: string) {
  const testPassword = 'Password123!';
  
  await page.goto('/sign-up');
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', testPassword);
  
  const nameInput = page.locator('input[type="text"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill(email.split('@')[0]);
  }

  await page.click('button[type="submit"]');

  await page.waitForURL('**/', { timeout: 5000 }).catch(() => {});

  if (page.url().includes('/sign-up')) {
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 5000 });
  }

  await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });

  await page.context().storageState({ path: authFile });
}

setup('authenticate user A', async ({ page }) => {
  await authenticate(page, 'testuser-a@einherjar.local', authFileA);
});

setup('authenticate user B', async ({ page }) => {
  await authenticate(page, 'testuser-b@einherjar.local', authFileB);
});

