import { useEffect, useRef, useCallback } from 'react'
import { Crepe } from '@milkdown/crepe'
import { useStore } from '../../stores/useStore'
import '@milkdown/crepe/theme/common/style.css'
import './Editor.css'

export function Editor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const { currentFile, setContent, focusMode, typewriterMode, spellCheck, setDirty, textToInsert, clearTextToInsert } = useStore()
  const fileVersionRef = useRef(0)
  const currentBlockRef = useRef<Element | null>(null)

  // Track current block for focus mode
  const updateCurrentBlock = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selection.focusNode) return

    // Find the top-level block element
    let node: Node | null = selection.focusNode
    let blockElement: Element | null = null

    // Walk up to find the direct child of ProseMirror
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const parent = (node as Element).parentElement
        if (parent?.classList.contains('ProseMirror')) {
          blockElement = node as Element
          break
        }
      }
      node = node.parentNode
    }

    // Update current block class
    if (blockElement !== currentBlockRef.current) {
      currentBlockRef.current?.classList.remove('is-current-block')
      blockElement?.classList.add('is-current-block')
      currentBlockRef.current = blockElement

      // Typewriter mode: scroll to center
      if (typewriterMode && blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [typewriterMode])

  // Update spellcheck when setting changes
  useEffect(() => {
    const proseMirror = editorRef.current?.querySelector('.ProseMirror') as HTMLElement
    if (proseMirror) {
      proseMirror.setAttribute('spellcheck', String(spellCheck))
    }
  }, [spellCheck])

  // Set up selection change listener for focus/typewriter modes
  useEffect(() => {
    if (!focusMode && !typewriterMode) return

    const handleSelectionChange = () => {
      requestAnimationFrame(updateCurrentBlock)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [focusMode, typewriterMode, updateCurrentBlock])

  // Initialize/reinitialize editor when file changes
  useEffect(() => {
    if (!editorRef.current) return

    // Increment version to track which file we're editing
    const currentVersion = ++fileVersionRef.current

    // Destroy existing editor
    if (crepeRef.current) {
      crepeRef.current.destroy()
      crepeRef.current = null
    }

    // Clear the container
    if (editorRef.current) {
      editorRef.current.innerHTML = ''
    }

    const initEditor = async () => {
      // Check if this initialization is still valid
      if (currentVersion !== fileVersionRef.current) return

      const crepe = new Crepe({
        root: editorRef.current!,
        defaultValue: currentFile.content || '# Welcome to Typid\n\nStart writing your thoughts...',
        features: {
          [Crepe.Feature.CodeMirror]: true,
          [Crepe.Feature.ListItem]: true,
          [Crepe.Feature.LinkTooltip]: true,
          [Crepe.Feature.ImageBlock]: true,
          [Crepe.Feature.BlockEdit]: true,
          [Crepe.Feature.Placeholder]: true,
          [Crepe.Feature.Cursor]: true,
          [Crepe.Feature.Latex]: true,
          [Crepe.Feature.Table]: true,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: 'Start writing...',
            mode: 'block' as const,
          },
          [Crepe.Feature.Latex]: {
            katexOptions: {
              throwOnError: false,
            },
          },
        },
      })

      // Listen for changes
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            setContent(markdown)
            setDirty(true)
          }
        })
      })

      await crepe.create()

      // Enable spellcheck on the editor based on setting
      const proseMirror = editorRef.current?.querySelector('.ProseMirror') as HTMLElement
      if (proseMirror) {
        proseMirror.setAttribute('spellcheck', String(useStore.getState().spellCheck))
      }

      // Only set ref if this is still the current version
      if (currentVersion === fileVersionRef.current) {
        crepeRef.current = crepe
      } else {
        crepe.destroy()
      }
    }

    initEditor()

    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy()
        crepeRef.current = null
      }
    }
  }, [currentFile.filePath]) // Reinitialize when file path changes

  // Image handling helper
  const handleImageFile = useCallback(async (file: File) => {
    const state = useStore.getState()
    const documentPath = state.currentFile.filePath

    // Read file as base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64Data = dataUrl.split(',')[1]

      if (documentPath) {
        // Save to assets folder
        const result = await window.electronAPI.saveImage({
          documentPath,
          imageData: base64Data,
          imageName: file.name
        })

        if (result) {
          // Insert markdown image with relative path
          const markdown = `![${file.name}](${result.relativePath})`
          insertTextAtCursor(markdown)
        }
      } else {
        // No file saved yet - use base64 data URL
        const markdown = `![${file.name}](${dataUrl})`
        insertTextAtCursor(markdown)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  // Insert text at current cursor position
  const insertTextAtCursor = useCallback((text: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    const textNode = document.createTextNode(text)
    range.insertNode(textNode)

    // Move cursor after inserted text
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    selection.removeAllRanges()
    selection.addRange(range)

    // Trigger input event for Milkdown to pick up the change
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
  }, [])

  // Handle text insertion from AI panel
  useEffect(() => {
    if (textToInsert) {
      const proseMirror = editorRef.current?.querySelector('.ProseMirror') as HTMLElement
      if (proseMirror) {
        // Focus the editor
        proseMirror.focus()

        // Move cursor to end of document
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(proseMirror)
        range.collapse(false) // collapse to end
        selection?.removeAllRanges()
        selection?.addRange(range)

        // Insert text with line breaks using execCommand (inserts as plain text)
        const textWithNewlines = '\n\n' + textToInsert
        document.execCommand('insertText', false, textWithNewlines)

        // Scroll to bottom
        proseMirror.scrollTop = proseMirror.scrollHeight
      }
      clearTextToInsert()
    }
  }, [textToInsert, clearTextToInsert])

  // Handle drag & drop for images
  useEffect(() => {
    const wrapper = editorRef.current?.parentElement
    if (!wrapper) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      wrapper.classList.add('drag-over')
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      wrapper.classList.remove('drag-over')
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      wrapper.classList.remove('drag-over')

      const files = e.dataTransfer?.files
      if (!files) return

      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await handleImageFile(file)
        }
      }
    }

    wrapper.addEventListener('dragover', handleDragOver)
    wrapper.addEventListener('dragleave', handleDragLeave)
    wrapper.addEventListener('drop', handleDrop)

    return () => {
      wrapper.removeEventListener('dragover', handleDragOver)
      wrapper.removeEventListener('dragleave', handleDragLeave)
      wrapper.removeEventListener('drop', handleDrop)
    }
  }, [handleImageFile])

  // Handle paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            // Generate a name for pasted images
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const ext = file.type.split('/')[1] || 'png'
            const namedFile = new File([file], `pasted-image-${timestamp}.${ext}`, { type: file.type })
            await handleImageFile(namedFile)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleImageFile])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + O: Open file
      if (isMod && e.key === 'o') {
        e.preventDefault()
        const result = await window.electronAPI.openFile()
        if (result) {
          useStore.getState().setContent(result.content)
          useStore.getState().setFilePath(result.filePath)
          useStore.getState().setDirty(false)
          useStore.getState().addRecentFile(result.filePath)
        }
      }

      // Cmd/Ctrl + S: Save file
      if (isMod && e.key === 's') {
        e.preventDefault()
        const state = useStore.getState()
        const markdown = crepeRef.current?.getMarkdown() || state.currentFile.content
        const savePath = await window.electronAPI.saveFile({
          filePath: state.currentFile.filePath,
          content: markdown
        })
        if (savePath) {
          state.setFilePath(savePath)
          state.setDirty(false)
          state.addRecentFile(savePath)
        }
      }

      // Cmd/Ctrl + N: New file
      if (isMod && e.key === 'n') {
        e.preventDefault()
        useStore.getState().setContent('')
        useStore.getState().setFilePath(null)
        useStore.getState().setDirty(false)
      }

      // Cmd/Ctrl + F: Find & Replace
      if (isMod && !e.shiftKey && e.key === 'f') {
        e.preventDefault()
        const state = useStore.getState()
        state.setFindReplaceOpen(!state.findReplaceOpen)
      }

      // Cmd/Ctrl + Shift + F: Toggle Focus Mode
      if (isMod && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        const state = useStore.getState()
        state.setFocusMode(!state.focusMode)
      }

      // Cmd/Ctrl + Shift + T: Toggle Typewriter Mode
      if (isMod && e.shiftKey && e.key === 't') {
        e.preventDefault()
        const state = useStore.getState()
        state.setTypewriterMode(!state.typewriterMode)
      }

      // Cmd/Ctrl + Shift + A: Toggle AI Panel
      if (isMod && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        useStore.getState().toggleAIPanel()
      }

      // Escape: Close AI Panel if open
      if (e.key === 'Escape') {
        const state = useStore.getState()
        if (state.aiPanelOpen) {
          e.preventDefault()
          state.setAIPanelOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const wrapperClasses = [
    'editor-wrapper',
    focusMode && 'focus-mode',
    typewriterMode && 'typewriter-mode'
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapperClasses}>
      <div ref={editorRef} className="editor" />
    </div>
  )
}
