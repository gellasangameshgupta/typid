import { useState, useCallback, useEffect } from 'react'
import { Editor } from './components/Editor'
import { Sidebar } from './components/Sidebar'
import { AIPanel } from './components/AIPanel'
import { StatusBar } from './components/StatusBar'
import { FindReplace } from './components/FindReplace'
import { useStore } from './stores/useStore'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, currentFile, setDirty, aiPanelOpen, toggleAIPanel } = useStore()
  const [hasRestoredFile, setHasRestoredFile] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  // Restore last open file on startup
  useEffect(() => {
    if (hasRestoredFile) return
    setHasRestoredFile(true)

    const { lastOpenFile, setContent, setFilePath, addRecentFile } = useStore.getState()
    if (!lastOpenFile) return

    window.electronAPI?.readFile(lastOpenFile)
      .then((content) => {
        setContent(content)
        setFilePath(lastOpenFile)
        setDirty(false)
        addRecentFile(lastOpenFile)
      })
      .catch(() => {
        // File may have been deleted — silently ignore
      })
  }, [hasRestoredFile, setDirty])

  // Update window title when file or dirty state changes
  useEffect(() => {
    window.electronAPI?.setTitle({
      filePath: currentFile.filePath,
      isDirty: currentFile.isDirty
    })
  }, [currentFile.filePath, currentFile.isDirty])

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
        <button
          className={`ai-toggle ${aiPanelOpen ? 'active' : ''}`}
          onClick={toggleAIPanel}
          aria-label="Toggle AI assistant"
          title="AI Assistant (Cmd+Shift+A)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="main-container">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="editor-container">
          <FindReplace />
          <Editor />
        </main>
        <AIPanel />
      </div>

      <StatusBar />
    </div>
  )
}

export default App
