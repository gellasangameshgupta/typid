import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
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

  // Check for updates
  log.info('[Main] Checking for updates with custom updater...')
  customMacUpdater.checkForUpdates().then((updateInfo) => {
    if (!updateInfo) {
      log.info('[Main] No updates available')
    }
  }).catch((err) => {
    log.error('[Main] Failed to check for updates:', err)
  })
}

// electron-updater setup for Windows/Linux
function setupElectronUpdater() {
  log.info('[Main] Setting up electron-updater for Windows/Linux')

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

  autoUpdater.checkForUpdatesAndNotify()
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
