import type { Page } from '@playwright/test';

// Computed in playwright.config.ts from the .env file so it matches the running dev server.
const storageKey = process.env.TEST_SUPABASE_STORAGE_KEY ?? 'sb-placeholder-auth-token';

export async function mockAuthentication(page: Page) {
  await page.route('**/auth/v1/user', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
      }),
    });
  });

  await page.addInitScript((key) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const session = {
      access_token: 'fake-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'fake-refresh-token',
      user: {
        id: '123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
      },
    };
    window.localStorage.setItem(key, JSON.stringify(session));
  }, storageKey);
}
