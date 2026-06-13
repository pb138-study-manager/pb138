import { test, expect, Page } from '@playwright/test'

type UserProfileResponse = {
  id: number
  email: string
  login: string
  roles: string[]
  profile: {
    name: string | null
    title: string | null
    organization: string | null
    bio: string | null
  }
  settings: {
    lightTheme: boolean
    language: 'en' | 'cs'
    notificationsEnabled: boolean
  }
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

async function mockProfileData(page: Page) {
  const user: UserProfileResponse = {
    id: 1,
    email: 'demo@student.muni.cz',
    login: 'demo.student',
    roles: ['USER'],
    profile: {
      name: 'Demo Student',
      title: 'Student',
      organization: 'Masaryk University',
      bio: 'Testing profile page',
    },
    settings: {
      lightTheme: true,
      language: 'en',
      notificationsEnabled: true,
    },
  }

  await page.route('**/users/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  })

  await page.route('**/users/me/settings', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      const updated = { ...user, settings: { ...user.settings, ...payload } }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updated),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user.settings),
    })
  })

  await page.route('**/auth/logout', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page)
    await mockProfileData(page)
    await page.goto('/profile')
  })

  test('renders profile details and settings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    await expect(page.getByText('Demo Student')).toBeVisible()
    await expect(page.getByText('demo.student')).toBeVisible()
  })

  test('changes language to Czech', async ({ page }) => {
    await page.getByRole('button', { name: 'English' }).click()
    await page.getByRole('menuitem', { name: 'Čeština' }).click()
    await expect(page.getByRole('button', { name: 'Čeština' })).toBeVisible()
  })

  test('toggles notifications setting', async ({ page }) => {
    const notificationsToggle = page.getByText('Notifications').locator('..').locator('button')
    await notificationsToggle.click()
    await expect(notificationsToggle).toBeVisible()
  })

  test('logs out and navigates to login page', async ({ page }) => {
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
