import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FileState {
  filePath: string | null
  content: string
  isDirty: boolean
}

// AI Panel Types
export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type AIProvider = 'claude' | 'openai' | 'ollama'

interface AIState {
  aiPanelOpen: boolean
  aiMessages: AIMessage[]
  aiLoading: boolean
  aiProvider: AIProvider
  aiApiKey: string
  ollamaEndpoint: string  // For local Ollama server
  selectedText: string    // Text user highlighted in editor
}

interface AppState extends AIState {
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

  // AI Actions
  setAIPanelOpen: (open: boolean) => void
  toggleAIPanel: () => void
  addAIMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void
  updateLastAIMessage: (content: string) => void
  appendToLastAIMessage: (chunk: string) => void
  clearAIMessages: () => void
  setAILoading: (loading: boolean) => void
  setAIProvider: (provider: AIProvider) => void
  setAIApiKey: (key: string) => void
  setOllamaEndpoint: (endpoint: string) => void
  setSelectedText: (text: string) => void
}

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Existing state
      theme: 'light',
      focusMode: false,
      typewriterMode: false,
      currentFile: {
        filePath: null,
        content: '',
        isDirty: false
      },
      recentFiles: [],

      // AI state
      aiPanelOpen: false,
      aiMessages: [],
      aiLoading: false,
      aiProvider: 'claude',
      aiApiKey: '',
      ollamaEndpoint: 'http://localhost:11434',
      selectedText: '',

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
        }),

      // AI Actions
      setAIPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),

      toggleAIPanel: () =>
        set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),

      addAIMessage: (message) =>
        set((state) => ({
          aiMessages: [
            ...state.aiMessages,
            {
              ...message,
              id: generateId(),
              timestamp: Date.now()
            }
          ]
        })),

      updateLastAIMessage: (content) =>
        set((state) => {
          const messages = [...state.aiMessages]
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content
            }
          }
          return { aiMessages: messages }
        }),

      appendToLastAIMessage: (chunk) =>
        set((state) => {
          const messages = [...state.aiMessages]
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content: messages[messages.length - 1].content + chunk
            }
          }
          return { aiMessages: messages }
        }),

      clearAIMessages: () => set({ aiMessages: [] }),

      setAILoading: (aiLoading) => set({ aiLoading }),

      setAIProvider: (aiProvider) => set({ aiProvider }),

      setAIApiKey: (aiApiKey) => set({ aiApiKey }),

      setOllamaEndpoint: (ollamaEndpoint) => set({ ollamaEndpoint }),

      setSelectedText: (selectedText) => set({ selectedText })
    }),
    {
      name: 'typid-storage',
      partialize: (state) => ({
        theme: state.theme,
        recentFiles: state.recentFiles,
        // Persist AI settings (but NOT messages or API key for security)
        aiProvider: state.aiProvider,
        ollamaEndpoint: state.ollamaEndpoint
      })
    }
  )
)
