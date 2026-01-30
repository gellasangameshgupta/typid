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

// Available models per provider
export const AI_MODELS = {
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2' },
    { id: 'llama3.1', name: 'Llama 3.1' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'Code Llama' },
    { id: 'phi3', name: 'Phi-3' },
  ],
} as const

interface AIState {
  aiPanelOpen: boolean
  aiMessages: AIMessage[]
  aiLoading: boolean
  aiProvider: AIProvider
  aiModel: string
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
  setAIModel: (model: string) => void
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
      aiModel: 'claude-sonnet-4-20250514',
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

      setAIProvider: (aiProvider) => set({
        aiProvider,
        // Set default model for the new provider
        aiModel: AI_MODELS[aiProvider][0].id
      }),

      setAIModel: (aiModel) => set({ aiModel }),

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
        aiModel: state.aiModel,
        ollamaEndpoint: state.ollamaEndpoint
      })
    }
  )
)
