import { useEffect, useState } from 'react'
import { useStore } from '../../stores/useStore'
import './StatusBar.css'

export function StatusBar() {
  const { currentFile, theme, toggleTheme } = useStore()
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const content = currentFile.content
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const chars = content.length
    setWordCount(words)
    setCharCount(chars)
  }, [currentFile.content])

  const getFileName = () => {
    if (!currentFile.filePath) return 'Untitled'
    return currentFile.filePath.split('/').pop() || currentFile.filePath.split('\\').pop() || 'Untitled'
  }

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-filename">
          {getFileName()}
          {currentFile.isDirty && <span className="status-dirty">*</span>}
        </span>
      </div>

      <div className="status-right">
        <span className="status-count">{wordCount} words</span>
        <span className="status-separator">•</span>
        <span className="status-count">{charCount} chars</span>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
