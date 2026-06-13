import { test, expect, Page } from '@playwright/test'

type EventItem = {
  id: number
  title: string
  startDate: string
  endDate: string
  description?: string
  type: 'EVENT' | 'DEADLINE'
}

type TaskItem = {
  id: number
  title: string
  dueDate: string
  status: string
  priority: string
}

async function mockAuthentication(page: Page) {
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
    })
  })

  await page.addInitScript(() => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
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
    }
    window.localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(session))
  })
}

async function mockTimelineData(page: Page) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const nextDay = new Date(today)
  nextDay.setDate(nextDay.getDate() + 1)

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
  ]

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
  ]

  await page.route('**/events*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(events),
    })
  })

  await page.route('**/tasks*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tasks),
    })
  })
}

test.describe('Timeline page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page)
    await mockTimelineData(page)
    await page.goto('/timeline')
  })

  test('renders the timeline header and event cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible()
    await expect(page.getByText('Team sync')).toBeVisible()
    await expect(page.getByText('Homework deadline')).toBeVisible()
  })

  test('navigates to next week and hides current day events', async ({ page }) => {
    const firstMonthLabel = await page.getByText(/^[A-Za-z]{3} \d{4}$/).first().textContent()
    await page.getByRole('button', { name: /next week|>/i }).click()
    await expect(page.getByText('Team sync')).not.toBeVisible()
    const nextMonthLabel = await page.getByText(/^[A-Za-z]{3} \d{4}$/).first().textContent()
    expect(nextMonthLabel).not.toBe(firstMonthLabel)
  })

  test('opens the add event dialog', async ({ page }) => {
    await page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).first().click()
    await expect(page.getByPlaceholder('Event name...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Event' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Deadline' })).toBeVisible()
  })
})
