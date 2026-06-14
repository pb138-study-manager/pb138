import { test, expect, Page } from '@playwright/test'
import { mockAuthentication } from './helpers'

type Folder = {
  id: number
  name: string
}

type Note = {
  id: number
  title: string
  description: string
  folderId: number
  courseId: number | null
}

async function mockNotesData(page: Page) {
  const folders: Folder[] = [
    { id: 1, name: 'Personal' },
    { id: 2, name: 'School' },
  ]
  const notes: Note[] = [
    { id: 1, title: 'Shopping list', description: 'Milk, eggs, bread', folderId: 1, courseId: null },
    { id: 2, title: 'Study plan', description: 'React + tests', folderId: 2, courseId: null },
  ]
  let nextFolderId = 3
  let nextNoteId = 3

  await page.route('**/users/me/settings', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lightTheme: true, language: 'en', notificationsEnabled: true }),
    })
  })

  await page.route('**/folders*', async (route) => {
    const type = route.request().resourceType()
    if (type !== 'fetch' && type !== 'xhr') return route.continue()

    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(folders),
      })
      return
    }

    if (request.method() === 'POST') {
      const payload = request.postDataJSON() as { name: string }
      const newFolder: Folder = { id: nextFolderId++, name: payload.name }
      folders.unshift(newFolder)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newFolder),
      })
      return
    }

    await route.continue()
  })

  await page.route('**/notes*', async (route) => {
    const type = route.request().resourceType()
    if (type !== 'fetch' && type !== 'xhr') return route.continue()

    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(notes),
      })
      return
    }

    if (request.method() === 'POST') {
      const payload = request.postDataJSON() as { title: string; description: string; folderId: number }
      const newNote: Note = {
        id: nextNoteId++,
        title: payload.title,
        description: payload.description,
        folderId: payload.folderId,
        courseId: null,
      }
      notes.unshift(newNote)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newNote),
      })
      return
    }

    await route.continue()
  })

  await page.route('**/courses*', async (route) => {
    const type = route.request().resourceType()
    if (type !== 'fetch' && type !== 'xhr') return route.continue()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

test.describe('Notes page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page)
    await mockNotesData(page)
    await page.goto('/notes')
  })

  test('shows note folders and add folder button', async ({ page }) => {
    await expect(page.getByText('Personal')).toBeVisible()
    await expect(page.getByText('School')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add folder' })).toBeVisible()
  })

  test('creates a new folder and opens it', async ({ page }) => {
    await page.getByRole('button', { name: 'Add folder' }).click()
    await page.getByPlaceholder('Folder name').fill('Work')
    await page.getByRole('button', { name: 'Create folder' }).click()

    await expect(page.getByText('Work')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible()
  })

  test('opens a folder and creates a new note', async ({ page }) => {
    await page.getByText('School').click()
    await expect(page.getByText('Study plan')).toBeVisible()
    await page.getByRole('button', { name: 'Add note' }).click()
    await page.getByPlaceholder('Note title').fill('New test note')
    await page.getByRole('button', { name: 'Create note' }).click()

    await expect(page.getByRole('heading', { name: 'New test note' })).toBeVisible()
  })
})
