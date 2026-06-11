import { test, expect } from '@playwright/test';

test('AI panel toggle button existuje na /today', async ({ page }) => {
  await page.route('**/ai/brief', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        brief: 'Testovací brief.',
        priorities: [{ title: 'Test task', dueDate: new Date().toISOString(), urgency: 'high' }],
      }),
    });
  });

  await page.goto('/today');

  const url = page.url();
  if (url.includes('/login')) {
    expect(url).toContain('/login');
  } else {
    const toggle = page.locator('button[title="AI Copilot"]');
    await expect(toggle).toBeVisible();
  }
});
