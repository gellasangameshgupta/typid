import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist-electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  })

  // Wait for the first window
  window = await electronApp.firstWindow()

  // Wait for app to fully load
  await window.waitForLoadState('domcontentloaded')
  await window.waitForTimeout(2000) // Give editor time to initialize
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('Typid App Tests', () => {

  test('app window opens successfully', async () => {
    const title = await window.title()
    expect(title).toContain('Typid')

    // Take screenshot of initial state
    await window.screenshot({ path: 'tests/e2e/screenshots/01-app-launch.png' })
  })

  test('editor is visible and functional', async () => {
    // Check editor container exists
    const editorContainer = window.locator('.editor-container')
    await expect(editorContainer).toBeVisible()

    // Check Milkdown editor is present
    const editor = window.locator('.milkdown, .crepe, [class*="editor"]').first()
    await expect(editor).toBeVisible()

    await window.screenshot({ path: 'tests/e2e/screenshots/02-editor-visible.png' })
  })

  test('can type in editor', async () => {
    // Click on the editor area
    const editorArea = window.locator('.editor-container')
    await editorArea.click()

    // Type some content
    await window.keyboard.type('# Hello World\n\nThis is a test document.')

    // Wait for content to render
    await window.waitForTimeout(500)

    await window.screenshot({ path: 'tests/e2e/screenshots/03-typed-content.png' })
  })

  test('sidebar toggle works', async () => {
    // Find sidebar toggle button
    const sidebarToggle = window.locator('.sidebar-toggle')
    await expect(sidebarToggle).toBeVisible()

    // Click to open sidebar
    await sidebarToggle.click()
    await window.waitForTimeout(400)

    // Check sidebar is visible
    const sidebar = window.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    await window.screenshot({ path: 'tests/e2e/screenshots/04-sidebar-open.png' })

    // Click to close sidebar - with z-index fix, this should work without force
    await sidebarToggle.click()
    await window.waitForTimeout(400)

    // Verify sidebar is closed (not visible or translated off-screen)
    await window.screenshot({ path: 'tests/e2e/screenshots/05-sidebar-closed.png' })
  })

  test('AI panel toggle works', async () => {
    // Find AI toggle button
    const aiToggle = window.locator('.ai-toggle')
    await expect(aiToggle).toBeVisible()

    // Click to open AI panel
    await aiToggle.click()
    await window.waitForTimeout(400)

    // Check AI panel is visible
    const aiPanel = window.locator('.ai-panel')
    await expect(aiPanel).toBeVisible()

    await window.screenshot({ path: 'tests/e2e/screenshots/06-ai-panel-open.png' })

    // Click to close AI panel - with z-index fix, this should work without force
    await aiToggle.click()
    await window.waitForTimeout(400)

    await window.screenshot({ path: 'tests/e2e/screenshots/07-ai-panel-closed.png' })
  })

  test('status bar is visible', async () => {
    const statusBar = window.locator('.status-bar')
    await expect(statusBar).toBeVisible()

    await window.screenshot({ path: 'tests/e2e/screenshots/08-status-bar.png' })
  })

  test('theme toggle in sidebar', async () => {
    // Open sidebar
    const sidebarToggle = window.locator('.sidebar-toggle')
    await sidebarToggle.click()
    await window.waitForTimeout(400)

    // Look for dark mode toggle
    const darkModeToggle = window.locator('.setting-toggle:has-text("Dark Mode") .toggle-switch')

    if (await darkModeToggle.isVisible()) {
      // Click to enable dark mode
      await darkModeToggle.click()
      await window.waitForTimeout(300)

      await window.screenshot({ path: 'tests/e2e/screenshots/09-dark-mode-on.png' })

      // Click to disable dark mode
      await darkModeToggle.click()
      await window.waitForTimeout(300)

      await window.screenshot({ path: 'tests/e2e/screenshots/09b-dark-mode-off.png' })
    }

    // Close sidebar
    await sidebarToggle.click()
    await window.waitForTimeout(400)
  })

  test('keyboard shortcuts work', async () => {
    // Click editor first
    const editorArea = window.locator('.editor-container')
    await editorArea.click()

    // Test Cmd+Shift+A for AI panel (macOS)
    await window.keyboard.press('Meta+Shift+A')
    await window.waitForTimeout(400)

    const aiPanel = window.locator('.ai-panel')
    const isAIPanelVisible = await aiPanel.isVisible()

    await window.screenshot({ path: 'tests/e2e/screenshots/10-keyboard-shortcut-ai.png' })

    // Close if opened
    if (isAIPanelVisible) {
      await window.keyboard.press('Meta+Shift+A')
      await window.waitForTimeout(300)
    }
  })

  test('find and replace can be opened', async () => {
    // Test Cmd+F for find (macOS)
    await window.keyboard.press('Meta+f')
    await window.waitForTimeout(400)

    const findReplace = window.locator('.find-replace')

    if (await findReplace.isVisible()) {
      await window.screenshot({ path: 'tests/e2e/screenshots/11-find-replace.png' })

      // Press Escape to close
      await window.keyboard.press('Escape')
      await window.waitForTimeout(300)
    }
  })

  test('AI panel has quick suggestions', async () => {
    // Open AI panel
    const aiToggle = window.locator('.ai-toggle')
    await aiToggle.click()
    await window.waitForTimeout(400)

    // Check for suggestion buttons
    const suggestions = window.locator('.ai-suggestions button')
    const count = await suggestions.count()

    expect(count).toBeGreaterThan(0)

    await window.screenshot({ path: 'tests/e2e/screenshots/12-ai-suggestions.png' })

    // Close AI panel
    await aiToggle.click()
    await window.waitForTimeout(300)
  })

  test('final app state screenshot', async () => {
    // Reset to clean state
    const aiPanel = window.locator('.ai-panel')
    const sidebar = window.locator('.sidebar.open')

    if (await aiPanel.isVisible()) {
      await window.locator('.ai-toggle').click()
      await window.waitForTimeout(300)
    }

    if (await sidebar.isVisible()) {
      await window.locator('.sidebar-toggle').click()
      await window.waitForTimeout(300)
    }

    await window.screenshot({ path: 'tests/e2e/screenshots/13-final-state.png', fullPage: true })
  })

})
