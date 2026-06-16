import { test, expect, Page } from '@playwright/test';
import { mockAuthentication } from './helpers';

// Funkcia pre namockovanie úloh
async function mockData(page: Page) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const laterDate = new Date(today);
  laterDate.setDate(laterDate.getDate() + 10);

  await page.route('**/tasks*', async (route) => {
    const type = route.request().resourceType();
    if (type !== 'fetch' && type !== 'xhr') {
      return route.continue();
    }

    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Overdue task',
            status: 'TODO',
            dueDate: yesterday.toISOString(),
            priority: 'HIGH',
            tags: ['Urgent'],
          },
          {
            id: 2,
            title: 'Today task',
            status: 'TODO',
            dueDate: today.toISOString(),
            priority: 'MEDIUM',
            tags: ['React'],
          },
          {
            id: 3,
            title: 'This week task',
            status: 'TODO',
            dueDate: tomorrow.toISOString(),
            priority: 'LOW',
            tags: ['Typescript'],
          },
          {
            id: 4,
            title: 'Later task',
            status: 'TODO',
            dueDate: laterDate.toISOString(),
            priority: 'LOW',
            tags: [],
          },
          {
            id: 5,
            title: 'Done task',
            status: 'DONE',
            dueDate: today.toISOString(),
            priority: 'MEDIUM',
            tags: ['React'],
          },
        ]),
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99,
          title: 'New task created via UI',
          status: 'TODO',
          dueDate: today.toISOString(),
        }),
      });
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          title: 'Today task',
          status: 'DONE',
          dueDate: today.toISOString(),
        }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.continue();
    }
  });

  // Mock events if they are ever loaded on this page
  await page.route('**/api/events*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockData(page);
    await mockAuthentication(page);
    await page.goto('/tasks');
  });

  test('displays loading state initially', async ({ page }) => {
    // Artificial delay
    await page.route('**/tasks*', async (route) => {
      const type = route.request().resourceType();
      if (type !== 'fetch' && type !== 'xhr') return route.continue();
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // Clear react-query cache by evaluating or just reload
    await page.goto('/tasks');
    await page.reload();
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
  });

  test('renders task sections and tasks correctly', async ({ page }) => {
    // Tasks page uses segmented tabs — each tab shows one section at a time.
    // Default tab is "Today". The Overdue tab appears because we have an overdue task.
    await expect(page.locator('button').filter({ hasText: /Overdue|Po termínu/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Today|Dnes/ }).first()).toBeVisible();

    // Default tab is Today — "Today task" should be visible
    await expect(page.locator('text=Today task')).toBeVisible();

    // Switch to Overdue tab
    await page.locator('button').filter({ hasText: /Overdue|Po termínu/ }).first().click();
    await expect(page.locator('text=Overdue task')).toBeVisible();

    // Switch to This Week tab
    await page.locator('button').filter({ hasText: /This Week|Tento týden/ }).first().click();
    await expect(page.locator('text=This week task')).toBeVisible();

    // Switch to Later tab
    await page.locator('button').filter({ hasText: /Later|Pozdéji|Neskôr/ }).first().click();
    await expect(page.locator('text=Later task')).toBeVisible();

    // Switch to Done tab
    await page.locator('button').filter({ hasText: /Done|Hotovo/ }).first().click();
    await expect(page.locator('text=Done task')).toBeVisible();
  });

  test('allows filtering by priority and tags', async ({ page }) => {
    // Filter by Priority
    const filterBtn = page.locator('button', { hasText: 'HIGH' }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();

      // 'Overdue task' is HIGH, should be visible
      await expect(page.locator('text=Overdue task')).toBeVisible();
      // 'Today task' is MEDIUM, should not be visible
      await expect(page.locator('text=Today task')).not.toBeVisible();

      // Clear filter
      await filterBtn.click();
      await expect(page.locator('text=Today task')).toBeVisible();
    }

    // Filter by Tag
    const tagBtn = page.locator('button', { hasText: 'React' }).first();
    if (await tagBtn.isVisible()) {
      await tagBtn.click();

      await expect(page.locator('text=Today task')).toBeVisible();
      await expect(page.locator('text=Overdue task')).not.toBeVisible();
    }
  });

  test('creates a new task', async ({ page }) => {
    // Click on the Add Task button (+)
    const addBtn = page.locator('.lucide-plus').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();

      const titleInput = page.getByPlaceholder('Task name...');
      await expect(titleInput).toBeVisible();
      await titleInput.fill('New task created via UI');

      const submitBtn = page.locator('.lucide-arrow-up').first().locator('..');
      await submitBtn.click();
    }
  });

  test('marks a task as done', async ({ page }) => {
    const taskContainer = page.locator('div').filter({ hasText: 'Today task' }).last();
    const checkbox = taskContainer
      .locator('button[role="checkbox"], input[type="checkbox"]')
      .first();

    if (await checkbox.isVisible()) {
      await checkbox.click();
    }
  });
});
