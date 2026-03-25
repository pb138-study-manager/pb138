import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to Study Manager' })).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('PB138 Study Manager')).toBeVisible();
  });

  test('should have Get started link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });
});
