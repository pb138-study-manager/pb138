import { test } from '@playwright/test';
test('check ls', async ({ page }) => {
  await page.goto('/login');
  await page.waitForTimeout(1000);
  const ls = await page.evaluate(() => Object.keys(window.localStorage));
  console.log(ls);
});
