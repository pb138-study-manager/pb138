import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = ['/today', '/tasks', '/notes', '/timeline', '/courses', '/profile', '/dashboard'];

test.describe('Auth guard', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`redirects ${route} to /login when not authenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
