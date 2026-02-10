import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../stores/useStore'
import './FindReplace.css'

// Type declarations for CSS Custom Highlight API
declare global {
  interface Window {
    Highlight: new (...ranges: Range[]) => Highlight
  }
  interface Highlight {
    add(range: Range): void
    clear(): void
  }
  interface HighlightRegistry {
    set(name: string, highlight: Highlight): void
    delete(name: string): boolean
    clear(): void
  }
  interface CSS {
    highlights?: HighlightRegistry
  }
}

export function FindReplace() {
  const { findReplaceOpen, setFindReplaceOpen, currentFile } = useStore()
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matchRangesRef = useRef<Range[]>([])

  const escapeRegex = useCallback((str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }, [])

  const clearHighlights = useCallback(() => {
    // Clear CSS Custom Highlights
    if (CSS.highlights) {
      CSS.highlights.delete('find-matches')
      CSS.highlights.delete('find-current')
    }
    matchRangesRef.current = []
  }, [])

  const applyHighlights = useCallback((text: string, currentIdx: number) => {
    clearHighlights()
    if (!text) return

    const proseMirror = document.querySelector('.ProseMirror')
    if (!proseMirror) return

    const walker = document.createTreeWalker(
      proseMirror,
      NodeFilter.SHOW_TEXT,
      null
    )

    const textNodes: Text[] = []
    let node: Text | null
    while ((node = walker.nextNode() as Text)) {
      textNodes.push(node)
    }

    const regex = new RegExp(escapeRegex(text), 'gi')
    const allRanges: Range[] = []
    let currentRange: Range | null = null

    let globalMatchIndex = 0

    textNodes.forEach((textNode) => {
      const nodeText = textNode.textContent || ''
      let match

      regex.lastIndex = 0

      while ((match = regex.exec(nodeText)) !== null) {
        try {
          const range = document.createRange()
          range.setStart(textNode, match.index)
          range.setEnd(textNode, match.index + match[0].length)
          allRanges.push(range)

          // Track current match (currentIdx is 1-based)
          if (globalMatchIndex === currentIdx - 1) {
            currentRange = range
          }
          globalMatchIndex++
        } catch (e) {
          console.warn('Could not create range:', e)
        }
      }
    })

    matchRangesRef.current = allRanges

    // Use CSS Custom Highlight API if available
    if (CSS.highlights && window.Highlight) {
      if (allRanges.length > 0) {
        const highlight = new window.Highlight(...allRanges)
        CSS.highlights.set('find-matches', highlight)
      }

      if (currentRange) {
        const currentHighlight = new window.Highlight(currentRange)
        CSS.highlights.set('find-current', currentHighlight)

        // Scroll current match into view
        const rect = currentRange.getBoundingClientRect()
        const container = proseMirror.closest('.editor-wrapper')
        if (container && rect) {
          const containerRect = container.getBoundingClientRect()
          if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
            const startNode = currentRange.startContainer.parentElement
            startNode?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }

    return allRanges.length
  }, [escapeRegex, clearHighlights])

  // Focus input when opened
  useEffect(() => {
    if (findReplaceOpen) {
      findInputRef.current?.focus()
      findInputRef.current?.select()
    }
  }, [findReplaceOpen])

  // Get text content from rendered editor (not markdown source)
  const getRenderedText = useCallback(() => {
    const proseMirror = document.querySelector('.ProseMirror')
    if (!proseMirror) return ''
    return proseMirror.textContent || ''
  }, [])

  // Count matches and highlight when find text or content changes
  useEffect(() => {
    if (!findText) {
      setMatchCount(0)
      setCurrentMatch(0)
      clearHighlights()
      return
    }

    // Debounce to let ProseMirror render first
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }

    highlightTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        // Count matches in the rendered text (not markdown source)
        const renderedText = getRenderedText()
        const regex = new RegExp(escapeRegex(findText), 'gi')
        const matches = renderedText.match(regex)
        const count = matches?.length || 0

        setMatchCount(count)
        setCurrentMatch(count ? 1 : 0)

        // Apply highlights
        applyHighlights(findText, count ? 1 : 0)
      })
    }, 100)

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [findText, currentFile.content, escapeRegex, clearHighlights, applyHighlights, getRenderedText])

  // Clear highlights when closed
  useEffect(() => {
    if (!findReplaceOpen) {
      clearHighlights()
      setFindText('')
    }
  }, [findReplaceOpen, clearHighlights])

  const updateCurrentHighlight = useCallback((matchIdx: number) => {
    if (!CSS.highlights || !window.Highlight) return

    const ranges = matchRangesRef.current
    if (ranges.length === 0) return

    // Update current highlight (matchIdx is 1-based)
    const currentRange = ranges[matchIdx - 1]
    if (currentRange) {
      const currentHighlight = new window.Highlight(currentRange)
      CSS.highlights.set('find-current', currentHighlight)

      // Scroll into view
      const startNode = currentRange.startContainer.parentElement
      startNode?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const findNext = useCallback(() => {
    if (matchCount === 0) return

    // Move to next (wrap around)
    const nextMatch = currentMatch >= matchCount ? 1 : currentMatch + 1
    setCurrentMatch(nextMatch)
    updateCurrentHighlight(nextMatch)
  }, [matchCount, currentMatch, updateCurrentHighlight])

  const findPrevious = useCallback(() => {
    if (matchCount === 0) return

    // Move to previous (wrap around)
    const prevMatch = currentMatch <= 1 ? matchCount : currentMatch - 1
    setCurrentMatch(prevMatch)
    updateCurrentHighlight(prevMatch)
  }, [matchCount, currentMatch, updateCurrentHighlight])

  const replaceOne = useCallback(() => {
    if (!findText || matchCount === 0) return

    const content = currentFile.content
    const regex = new RegExp(escapeRegex(findText), 'i')
    const newContent = content.replace(regex, replaceText)

    // Clear highlights before update to avoid stale references
    clearHighlights()
    useStore.getState().setContent(newContent)
  }, [findText, matchCount, currentFile.content, replaceText, escapeRegex, clearHighlights])

  const replaceAll = useCallback(() => {
    if (!findText || matchCount === 0) return

    const content = currentFile.content
    const regex = new RegExp(escapeRegex(findText), 'gi')
    const newContent = content.replace(regex, replaceText)

    // Clear highlights before update
    clearHighlights()
    useStore.getState().setContent(newContent)
  }, [findText, matchCount, currentFile.content, replaceText, escapeRegex, clearHighlights])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFindReplaceOpen(false)
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        findPrevious()
      } else {
        findNext()
      }
    }
  }

  if (!findReplaceOpen) return null

  return (
    <div className="find-replace-bar">
      <div className="find-row">
        <input
          ref={findInputRef}
          type="text"
          placeholder="Find"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="find-input"
        />
        <span className="match-count">
          {findText ? `${currentMatch} of ${matchCount}` : ''}
        </span>
        <button onClick={findPrevious} disabled={matchCount === 0} title="Previous (Shift+Enter)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button onClick={findNext} disabled={matchCount === 0} title="Next (Enter)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={showReplace ? 'active' : ''}
          title="Toggle Replace"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
        <button onClick={() => setFindReplaceOpen(false)} title="Close (Esc)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {showReplace && (
        <div className="replace-row">
          <input
            type="text"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="find-input"
          />
          <button onClick={replaceOne} disabled={matchCount === 0} title="Replace">
            Replace
          </button>
          <button onClick={replaceAll} disabled={matchCount === 0} title="Replace All">
            All
          </button>
        </div>
      )}
    </div>
  )
}
