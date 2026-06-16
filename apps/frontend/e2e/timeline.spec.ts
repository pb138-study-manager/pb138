import { test, expect, Page } from '@playwright/test';
import { mockAuthentication } from './helpers';

type EventItem = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  type: 'EVENT' | 'DEADLINE';
};

type TaskItem = {
  id: number;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
};

async function mockTimelineData(page: Page) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);

  const events: EventItem[] = [
    {
      id: 1,
      title: 'Team sync',
      startDate: today.toISOString(),
      endDate: new Date(today.getTime() + 60 * 60 * 1000).toISOString(),
      description: 'Weekly status update',
      type: 'EVENT',
    },
    {
      id: 2,
      title: 'Homework deadline',
      startDate: today.toISOString(),
      endDate: today.toISOString(),
      type: 'DEADLINE',
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: 101,
      title: 'Finish timeline tests',
      dueDate: today.toISOString(),
      status: 'TODO',
      priority: 'MEDIUM',
    },
    {
      id: 102,
      title: 'Prepare slides',
      dueDate: nextDay.toISOString(),
      status: 'TODO',
      priority: 'LOW',
    },
  ];

  await page.route('**/events*', async (route) => {
    const type = route.request().resourceType();
    if (type !== 'fetch' && type !== 'xhr') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(events),
    });
  });

  await page.route('**/tasks*', async (route) => {
    const type = route.request().resourceType();
    if (type !== 'fetch' && type !== 'xhr') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tasks),
    });
  });
}

test.describe('Timeline page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
    await mockTimelineData(page);
    await page.goto('/timeline');
  });

  test('renders the timeline header and event cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
    await expect(page.getByText('Team sync')).toBeVisible();
    await expect(page.getByText('Homework deadline')).toBeVisible();
  });

  test('navigates to next week via chevron button', async ({ page }) => {
    await page
      .locator('main button:visible')
      .filter({ has: page.locator('svg.lucide-chevron-right') })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  });

  test('opens the add event dialog', async ({ page }) => {
    await page
      .locator('main button:visible')
      .filter({ has: page.locator('svg.lucide-plus') })
      .first()
      .click();
    await expect(page.getByPlaceholder('Event name...')).toBeVisible();
    await expect(page.getByText('Event').first()).toBeVisible();
    await expect(page.getByText('Deadline').first()).toBeVisible();
  });
});
