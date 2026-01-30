import { app, BrowserWindow, ipcMain, dialog, safeStorage, Menu, MenuItem } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { CustomMacUpdater } from './customUpdater'

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

// Get app version
const APP_VERSION = app.getVersion()

let mainWindow: BrowserWindow | null = null

// Custom updater for macOS (bypasses Squirrel.Mac signature requirement)
let customMacUpdater: CustomMacUpdater | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#FAFAFA',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Set up context menu with spell check suggestions
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add spell check suggestions
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => mainWindow?.webContents.replaceMisspelling(suggestion)
        }))
      }

      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }))
      }

      menu.append(new MenuItem({
        label: 'Add to Dictionary',
        click: () => mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }))

      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Standard edit menu items
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Cut', role: 'cut', enabled: params.editFlags.canCut }))
      menu.append(new MenuItem({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }))
      menu.append(new MenuItem({ label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }))
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
    }

    if (menu.items.length > 0) {
      menu.popup()
    }
  })
}

// Setup auto-updater based on platform
function setupAutoUpdater() {
  if (process.platform === 'darwin') {
    // Use custom updater for macOS (works without code signing)
    setupCustomMacUpdater()
  } else {
    // Use electron-updater for Windows/Linux
    setupElectronUpdater()
  }
}

// Custom macOS updater setup
function setupCustomMacUpdater() {
  log.info('[Main] Setting up custom macOS updater')

  customMacUpdater = new CustomMacUpdater({
    owner: 'gellasangameshgupta',
    repo: 'typid',
    currentVersion: APP_VERSION
  })

  customMacUpdater.on('update-available', (info) => {
    log.info('[Main] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)

    // Show dialog and start download
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.`,
      detail: 'Would you like to download and install it?',
      buttons: ['Download & Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(async (result) => {
      if (result.response === 0) {
        log.info('[Main] User accepted update, starting download...')

        // Show downloading notification
        const notification = new BrowserWindow({
          width: 300,
          height: 80,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          webPreferences: { nodeIntegration: false }
        })
        notification.loadURL(`data:text/html,
          <html>
            <body style="margin:0;padding:20px;background:rgba(0,0,0,0.8);color:white;font-family:system-ui;border-radius:10px;">
              <div id="status">Downloading update...</div>
              <div id="progress" style="margin-top:8px;font-size:12px;color:#aaa;">0%</div>
            </body>
          </html>
        `)

        customMacUpdater!.on('download-progress', (percent) => {
          notification.webContents.executeJavaScript(
            `document.getElementById('progress').textContent = '${percent.toFixed(1)}%'`
          ).catch(() => {})
        })

        const success = await customMacUpdater!.downloadUpdate()
        notification.close()

        if (success) {
          // Show ready to install dialog
          dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} is ready to install.`,
            detail: 'The app will close and restart with the new version.',
            buttons: ['Install & Restart', 'Later'],
            defaultId: 0,
            cancelId: 1
          }).then(async (installResult) => {
            if (installResult.response === 0) {
              log.info('[Main] User confirmed install, running update script...')
              try {
                await customMacUpdater!.quitAndInstall()
              } catch (err) {
                log.error('[Main] Failed to install update:', err)
                dialog.showErrorBox('Update Failed', 'Failed to install the update. Please try downloading manually from GitHub.')
              }
            }
          })
        } else {
          dialog.showErrorBox('Download Failed', 'Failed to download the update. Please try again later.')
        }
      }
    })
  })

  customMacUpdater.on('error', (error) => {
    log.error('[Main] Custom updater error:', error)
  })

  // Check for updates every 30 minutes (in milliseconds)
  const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000

  // Function to check for updates
  const checkForUpdates = () => {
    log.info('[Main] Checking for updates with custom updater...')
    customMacUpdater!.checkForUpdates().then((updateInfo) => {
      if (!updateInfo) {
        log.info('[Main] No updates available')
      }
    }).catch((err) => {
      log.error('[Main] Failed to check for updates:', err)
    })
  }

  // Initial check
  checkForUpdates()

  // Periodic background checks
  setInterval(() => {
    log.info('[Main] Periodic update check (macOS)...')
    checkForUpdates()
  }, UPDATE_CHECK_INTERVAL)
}

// electron-updater setup for Windows/Linux
function setupElectronUpdater() {
  log.info('[Main] Setting up electron-updater for Windows/Linux')

  // Check for updates every 30 minutes (in milliseconds)
  const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available - app is up to date')
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`)
    mainWindow?.webContents.send('update-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version)

    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart now to install the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        log.info('User chose to restart - calling quitAndInstall()')
        setImmediate(() => {
          app.removeAllListeners('window-all-closed')
          autoUpdater.quitAndInstall(false, true)
        })
      }
    })
  })

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error)
  })

  // Initial check
  autoUpdater.checkForUpdatesAndNotify()

  // Periodic background checks
  setInterval(() => {
    log.info('[Main] Periodic update check...')
    autoUpdater.checkForUpdatesAndNotify()
  }, UPDATE_CHECK_INTERVAL)
}

app.whenReady().then(() => {
  createWindow()

  // Check for updates after a short delay
  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      setupAutoUpdater()
    }, 5000) // 5 second delay to let app fully load
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers for file operations
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  return { filePath, content }
})

ipcMain.handle('save-file', async (_, { filePath, content }: { filePath: string | null, content: string }) => {
  let savePath = filePath

  if (!savePath) {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [
        { name: 'Markdown', extensions: ['md'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }
    savePath = result.filePath
  }

  await writeFile(savePath, content, 'utf-8')
  return savePath
})

ipcMain.handle('read-file', async (_, filePath: string) => {
  const content = await readFile(filePath, 'utf-8')
  return content
})

// Set window title with file path
ipcMain.handle('set-title', async (_, { filePath, isDirty }: { filePath: string | null, isDirty: boolean }) => {
  if (!mainWindow) return

  if (filePath) {
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Untitled'
    const dirtyIndicator = isDirty ? '• ' : ''

    // Set window title with path
    mainWindow.setTitle(`${dirtyIndicator}${fileName} — ${filePath}`)

    // macOS: Set represented file (shows icon in titlebar, cmd+click shows path)
    if (process.platform === 'darwin') {
      mainWindow.setRepresentedFilename(filePath)
      mainWindow.setDocumentEdited(isDirty)
    }
  } else {
    mainWindow.setTitle(isDirty ? '• Untitled — Typid' : 'Untitled — Typid')
    if (process.platform === 'darwin') {
      mainWindow.setRepresentedFilename('')
      mainWindow.setDocumentEdited(isDirty)
    }
  }
})

// Save image to assets folder next to the markdown file
ipcMain.handle('save-image', async (_, { documentPath, imageData, imageName }: {
  documentPath: string | null,
  imageData: string, // base64 encoded
  imageName: string
}): Promise<{ relativePath: string } | null> => {
  if (!documentPath) {
    // No document saved yet - prompt to save first or return null
    return null
  }

  try {
    const docDir = dirname(documentPath)
    const assetsDir = join(docDir, 'assets')

    // Create assets directory if it doesn't exist
    if (!existsSync(assetsDir)) {
      await mkdir(assetsDir, { recursive: true })
    }

    // Generate unique filename if exists
    let finalName = imageName
    let counter = 1
    const ext = extname(imageName)
    const base = basename(imageName, ext)

    while (existsSync(join(assetsDir, finalName))) {
      finalName = `${base}-${counter}${ext}`
      counter++
    }

    // Convert base64 to buffer and save
    const imageBuffer = Buffer.from(imageData, 'base64')
    const imagePath = join(assetsDir, finalName)
    await writeFile(imagePath, imageBuffer)

    // Return relative path for markdown
    return { relativePath: `assets/${finalName}` }
  } catch (error) {
    log.error('Failed to save image:', error)
    return null
  }
})

// AI Chat Handler with Streaming
interface AIRequest {
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  documentContent: string
  apiKey: string
  provider: 'claude' | 'openai' | 'ollama'
  model: string
  ollamaEndpoint?: string
}

ipcMain.handle('ai-chat-stream', async (event, request: AIRequest): Promise<void> => {
  const { messages, documentContent, apiKey, provider, model, ollamaEndpoint } = request
  const sender = event.sender

  // Build system prompt with document context
  const systemPrompt = `You are an AI writing assistant helping with a markdown document.
The user is currently working on the following document:

---
${documentContent.slice(0, 8000)}${documentContent.length > 8000 ? '\n...(document truncated)' : ''}
---

Help the user with questions about this document, writing improvements, grammar checks, explanations, and general assistance. Be concise and helpful.`

  try {
    sender.send('ai-stream-start')

    if (provider === 'claude') {
      await streamClaude(apiKey, systemPrompt, messages, model, sender)
    } else if (provider === 'openai') {
      await streamOpenAI(apiKey, systemPrompt, messages, model, sender)
    } else if (provider === 'ollama') {
      await streamOllama(ollamaEndpoint || 'http://localhost:11434', systemPrompt, messages, model, sender)
    }

    sender.send('ai-stream-end')
  } catch (error) {
    log.error('AI chat error:', error)
    sender.send('ai-stream-error', error instanceof Error ? error.message : 'Unknown error')
  }
})

// Claude Streaming API call
async function streamClaude(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  model: string,
  sender: Electron.WebContents
): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            sender.send('ai-stream-chunk', parsed.delta.text)
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }
}

// OpenAI Streaming API call
async function streamOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  model: string,
  sender: Electron.WebContents
): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 4096
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            sender.send('ai-stream-chunk', content)
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }
}

// Ollama Streaming API call
async function streamOllama(
  endpoint: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  model: string,
  sender: Electron.WebContents
): Promise<void> {
  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.message?.content) {
          sender.send('ai-stream-chunk', parsed.message.content)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
}

// Manual update check handler
ipcMain.handle('check-for-updates', async (): Promise<{ updateAvailable: boolean, version?: string, message: string }> => {
  log.info('[Main] Manual update check triggered')

  try {
    if (process.platform === 'darwin' && customMacUpdater) {
      const updateInfo = await customMacUpdater.checkForUpdates()
      if (updateInfo) {
        return {
          updateAvailable: true,
          version: updateInfo.version,
          message: `Version ${updateInfo.version} is available!`
        }
      }
      return {
        updateAvailable: false,
        message: `You're on the latest version (${APP_VERSION})`
      }
    } else {
      // For Windows/Linux, trigger the auto-updater check
      const result = await autoUpdater.checkForUpdates()
      if (result && result.updateInfo && result.updateInfo.version !== APP_VERSION) {
        return {
          updateAvailable: true,
          version: result.updateInfo.version,
          message: `Version ${result.updateInfo.version} is available!`
        }
      }
      return {
        updateAvailable: false,
        message: `You're on the latest version (${APP_VERSION})`
      }
    }
  } catch (error) {
    log.error('[Main] Manual update check failed:', error)
    return {
      updateAvailable: false,
      message: 'Failed to check for updates. Please try again later.'
    }
  }
})

// Get app version handler
ipcMain.handle('get-app-version', (): string => {
  return APP_VERSION
})

// Secure API key storage using OS keychain
const API_KEYS_FILE = join(app.getPath('userData'), 'api-keys.encrypted')

interface StoredApiKeys {
  claude?: string
  openai?: string
}

// Save API key securely
ipcMain.handle('save-api-key', async (_, data: { provider: string, apiKey: string }): Promise<boolean> => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('[Main] Encryption not available, falling back to basic storage')
    }

    // Load existing keys
    let keys: StoredApiKeys = {}
    if (existsSync(API_KEYS_FILE)) {
      try {
        const encrypted = await readFile(API_KEYS_FILE)
        const decrypted = safeStorage.decryptString(encrypted)
        keys = JSON.parse(decrypted)
      } catch {
        // File corrupted or empty, start fresh
        keys = {}
      }
    }

    // Update the key for this provider
    keys[data.provider as keyof StoredApiKeys] = data.apiKey

    // Encrypt and save
    const encrypted = safeStorage.encryptString(JSON.stringify(keys))
    await writeFile(API_KEYS_FILE, encrypted)

    log.info(`[Main] API key saved for provider: ${data.provider}`)
    return true
  } catch (error) {
    log.error('[Main] Failed to save API key:', error)
    return false
  }
})

// Load API key securely
ipcMain.handle('load-api-key', async (_, provider: string): Promise<string | null> => {
  try {
    if (!existsSync(API_KEYS_FILE)) {
      return null
    }

    const encrypted = await readFile(API_KEYS_FILE)
    const decrypted = safeStorage.decryptString(encrypted)
    const keys: StoredApiKeys = JSON.parse(decrypted)

    return keys[provider as keyof StoredApiKeys] || null
  } catch (error) {
    log.error('[Main] Failed to load API key:', error)
    return null
  }
})

// Delete API key
ipcMain.handle('delete-api-key', async (_, provider: string): Promise<boolean> => {
  try {
    if (!existsSync(API_KEYS_FILE)) {
      return true
    }

    const encrypted = await readFile(API_KEYS_FILE)
    const decrypted = safeStorage.decryptString(encrypted)
    const keys: StoredApiKeys = JSON.parse(decrypted)

    delete keys[provider as keyof StoredApiKeys]

    const newEncrypted = safeStorage.encryptString(JSON.stringify(keys))
    await writeFile(API_KEYS_FILE, newEncrypted)

    log.info(`[Main] API key deleted for provider: ${provider}`)
    return true
  } catch (error) {
    log.error('[Main] Failed to delete API key:', error)
    return false
  }
})
