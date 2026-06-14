import { test } from '@playwright/test';
import { mockAuthentication } from './helpers';

test('check url with mock', async ({ page }) => {
  await mockAuthentication(page);
  await page.goto('/today');
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());
  if (page.url().includes('login')) {
    console.log('Login body:', await page.content());
  }
});
