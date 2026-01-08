import { useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { useStore } from '../../stores/useStore'
import '@milkdown/crepe/theme/common/style.css'
import './Editor.css'

export function Editor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const { currentFile, setContent, focusMode, setDirty } = useStore()
  const fileVersionRef = useRef(0)

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`editor-wrapper ${focusMode ? 'focus-mode' : ''}`}>
      <div ref={editorRef} className="editor" />
    </div>
  )
}
