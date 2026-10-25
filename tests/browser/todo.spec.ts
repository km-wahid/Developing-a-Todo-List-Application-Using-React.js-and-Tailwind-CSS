import { test, expect } from './fixture'

test.describe('Todo List Application Browser Tests', () => {
  test('fulfills all Todo List application requirements in a web browser', async ({ page }) => {
    // 1. Open the Todo List application
    await page.goto('/')

    // Verify Title & UI header
    await expect(page.locator('h1')).toHaveText('Todo List')
    await expect(page.getByTestId('task-input')).toBeVisible()
    await expect(page.getByTestId('add-task-button')).toBeVisible()

    // 2. Check remaining count initial state (1 task is active out of 3 sample tasks)
    const remainingCount = page.getByTestId('remaining-count')
    await expect(remainingCount).toContainText('1 task remaining')

    // 3. Add a new task
    const input = page.getByTestId('task-input')
    await input.fill('Write comprehensive tests')
    await page.getByTestId('add-task-button').click()

    // Verify new task was added and input cleared
    await expect(input).toHaveValue('')
    await expect(page.getByTestId('task-list')).toContainText('Write comprehensive tests')
    await expect(remainingCount).toContainText('2 tasks remaining')

    // 4. Mark task as completed
    const newTaskItem = page.locator('li', { hasText: 'Write comprehensive tests' })
    const toggleButton = newTaskItem.locator('button').first()
    await toggleButton.click()

    // Verify task is marked completed (strikethrough) and remaining count decrements
    await expect(newTaskItem.locator('.line-through')).toContainText('Write comprehensive tests')
    await expect(remainingCount).toContainText('1 task remaining')

    // 5. Mark task back to incomplete
    await toggleButton.click()
    await expect(remainingCount).toContainText('2 tasks remaining')

    // 6. Delete a task
    const deleteButton = newTaskItem.locator('button[aria-label*="Delete"]')
    await deleteButton.click()
    await expect(page.getByTestId('task-list')).not.toContainText('Write comprehensive tests')
    await expect(remainingCount).toContainText('1 task remaining')

    // 7. Test filters
    await page.getByTestId('filter-completed').click()
    // In completed view, should only show completed tasks
    await expect(page.locator('li', { hasText: 'Set up React.js project using Vite' })).toBeVisible()
    await expect(page.locator('li', { hasText: 'Build the interactive Todo List application' })).not.toBeVisible()

    await page.getByTestId('filter-active').click()
    // In active view, should only show active task
    await expect(page.locator('li', { hasText: 'Build the interactive Todo List application' })).toBeVisible()
    await expect(page.locator('li', { hasText: 'Set up React.js project using Vite' })).not.toBeVisible()

    await page.getByTestId('filter-all').click()
    await expect(page.locator('li', { hasText: 'Build the interactive Todo List application' })).toBeVisible()
    await expect(page.locator('li', { hasText: 'Set up React.js project using Vite' })).toBeVisible()
  })
})
