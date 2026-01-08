import { useStore } from '../../stores/useStore'
import './Sidebar.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { recentFiles, theme, toggleTheme, focusMode, setFocusMode } = useStore()

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
              <ul className="recent-files">
                {recentFiles.map((path) => (
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
          </div>
        </div>
      </aside>
    </>
  )
}
