import { test, expect, Page } from '@playwright/test'

type Course = {
  id: number
  code: string
  name: string | null
  semester: string
  color: string | null
  lectureSchedule: string | null
  seminarSchedule: string | null
  enrolled: boolean
}

type Task = {
  id: number
  title: string
  status: string
  dueDate: string
  priority: string
  courseId: number
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
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'fake-refresh-token',
      token_type: 'bearer',
      user: {
        id: '123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
      },
    }

    window.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({ currentSession: session, persistSession: true })
    )
    window.localStorage.setItem(
      'sb-placeholder-auth-token',
      JSON.stringify({ currentSession: session, persistSession: true })
    )
  })
}

async function mockRoleMode(page: Page, mode: 'student' | 'teacher') {
  await page.addInitScript((currentMode) => {
    window.localStorage.setItem('roleMode', currentMode)
  }, mode)
}

async function mockCourses(page: Page) {
  const courses: Course[] = [
    {
      id: 1,
      code: 'PB138',
      name: 'Student OS',
      semester: 'Spring 2026',
      color: null,
      lectureSchedule: 'Mon 10:00',
      seminarSchedule: 'Wed 14:00',
      enrolled: true,
    },
    {
      id: 2,
      code: 'PB175',
      name: 'Software Engineering',
      semester: 'Fall 2025',
      color: null,
      lectureSchedule: 'Tue 12:00',
      seminarSchedule: 'Thu 16:00',
      enrolled: false,
    },
  ]
  let nextCourseId = 3

  await page.route('**/courses*', async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.continue()
      return
    }

    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === 'GET' && url.pathname === '/courses') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(courses),
      })
      return
    }

    if (request.method() === 'POST' && url.pathname === '/courses') {
      const payload = request.postDataJSON() as { code: string; name?: string; semester: string }
      const newCourse: Course = {
        id: nextCourseId++,
        code: payload.code,
        name: payload.name ?? null,
        semester: payload.semester,
        color: null,
        lectureSchedule: null,
        seminarSchedule: null,
        enrolled: true,
      }
      courses.push(newCourse)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newCourse),
      })
      return
    }

    const progressMatch = url.pathname.match(/^\/courses\/(\d+)\/progress$/)
    if (request.method() === 'GET' && progressMatch) {
      const courseId = Number(progressMatch[1])
      const progress = {
        done: courseId === 1 ? 3 : 0,
        total: courseId === 1 ? 5 : 0,
        percent: courseId === 1 ? 60 : 0,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(progress),
      })
      return
    }

    if (request.method() === 'GET' && /^\/courses\/\d+$/.test(url.pathname)) {
      const courseId = Number(url.pathname.split('/')[2])
      const course = courses.find((item) => item.id === courseId)
      if (course) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(course),
        })
        return
      }
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'NOT_FOUND' }),
      })
      return
    }

    await route.continue()
  })
}

async function mockCourseTasks(page: Page) {
  const tasks: Task[] = [
    {
      id: 101,
      title: 'Prepare lecture notes',
      status: 'TODO',
      dueDate: '2026-06-20T10:00:00.000Z',
      priority: 'LOW',
      courseId: 1,
    },
  ]

  await page.route('**/tasks*', async (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tasks),
      })
      return
    }
    await route.continue()
  })
}

test.describe('Courses page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page)
    await mockCourses(page)
    await mockCourseTasks(page)
  })

  test('student view should list only enrolled courses without create button', async ({ page }) => {
    await mockRoleMode(page, 'student')
    await page.goto('/courses')

    await expect(page.getByRole('heading', { name: /Courses|Kurzy/i })).toBeVisible()
    await expect(page.getByText('PB138')).toBeVisible()
    await expect(page.getByText('PB175')).not.toBeVisible()
    await expect(page.locator('button:has(svg)').count()).resolves.toBe(0)
  })

  test('teacher view should show all courses and new course button', async ({ page }) => {
    await mockRoleMode(page, 'teacher')
    await page.goto('/courses')

    await expect(page.getByText('PB138')).toBeVisible()
    await expect(page.getByText('PB175')).toBeVisible()
    await expect(page.locator('button:has(svg)').first()).toBeVisible()
  })

  test('clicking a course card navigates to course detail', async ({ page }) => {
    await mockRoleMode(page, 'student')
    await page.goto('/courses')

    await page.locator('div').filter({ hasText: 'PB138' }).first().click()
    await expect(page).toHaveURL(/\/courses\/1$/)
    await expect(page.getByText('Prepare lecture notes')).toBeVisible()
  })

  test('teacher can create a new course and see it in the list', async ({ page }) => {
    await mockRoleMode(page, 'teacher')
    await page.goto('/courses')

    await page.locator('button:has(svg)').first().click()
    await expect(page).toHaveURL(/\/courses\/new$/)

    await page.getByPlaceholder('e.g. PB138').fill('PB180')
    await page.getByPlaceholder('Full name of the course').fill('Advanced Testing')
    await page.getByPlaceholder('e.g. Spring 2026').fill('Summer 2026')

    await page.getByRole('button', { name: 'Create Course' }).click()
    await expect(page).toHaveURL(/\/courses$/)
    await expect(page.getByText('PB180')).toBeVisible()
    await expect(page.getByText('Advanced Testing')).toBeVisible()
  })
})
