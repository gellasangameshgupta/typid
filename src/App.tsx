import { useState, useCallback, useEffect } from 'react'
import { Editor } from './components/Editor'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { useStore } from './stores/useStore'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, currentFile, setDirty } = useStore()

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (!currentFile.isDirty || !currentFile.filePath) return

    const autoSaveTimer = setTimeout(async () => {
      try {
        const savePath = await window.electronAPI.saveFile({
          filePath: currentFile.filePath,
          content: currentFile.content
        })
        if (savePath) {
          setDirty(false)
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [currentFile.content, currentFile.filePath, currentFile.isDirty, setDirty])

  return (
    <div className={`app ${theme}`}>
      <div className="titlebar">
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="titlebar-drag" />
      </div>

      <div className="main-container">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="editor-container">
          <Editor />
        </main>
      </div>

      <StatusBar />
    </div>
  )
}

export default App
