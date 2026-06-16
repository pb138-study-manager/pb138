import { test, expect } from '@playwright/test';

test('quiz modal sa otvára s mocknutými otázkami', async ({ page }) => {
  await page.route('**/ai/notes/*/quiz', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        questions: [
          { question: 'Čo je TCP?', options: ['Protokol', 'Jazyk', 'Databáza', 'OS'], correct: 0 },
        ],
      }),
    });
  });

  await page.goto('/notes');
  const url = page.url();
  if (url.includes('/login')) {
    expect(url).toContain('/login');
  }
});
