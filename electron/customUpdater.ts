/**
 * Custom macOS Updater - Bypasses Squirrel.Mac for unsigned apps
 *
 * This updater:
 * 1. Checks GitHub releases for new versions
 * 2. Downloads the zip file to a temp location
 * 3. Extracts the new .app bundle
 * 4. Spawns a shell script that replaces the app after quit
 * 5. Relaunches the updated app
 */

import { app, dialog, shell } from 'electron'
import { https } from 'follow-redirects'
import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync, chmodSync } from 'fs'
import { join } from 'path'
import { execSync, spawn } from 'child_process'
import { tmpdir } from 'os'
import log from 'electron-log'

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
  downloadUrl: string
}

export interface CustomUpdaterConfig {
  owner: string
  repo: string
  currentVersion: string
}

export class CustomMacUpdater {
  private config: CustomUpdaterConfig
  private updateInfo: UpdateInfo | null = null
  private downloadedZipPath: string | null = null
  private extractedAppPath: string | null = null
  private onUpdateAvailable?: (info: UpdateInfo) => void
  private onDownloadProgress?: (percent: number) => void
  private onUpdateDownloaded?: (info: UpdateInfo) => void
  private onError?: (error: Error) => void

  constructor(config: CustomUpdaterConfig) {
    this.config = config
  }

  on(event: 'update-available', callback: (info: UpdateInfo) => void): void
  on(event: 'download-progress', callback: (percent: number) => void): void
  on(event: 'update-downloaded', callback: (info: UpdateInfo) => void): void
  on(event: 'error', callback: (error: Error) => void): void
  on(event: string, callback: (...args: any[]) => void): void {
    switch (event) {
      case 'update-available':
        this.onUpdateAvailable = callback
        break
      case 'download-progress':
        this.onDownloadProgress = callback
        break
      case 'update-downloaded':
        this.onUpdateDownloaded = callback
        break
      case 'error':
        this.onError = callback
        break
    }
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      log.info('[CustomUpdater] Checking for updates...')

      const releaseInfo = await this.fetchLatestRelease()
      if (!releaseInfo) {
        log.info('[CustomUpdater] No release info found')
        return null
      }

      const latestVersion = releaseInfo.tag_name.replace(/^v/, '')
      const currentVersion = this.config.currentVersion

      log.info(`[CustomUpdater] Current: ${currentVersion}, Latest: ${latestVersion}`)

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        // Find the appropriate zip file for this architecture
        const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
        const zipAsset = releaseInfo.assets.find((asset: any) =>
          asset.name.includes(`mac`) &&
          asset.name.includes(arch) &&
          asset.name.endsWith('.zip')
        )

        if (!zipAsset) {
          // Fallback: try to find any mac zip
          const fallbackAsset = releaseInfo.assets.find((asset: any) =>
            asset.name.toLowerCase().includes('mac') &&
            asset.name.endsWith('.zip')
          )
          if (!fallbackAsset) {
            log.error('[CustomUpdater] No suitable zip file found in release assets')
            return null
          }
        }

        const downloadAsset = zipAsset || releaseInfo.assets.find((asset: any) =>
          asset.name.toLowerCase().includes('mac') && asset.name.endsWith('.zip')
        )

        this.updateInfo = {
          version: latestVersion,
          releaseDate: releaseInfo.published_at,
          releaseNotes: releaseInfo.body,
          downloadUrl: downloadAsset.browser_download_url
        }

        log.info(`[CustomUpdater] Update available: ${latestVersion}`)
        this.onUpdateAvailable?.(this.updateInfo)
        return this.updateInfo
      }

      log.info('[CustomUpdater] App is up to date')
      return null
    } catch (error) {
      log.error('[CustomUpdater] Error checking for updates:', error)
      this.onError?.(error as Error)
      return null
    }
  }

  async downloadUpdate(): Promise<boolean> {
    if (!this.updateInfo) {
      log.error('[CustomUpdater] No update info available')
      return false
    }

    try {
      log.info(`[CustomUpdater] Downloading update from: ${this.updateInfo.downloadUrl}`)

      // Create temp directory for download
      const tempDir = join(tmpdir(), 'typid-update')
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
      }

      this.downloadedZipPath = join(tempDir, `typid-${this.updateInfo.version}.zip`)

      // Remove old download if exists
      if (existsSync(this.downloadedZipPath)) {
        unlinkSync(this.downloadedZipPath)
      }

      await this.downloadFile(this.updateInfo.downloadUrl, this.downloadedZipPath)

      log.info(`[CustomUpdater] Download complete: ${this.downloadedZipPath}`)

      // Extract the zip
      this.extractedAppPath = await this.extractZip(this.downloadedZipPath, tempDir)

      if (this.extractedAppPath) {
        log.info(`[CustomUpdater] Extraction complete: ${this.extractedAppPath}`)
        this.onUpdateDownloaded?.(this.updateInfo)
        return true
      }

      return false
    } catch (error) {
      log.error('[CustomUpdater] Error downloading update:', error)
      this.onError?.(error as Error)
      return false
    }
  }

  async quitAndInstall(): Promise<void> {
    if (!this.extractedAppPath || !existsSync(this.extractedAppPath)) {
      log.error('[CustomUpdater] No extracted app found')
      throw new Error('No extracted app available for installation')
    }

    const currentAppPath = app.getAppPath()
    // Get the actual .app bundle path (go up from Resources/app.asar or Resources/app)
    let appBundlePath = currentAppPath

    // Navigate up to find the .app bundle
    while (appBundlePath && !appBundlePath.endsWith('.app')) {
      const parent = join(appBundlePath, '..')
      if (parent === appBundlePath) break
      appBundlePath = parent
    }

    // Resolve to absolute path
    appBundlePath = execSync(`cd "${appBundlePath}" && pwd`).toString().trim()

    log.info(`[CustomUpdater] Current app bundle: ${appBundlePath}`)
    log.info(`[CustomUpdater] New app bundle: ${this.extractedAppPath}`)

    // Create the update script
    const scriptPath = join(tmpdir(), 'typid-update.sh')
    const script = this.createUpdateScript(appBundlePath, this.extractedAppPath)

    writeFileSync(scriptPath, script, { mode: 0o755 })
    chmodSync(scriptPath, 0o755)

    log.info(`[CustomUpdater] Update script created at: ${scriptPath}`)

    // Spawn the script detached so it runs after we quit
    const child = spawn('/bin/bash', [scriptPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        HOME: process.env.HOME || ''
      }
    })

    child.unref()

    log.info('[CustomUpdater] Update script spawned, quitting app...')

    // Give the script a moment to start
    setTimeout(() => {
      app.quit()
    }, 500)
  }

  private createUpdateScript(currentAppPath: string, newAppPath: string): string {
    const appName = 'Typid'
    const bundleId = 'com.typid.app'

    return `#!/bin/bash
# Typid Auto-Update Script
# Waits for app to quit, replaces it, and relaunches

LOG_FILE="/tmp/typid-update.log"
echo "$(date): Update script started" >> "$LOG_FILE"

CURRENT_APP="${currentAppPath}"
NEW_APP="${newAppPath}"
APP_NAME="${appName}"
BUNDLE_ID="${bundleId}"

# Wait for the app to fully quit (max 30 seconds)
echo "$(date): Waiting for app to quit..." >> "$LOG_FILE"
for i in {1..60}; do
    if ! pgrep -f "$BUNDLE_ID" > /dev/null 2>&1 && ! pgrep -x "$APP_NAME" > /dev/null 2>&1; then
        echo "$(date): App has quit" >> "$LOG_FILE"
        break
    fi
    sleep 0.5
done

# Additional safety wait
sleep 1

# Verify the new app exists
if [ ! -d "$NEW_APP" ]; then
    echo "$(date): ERROR - New app not found at $NEW_APP" >> "$LOG_FILE"
    exit 1
fi

# Backup the current app (optional, remove if not needed)
BACKUP_PATH="/tmp/typid-backup-$(date +%s).app"
echo "$(date): Creating backup at $BACKUP_PATH" >> "$LOG_FILE"
cp -R "$CURRENT_APP" "$BACKUP_PATH" 2>> "$LOG_FILE"

# Remove the old app
echo "$(date): Removing old app at $CURRENT_APP" >> "$LOG_FILE"
rm -rf "$CURRENT_APP"

if [ -d "$CURRENT_APP" ]; then
    echo "$(date): ERROR - Failed to remove old app" >> "$LOG_FILE"
    # Restore backup
    cp -R "$BACKUP_PATH" "$CURRENT_APP"
    exit 1
fi

# Move the new app into place
echo "$(date): Installing new app from $NEW_APP to $CURRENT_APP" >> "$LOG_FILE"
mv "$NEW_APP" "$CURRENT_APP"

if [ ! -d "$CURRENT_APP" ]; then
    echo "$(date): ERROR - Failed to install new app" >> "$LOG_FILE"
    # Restore backup
    cp -R "$BACKUP_PATH" "$CURRENT_APP"
    exit 1
fi

# Clear extended attributes that might cause issues
echo "$(date): Clearing quarantine attributes..." >> "$LOG_FILE"
xattr -cr "$CURRENT_APP" 2>> "$LOG_FILE"

# Clean up backup after successful update
rm -rf "$BACKUP_PATH" 2>/dev/null

# Clean up the temp directory
rm -rf "$(dirname "$NEW_APP")" 2>/dev/null

echo "$(date): Update complete, launching app..." >> "$LOG_FILE"

# Wait a moment before launching
sleep 1

# Launch the updated app
open "$CURRENT_APP"

echo "$(date): App launched successfully" >> "$LOG_FILE"

# Clean up this script
rm -f "$0"
`
  }

  private async fetchLatestRelease(): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.config.owner}/${this.config.repo}/releases/latest`,
        method: 'GET',
        headers: {
          'User-Agent': 'Typid-Updater',
          'Accept': 'application/vnd.github.v3+json'
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data))
            } else if (res.statusCode === 404) {
              resolve(null)
            } else {
              reject(new Error(`GitHub API returned ${res.statusCode}`))
            }
          } catch (e) {
            reject(e)
          }
        })
      })

      req.on('error', reject)
      req.end()
    })
  }

  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(destPath)

      https.get(url, (response) => {
        // Handle redirects (GitHub uses them for asset downloads)
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            file.close()
            unlinkSync(destPath)
            return this.downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
          }
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloadedSize = 0

        response.on('data', (chunk) => {
          downloadedSize += chunk.length
          if (totalSize > 0) {
            const percent = (downloadedSize / totalSize) * 100
            this.onDownloadProgress?.(percent)
          }
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })

        file.on('error', (err) => {
          unlinkSync(destPath)
          reject(err)
        })
      }).on('error', (err) => {
        unlinkSync(destPath)
        reject(err)
      })
    })
  }

  private async extractZip(zipPath: string, destDir: string): Promise<string | null> {
    try {
      const extractDir = join(destDir, 'extracted')

      // Remove old extracted content
      if (existsSync(extractDir)) {
        execSync(`rm -rf "${extractDir}"`)
      }
      mkdirSync(extractDir, { recursive: true })

      // Use ditto for extraction (preserves macOS attributes)
      log.info(`[CustomUpdater] Extracting ${zipPath} to ${extractDir}`)
      execSync(`ditto -xk "${zipPath}" "${extractDir}"`)

      // Find the .app bundle in the extracted content
      const output = execSync(`find "${extractDir}" -name "*.app" -type d -maxdepth 2`).toString().trim()
      const appPaths = output.split('\n').filter(p => p.endsWith('.app'))

      if (appPaths.length === 0) {
        log.error('[CustomUpdater] No .app bundle found in zip')
        return null
      }

      log.info(`[CustomUpdater] Found app bundle: ${appPaths[0]}`)
      return appPaths[0]
    } catch (error) {
      log.error('[CustomUpdater] Extraction error:', error)
      return null
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number)
    const currentParts = current.split('.').map(Number)

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0
      const currentPart = currentParts[i] || 0

      if (latestPart > currentPart) return true
      if (latestPart < currentPart) return false
    }

    return false
  }
}
