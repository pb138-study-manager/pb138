import { test, expect } from '@playwright/test';
import { mockAuthentication } from './helpers';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COURSE_ID = 480;
const API = 'http://localhost:3001';

test.describe('Materials file upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);

    await page.addInitScript(() => {
      window.localStorage.setItem('roleMode', 'teacher');
    });

    // Register general catch-alls FIRST so they fire LAST (Playwright evaluates LIFO)
    // Specific handlers registered after take priority.

    // Catch-all for any unhandled localhost:3001 request
    await page.route(`${API}/**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // Auth
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
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

    // User profile
    await page.route(`${API}/users/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 393,
          email: 'test@example.com',
          roles: ['TEACHER', 'USER'],
          profile: { name: 'Test Teacher' },
          settings: { lightTheme: true, notificationsEnabled: true },
        }),
      });
    });

    // Courses list
    await page.route(`${API}/courses`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: COURSE_ID,
            code: 'PB138',
            name: 'Student OS',
            semester: 'Spring 2026',
            lectureTeacherId: 393,
            enrolled: true,
          },
        ]),
      });
    });

    // Course detail
    await page.route(`${API}/courses/${COURSE_ID}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: COURSE_ID,
          code: 'PB138',
          name: 'Student OS',
          semester: 'Spring 2026',
          lectureTeacherId: 393,
          enrolled: true,
          teacherName: 'Test Teacher',
          teacherAvatar: null,
        }),
      });
    });

    // Mutable materials state
    let materials: object[] = [];

    // Materials list (GET)
    await page.route(`${API}/courses/${COURSE_ID}/materials`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(materials),
      });
    });

    // File upload (POST multipart)
    await page.route(`${API}/courses/${COURSE_ID}/materials/upload`, async (route) => {
      const newMaterial = {
        id: 999,
        courseId: COURSE_ID,
        createdBy: 393,
        title: 'Entity-Relationship Diagram',
        description: null,
        url: null,
        storagePath: `course-${COURSE_ID}/uuid-entity-relationship.png`,
        deletedAt: null,
      };
      materials = [newMaterial];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newMaterial),
      });
    });

    // Signed URL download
    await page.route(`${API}/courses/${COURSE_ID}/materials/999/download`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/signed-url/entity-relationship.png' }),
      });
    });

    await page.goto(`/courses/${COURSE_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('PB138').first()).toBeVisible({ timeout: 10000 });
  });

  test('toggle shows Link and File tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'materials' }).click();
    await page.locator('button.w-7').click();

    await expect(page.getByRole('button', { name: 'Link' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'File' })).toBeVisible({ timeout: 5000 });
  });

  test('file upload: pick file, submit, material appears in list', async ({ page }) => {
    await page.getByRole('button', { name: 'materials' }).click();
    await page.locator('button.w-7').click();

    await expect(page.getByRole('button', { name: 'File' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'File' }).click();

    await expect(page.getByText('Choose file…')).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder('Title').fill('Entity-Relationship Diagram');

    await page
      .locator('input[type="file"]')
      .setInputFiles(
        path.resolve(__dirname, '../../../docs/analysis/diagrams/entity-relationship.png')
      );
    await expect(page.getByText('entity-relationship.png')).toBeVisible({ timeout: 3000 });

    let uploadCT = '';
    page.on('request', (req) => {
      if (req.url().includes('/materials/upload')) uploadCT = req.headers()['content-type'] ?? '';
    });

    await page.getByRole('button', { name: 'Add' }).click();

    // Dialog should close
    await expect(page.getByText('Choose file…')).not.toBeVisible({ timeout: 8000 });

    // Material card should appear
    await expect(page.getByText('Entity-Relationship Diagram')).toBeVisible({ timeout: 8000 });

    expect(uploadCT).toContain('multipart/form-data');
    console.log('✅ Upload Content-Type:', uploadCT);
  });

  test('clicking file material calls download endpoint', async ({ page }) => {
    await page.getByRole('button', { name: 'materials' }).click();
    await page.locator('button.w-7').click();
    await page.getByRole('button', { name: 'File' }).click();
    await page.getByPlaceholder('Title').fill('Entity-Relationship Diagram');
    await page
      .locator('input[type="file"]')
      .setInputFiles(
        path.resolve(__dirname, '../../../docs/analysis/diagrams/entity-relationship.png')
      );
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Entity-Relationship Diagram')).toBeVisible({ timeout: 8000 });

    let downloadCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/materials/999/download')) downloadCalled = true;
    });

    await page.evaluate(() => {
      window.open = () => null;
    });
    await page.getByText('Entity-Relationship Diagram').click();
    await page.waitForTimeout(1000);

    expect(downloadCalled).toBe(true);
    console.log('✅ Download endpoint called');
  });
});
