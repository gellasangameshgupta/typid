import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

let mainWindow: BrowserWindow | null = null

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
      contextIsolation: true
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
}

app.whenReady().then(() => {
  createWindow()

  // Check for updates after a short delay (don't check on first launch for Windows)
  if (!process.env.VITE_DEV_SERVER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 10000) // 10 second delay
  }
})

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...')
})

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version)
  // Notify renderer process
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
  // Show dialog to user
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'Restart now to install the update?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})

autoUpdater.on('error', (error) => {
  log.error('Auto-updater error:', error)
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
