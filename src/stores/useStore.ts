import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FileState {
  filePath: string | null
  content: string
  isDirty: boolean
}

interface AppState {
  theme: 'light' | 'dark'
  focusMode: boolean
  typewriterMode: boolean
  currentFile: FileState
  recentFiles: string[]

  // Actions
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setFocusMode: (enabled: boolean) => void
  setTypewriterMode: (enabled: boolean) => void
  setContent: (content: string) => void
  setFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  addRecentFile: (path: string) => void
  resetFile: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      focusMode: false,
      typewriterMode: false,
      currentFile: {
        filePath: null,
        content: '',
        isDirty: false
      },
      recentFiles: [],

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        })),

      setFocusMode: (focusMode) => set({ focusMode }),

      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),

      setContent: (content) =>
        set((state) => ({
          currentFile: {
            ...state.currentFile,
            content,
            isDirty: true
          }
        })),

      setFilePath: (filePath) =>
        set((state) => ({
          currentFile: {
            ...state.currentFile,
            filePath,
            isDirty: false
          }
        })),

      setDirty: (isDirty) =>
        set((state) => ({
          currentFile: {
            ...state.currentFile,
            isDirty
          }
        })),

      addRecentFile: (path) =>
        set((state) => ({
          recentFiles: [
            path,
            ...state.recentFiles.filter((p) => p !== path)
          ].slice(0, 10)
        })),

      resetFile: () =>
        set({
          currentFile: {
            filePath: null,
            content: '',
            isDirty: false
          }
        })
    }),
    {
      name: 'typid-storage',
      partialize: (state) => ({
        theme: state.theme,
        recentFiles: state.recentFiles
      })
    }
  )
)
