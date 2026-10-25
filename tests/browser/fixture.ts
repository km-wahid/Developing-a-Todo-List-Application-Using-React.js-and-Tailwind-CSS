import { test as base, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
// Artifact mode verifies built UI without requiring a reachable local server.
export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.BROWSER_ARTIFACTS === 'true') {
      await page.route('http://localhost:5173/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/auth/session')
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ user: null, csrf: null }),
          })
        if (path.startsWith('/api/'))
          return route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Database is not configured yet.' }),
          })
        const asset = path === '/' ? 'index.html' : path.slice(1)
        if (asset.includes('..')) return route.abort()
        const contentType = asset.endsWith('.js')
          ? 'application/javascript'
          : asset.endsWith('.css')
            ? 'text/css'
            : asset.endsWith('.svg')
              ? 'image/svg+xml'
              : 'text/html'
        return route.fulfill({ contentType, body: await readFile(resolve('dist', asset)) })
      })
    }
    await use(page)
  },
})
export { expect }
