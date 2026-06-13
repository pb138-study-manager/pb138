import { test } from '@playwright/test';
test('check url with mock', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
      access_token: 'fake-token',
      refresh_token: 'fake-refresh',
      user: { id: '123', email: 'test@example.com', role: 'authenticated', aud: 'authenticated' }
    }));
  });
  await page.goto('/today');
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());
  if (page.url().includes('login')) {
      console.log('Login body:', await page.content());
  }
});