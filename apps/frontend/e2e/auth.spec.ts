import { test, expect } from '@playwright/test';

test('redirect na /login ak nie je session', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login/);
});

test('redirect na /login pre /tasks bez session', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/login/);
});
