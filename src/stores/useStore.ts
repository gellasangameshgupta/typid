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

// Key for untitled documents
const UNTITLED_KEY = '__untitled__'

// Get document key for message storage
const getDocumentKey = (filePath: string | null): string => {
  return filePath || UNTITLED_KEY
}

interface AIState {
  aiPanelOpen: boolean
  aiMessagesByDocument: Record<string, AIMessage[]>  // Messages per document
  aiLoading: boolean
  aiProvider: AIProvider
  aiModel: string
  aiApiKey: string
  ollamaEndpoint: string  // For local Ollama server
  selectedText: string    // Text user highlighted in editor
  textToInsert: string | null  // Text to insert into editor from AI
  textToReplace: { original: string, replacement: string } | null
}

interface WorkspaceState {
  workspacePath: string | null
  workspaceFiles: FileTreeNode[]
  expandedFolders: Set<string>
  workspaceSearchOpen: boolean
  workspaceSearchQuery: string
  workspaceSearchResults: SearchResult[]
  workspaceSearchLoading: boolean
}

interface AppState extends AIState, WorkspaceState {
  theme: 'light' | 'dark'
  focusMode: boolean
  typewriterMode: boolean
  spellCheck: boolean
  findReplaceOpen: boolean
  currentFile: FileState
  recentFiles: string[]
  lastOpenFile: string | null

  // Actions
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setFocusMode: (enabled: boolean) => void
  setTypewriterMode: (enabled: boolean) => void
  setSpellCheck: (enabled: boolean) => void
  setFindReplaceOpen: (open: boolean) => void
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
  clearAIMessages: () => void  // Clear messages for current document
  setAILoading: (loading: boolean) => void
  setAIProvider: (provider: AIProvider) => void
  setAIModel: (model: string) => void
  setAIApiKey: (key: string) => void
  setOllamaEndpoint: (endpoint: string) => void
  setSelectedText: (text: string) => void
  insertTextToEditor: (text: string) => void
  clearTextToInsert: () => void
  replaceTextInEditor: (original: string, replacement: string) => void
  clearTextToReplace: () => void

  // Workspace Actions
  setWorkspacePath: (path: string | null) => void
  setWorkspaceFiles: (files: FileTreeNode[]) => void
  toggleWorkspaceFolder: (path: string) => void
  clearWorkspace: () => void
  setWorkspaceSearchOpen: (open: boolean) => void
  setWorkspaceSearchQuery: (query: string) => void
  setWorkspaceSearchResults: (results: SearchResult[]) => void
  setWorkspaceSearchLoading: (loading: boolean) => void
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
      spellCheck: true,
      findReplaceOpen: false,
      currentFile: {
        filePath: null,
        content: '',
        isDirty: false
      },
      recentFiles: [],
      lastOpenFile: null,

      // AI state
      aiPanelOpen: false,
      aiMessagesByDocument: {},  // Messages stored per document
      aiLoading: false,
      aiProvider: 'claude',
      aiModel: 'claude-sonnet-4-20250514',
      aiApiKey: '',
      ollamaEndpoint: 'http://localhost:11434',
      selectedText: '',
      textToInsert: null,
      textToReplace: null,

      // Workspace state
      workspacePath: null,
      workspaceFiles: [],
      expandedFolders: new Set<string>(),
      workspaceSearchOpen: false,
      workspaceSearchQuery: '',
      workspaceSearchResults: [],
      workspaceSearchLoading: false,

      setTheme: (theme) => {
        set({ theme })
        window.electronAPI?.saveThemePreference(theme)
      },

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          window.electronAPI?.saveThemePreference(newTheme)
          return { theme: newTheme }
        }),

      setFocusMode: (focusMode) => set({ focusMode }),

      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),

      setSpellCheck: (spellCheck) => set({ spellCheck }),

      setFindReplaceOpen: (findReplaceOpen) => set({ findReplaceOpen }),

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
          },
          lastOpenFile: filePath ?? state.lastOpenFile
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
      setAIPanelOpen: (aiPanelOpen: boolean) => set({ aiPanelOpen }),

      toggleAIPanel: () =>
        set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),

      addAIMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) =>
        set((state) => {
          const key = getDocumentKey(state.currentFile.filePath)
          const currentMessages = state.aiMessagesByDocument[key] || []
          return {
            aiMessagesByDocument: {
              ...state.aiMessagesByDocument,
              [key]: [
                ...currentMessages,
                {
                  ...message,
                  id: generateId(),
                  timestamp: Date.now()
                }
              ]
            }
          }
        }),

      updateLastAIMessage: (content: string) =>
        set((state) => {
          const key = getDocumentKey(state.currentFile.filePath)
          const currentMessages = [...(state.aiMessagesByDocument[key] || [])]
          if (currentMessages.length > 0) {
            currentMessages[currentMessages.length - 1] = {
              ...currentMessages[currentMessages.length - 1],
              content
            }
          }
          return {
            aiMessagesByDocument: {
              ...state.aiMessagesByDocument,
              [key]: currentMessages
            }
          }
        }),

      appendToLastAIMessage: (chunk: string) =>
        set((state) => {
          const key = getDocumentKey(state.currentFile.filePath)
          const currentMessages = [...(state.aiMessagesByDocument[key] || [])]
          if (currentMessages.length > 0) {
            currentMessages[currentMessages.length - 1] = {
              ...currentMessages[currentMessages.length - 1],
              content: currentMessages[currentMessages.length - 1].content + chunk
            }
          }
          return {
            aiMessagesByDocument: {
              ...state.aiMessagesByDocument,
              [key]: currentMessages
            }
          }
        }),

      // Clear messages for current document only
      clearAIMessages: () =>
        set((state) => {
          const key = getDocumentKey(state.currentFile.filePath)
          const newMessages = { ...state.aiMessagesByDocument }
          delete newMessages[key]
          return { aiMessagesByDocument: newMessages }
        }),

      setAILoading: (aiLoading: boolean) => set({ aiLoading }),

      setAIProvider: (aiProvider: AIProvider) => set({
        aiProvider,
        // Set default model for the new provider
        aiModel: AI_MODELS[aiProvider][0].id
      }),

      setAIModel: (aiModel: string) => set({ aiModel }),

      setAIApiKey: (aiApiKey: string) => set({ aiApiKey }),

      setOllamaEndpoint: (ollamaEndpoint: string) => set({ ollamaEndpoint }),

      setSelectedText: (selectedText: string) => set({ selectedText }),

      insertTextToEditor: (text: string) => set({ textToInsert: text }),

      clearTextToInsert: () => set({ textToInsert: null }),

      replaceTextInEditor: (original: string, replacement: string) =>
        set({ textToReplace: { original, replacement } }),

      clearTextToReplace: () => set({ textToReplace: null }),

      // Workspace Actions
      setWorkspacePath: (workspacePath: string | null) => set({ workspacePath }),

      setWorkspaceFiles: (workspaceFiles: FileTreeNode[]) => set({ workspaceFiles }),

      toggleWorkspaceFolder: (path: string) =>
        set((state) => {
          const next = new Set(state.expandedFolders)
          if (next.has(path)) {
            next.delete(path)
          } else {
            next.add(path)
          }
          return { expandedFolders: next }
        }),

      clearWorkspace: () =>
        set({
          workspacePath: null,
          workspaceFiles: [],
          expandedFolders: new Set<string>(),
          workspaceSearchOpen: false,
          workspaceSearchQuery: '',
          workspaceSearchResults: []
        }),

      setWorkspaceSearchOpen: (workspaceSearchOpen: boolean) => set({ workspaceSearchOpen }),

      setWorkspaceSearchQuery: (workspaceSearchQuery: string) => set({ workspaceSearchQuery }),

      setWorkspaceSearchResults: (workspaceSearchResults: SearchResult[]) => set({ workspaceSearchResults }),

      setWorkspaceSearchLoading: (workspaceSearchLoading: boolean) => set({ workspaceSearchLoading })
    }),
    {
      name: 'typid-storage',
      partialize: (state) => ({
        theme: state.theme,
        recentFiles: state.recentFiles,
        lastOpenFile: state.lastOpenFile,
        spellCheck: state.spellCheck,
        // Persist AI settings (but NOT messages or API key for security)
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        ollamaEndpoint: state.ollamaEndpoint,
        // Persist workspace path (tree is rebuilt on load)
        workspacePath: state.workspacePath
      })
    }
  )
)
