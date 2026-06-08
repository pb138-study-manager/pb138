import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('should have Get started link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });
});
