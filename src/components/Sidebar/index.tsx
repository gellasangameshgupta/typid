import { useState, useEffect } from 'react'
import { useStore } from '../../stores/useStore'
import './Sidebar.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface GroupedFiles {
  [folder: string]: {
    fullPath: string
    files: string[]
  }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { recentFiles, theme, toggleTheme, focusMode, setFocusMode, typewriterMode, setTypewriterMode, spellCheck, setSpellCheck } = useStore()
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  // Get app version on mount
  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(setAppVersion).catch(() => {})
  }, [])

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true)
    setUpdateStatus('Checking...')
    try {
      const result = await window.electronAPI.checkForUpdates()
      setUpdateStatus(result.message)
    } catch {
      setUpdateStatus('Failed to check for updates')
    } finally {
      setIsCheckingUpdate(false)
      // Clear status after 5 seconds
      setTimeout(() => setUpdateStatus(''), 5000)
    }
  }

  const handleOpenFile = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      useStore.getState().setFilePath(result.filePath)
      useStore.getState().setContent(result.content)
      useStore.getState().setDirty(false)
      useStore.getState().addRecentFile(result.filePath)
      onClose()
    }
  }

  const handleNewFile = () => {
    useStore.getState().resetFile()
    onClose()
  }

  const handleRecentFile = async (path: string) => {
    try {
      const content = await window.electronAPI.readFile(path)
      useStore.getState().setFilePath(path)
      useStore.getState().setContent(content)
      useStore.getState().setDirty(false)
      onClose()
    } catch {
      // File might not exist anymore
      console.error('Could not open file:', path)
    }
  }

  const getFileName = (path: string) => {
    return path.split('/').pop() || path.split('\\').pop() || path
  }

  const getParentFolder = (path: string) => {
    const parts = path.split(/[/\\]/)
    parts.pop() // Remove filename
    return parts.join('/')
  }

  const getFolderName = (path: string) => {
    const parts = path.split(/[/\\]/)
    // Return last 2 parts for context (e.g., "projects/typid")
    if (parts.length >= 2) {
      return parts.slice(-2).join('/')
    }
    return parts[parts.length - 1] || 'Root'
  }

  // Group files by their parent folder
  const groupedFiles: GroupedFiles = recentFiles.reduce((acc, filePath) => {
    const folder = getParentFolder(filePath)
    const folderName = getFolderName(folder)
    if (!acc[folderName]) {
      acc[folderName] = { fullPath: folder, files: [] }
    }
    acc[folderName].files.push(filePath)
    return acc
  }, {} as GroupedFiles)

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folder)) {
        next.delete(folder)
      } else {
        next.add(folder)
      }
      return next
    })
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <button className="sidebar-button" onClick={handleNewFile}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              New File
            </button>
            <button className="sidebar-button" onClick={handleOpenFile}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Open File
            </button>
          </div>

          {recentFiles.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-heading">Recent Files</h3>
              <div className="recent-files-grouped">
                {Object.entries(groupedFiles).map(([folderName, { fullPath, files }]) => (
                  <div key={folderName} className="folder-group">
                    <button
                      className="folder-header"
                      onClick={() => toggleFolder(folderName)}
                      title={fullPath}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={`folder-chevron ${collapsedFolders.has(folderName) ? 'collapsed' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="folder-name">{folderName}</span>
                      <span className="folder-count">{files.length}</span>
                    </button>
                    {!collapsedFolders.has(folderName) && (
                      <ul className="folder-files">
                        {files.map((path) => (
                          <li key={path}>
                            <button
                              className="recent-file-button"
                              onClick={() => handleRecentFile(path)}
                              title={path}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              {getFileName(path)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-section sidebar-settings">
            <h3 className="sidebar-heading">Settings</h3>
            <label className="setting-toggle">
              <span>Dark Mode</span>
              <button
                className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`}
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
              >
                <span className="toggle-knob" />
              </button>
            </label>
            <label className="setting-toggle">
              <span>Focus Mode</span>
              <button
                className={`toggle-switch ${focusMode ? 'on' : ''}`}
                onClick={() => setFocusMode(!focusMode)}
                aria-label="Toggle focus mode"
              >
                <span className="toggle-knob" />
              </button>
            </label>
            <label className="setting-toggle">
              <span>Typewriter Mode</span>
              <button
                className={`toggle-switch ${typewriterMode ? 'on' : ''}`}
                onClick={() => setTypewriterMode(!typewriterMode)}
                aria-label="Toggle typewriter mode"
              >
                <span className="toggle-knob" />
              </button>
            </label>
            <label className="setting-toggle">
              <span>Spell Check</span>
              <button
                className={`toggle-switch ${spellCheck ? 'on' : ''}`}
                onClick={() => setSpellCheck(!spellCheck)}
                aria-label="Toggle spell check"
              >
                <span className="toggle-knob" />
              </button>
            </label>
          </div>

          <div className="sidebar-section sidebar-about">
            <h3 className="sidebar-heading">About</h3>
            {appVersion && (
              <div className="app-version">Version {appVersion}</div>
            )}
            <button
              className="sidebar-button update-button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12a9 9 0 1 1-9-9" />
                <polyline points="21 3 21 9 15 9" />
                <path d="M21 9l-6-6" />
              </svg>
              {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
            </button>
            {updateStatus && (
              <div className={`update-status ${updateStatus.includes('available') ? 'update-available' : ''}`}>
                {updateStatus}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
