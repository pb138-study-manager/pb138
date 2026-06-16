import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';

// Determine the Supabase project ref from .env so e2e auth mocks use the right localStorage key.
// Falls back to 'placeholder' in CI (where .env doesn't exist and the webServer uses the placeholder URL).
const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const envSupabaseUrl = envContent.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const supabaseUrl =
  envSupabaseUrl ?? process.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\./)?.[1] ?? 'placeholder';
process.env.TEST_SUPABASE_STORAGE_KEY = `sb-${projectRef}-auth-token`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    },
  },
});
