import { test, expect } from './fixture'
test('generate, edit, validation and account prompt', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Make room for you.' })).toBeVisible()
  await page.getByRole('button', { name: 'Generate my week' }).click()
  await expect(page.locator('.draft-badge')).toContainText('Draft')
  await page.locator('.fc-event').first().click()
  await page.getByLabel('Activity', { exact: true }).fill('My intentional learning session')
  await page.getByRole('button', { name: 'Apply changes' }).click()
  await expect(page.getByText('My intentional learning session', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save my week' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Make room for growth.' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
for (const width of [320, 390, 768, 1440]) {
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Generate my week' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy()
    if (width < 768) {
      await expect(page.locator('.fc-list')).toBeVisible()
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await expect(page.getByRole('button', { name: 'Saved weeks' })).toBeVisible()
      await page.getByRole('button', { name: 'Close navigation' }).click()
    }
  })
}
test('reduced motion and failed account requests keep the form open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Database is not configured yet.' }),
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: false }).first().click()
  await page.getByLabel('Email address').fill('person@example.com')
  await page.getByLabel('Password', { exact: true }).fill('not-a-real-password')
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Database is not configured')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('verified account saves and restores a plan across reloads', async ({ page }) => {
  test.skip(
    process.env.BROWSER_ARTIFACTS === 'true' ||
      !process.env.DATABASE_URL ||
      !new URL(process.env.DATABASE_URL).pathname.endsWith('_test'),
    'Requires the isolated integration database and development email links.',
  )
  const email = `browser-${Date.now()}@example.com`
  const password = 'A-thoughtful-browser-password-42'
  await page.goto('/')
  await page.getByRole('button', { name: 'Save my week' }).click()
  await page.getByLabel('Your name').fill('Alex')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByRole('link', { name: 'Open the development link' }).click()
  await page.getByRole('button', { name: 'Verify my email' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Generate my week' }).click()
  await page.locator('.fc-event').first().click()
  await page.getByLabel('Activity', { exact: true }).fill('A saved moment for learning')
  await page.getByRole('button', { name: 'Apply changes' }).click()
  await page.getByRole('button', { name: 'Save my week' }).click()
  await expect(page.getByRole('button', { name: 'Week saved' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Week saved' })).toBeVisible()
  await expect(page.getByText('A saved moment for learning', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Saved weeks' }).click()
  await expect(page.locator('.week-card')).toHaveCount(1)
})
