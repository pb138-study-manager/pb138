import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('has login heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('has email and password inputs', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('has link to register', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('register link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
