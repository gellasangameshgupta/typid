import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../stores/useStore'
import './WorkspaceSearch.css'

export function WorkspaceSearch() {
  const {
    workspacePath,
    workspaceSearchOpen,
    workspaceSearchQuery,
    workspaceSearchResults,
    workspaceSearchLoading,
    setWorkspaceSearchOpen,
    setWorkspaceSearchQuery,
    setWorkspaceSearchResults,
    setWorkspaceSearchLoading
  } = useStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when panel opens
  useEffect(() => {
    if (workspaceSearchOpen) {
      inputRef.current?.focus()
    }
  }, [workspaceSearchOpen])

  // Clean up on close
  useEffect(() => {
    if (!workspaceSearchOpen) {
      setWorkspaceSearchQuery('')
      setWorkspaceSearchResults([])
    }
  }, [workspaceSearchOpen, setWorkspaceSearchQuery, setWorkspaceSearchResults])

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !workspacePath) {
      setWorkspaceSearchResults([])
      setWorkspaceSearchLoading(false)
      return
    }

    setWorkspaceSearchLoading(true)
    try {
      const results = await window.electronAPI.searchWorkspace({
        workspacePath,
        query: query.trim()
      })
      setWorkspaceSearchResults(results)
    } catch {
      setWorkspaceSearchResults([])
    } finally {
      setWorkspaceSearchLoading(false)
    }
  }, [workspacePath, setWorkspaceSearchResults, setWorkspaceSearchLoading])

  const handleInputChange = (value: string) => {
    setWorkspaceSearchQuery(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  const handleOpenMatch = async (filePath: string) => {
    try {
      const content = await window.electronAPI.readFile(filePath)
      useStore.getState().setFilePath(filePath)
      useStore.getState().setContent(content)
      useStore.getState().setDirty(false)
      useStore.getState().addRecentFile(filePath)
      setWorkspaceSearchOpen(false)
    } catch {
      console.error('Could not open file:', filePath)
    }
  }

  const getRelativePath = (filePath: string) => {
    if (workspacePath && filePath.startsWith(workspacePath)) {
      return filePath.slice(workspacePath.length + 1)
    }
    return filePath
  }

  const totalMatches = workspaceSearchResults.reduce((sum, r) => sum + r.matches.length, 0)

  if (!workspaceSearchOpen) return null

  return (
    <div className="workspace-search-overlay" onClick={() => setWorkspaceSearchOpen(false)}>
      <div className="workspace-search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="workspace-search-header">
          <div className="workspace-search-input-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={workspaceSearchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search across workspace files..."
              className="workspace-search-input"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setWorkspaceSearchOpen(false)
                }
              }}
            />
            {workspaceSearchLoading && (
              <svg width="16" height="16" viewBox="0 0 24 24" className="search-spinner">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeLinecap="round" />
              </svg>
            )}
          </div>
          {workspaceSearchQuery && !workspaceSearchLoading && (
            <div className="workspace-search-summary">
              {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in {workspaceSearchResults.length} file{workspaceSearchResults.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="workspace-search-results">
          {workspaceSearchResults.map((result) => (
            <div key={result.filePath} className="search-result-file">
              <div className="search-result-filename">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="search-result-path">{getRelativePath(result.filePath)}</span>
                <span className="search-result-count">{result.matches.length}</span>
              </div>
              {result.matches.map((match, i) => (
                <button
                  key={`${match.lineNumber}-${i}`}
                  className="search-result-match"
                  onClick={() => handleOpenMatch(result.filePath)}
                >
                  <span className="match-line-number">{match.lineNumber}</span>
                  <span className="match-line-text">
                    {match.lineText.slice(0, match.matchStart)}
                    <mark>{match.lineText.slice(match.matchStart, match.matchEnd)}</mark>
                    {match.lineText.slice(match.matchEnd)}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {workspaceSearchQuery && !workspaceSearchLoading && workspaceSearchResults.length === 0 && (
            <div className="workspace-search-empty">No results found</div>
          )}
        </div>
      </div>
    </div>
  )
}
