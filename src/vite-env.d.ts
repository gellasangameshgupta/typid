/// <reference types="vite/client" />

interface FileTreeNode {
  path: string
  name: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  depth: number
}

interface SearchMatch {
  lineNumber: number
  lineText: string
  matchStart: number
  matchEnd: number
}

interface SearchResult {
  filePath: string
  fileName: string
  matches: SearchMatch[]
}

interface Window {
  electronAPI: {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (data: { filePath: string | null; content: string }) => Promise<string | null>
    readFile: (filePath: string) => Promise<string>
    setTitle: (data: { filePath: string | null; isDirty: boolean }) => Promise<void>
    saveImage: (data: { documentPath: string | null; imageData: string; imageName: string }) => Promise<{ relativePath: string } | null>
    // AI Assistant with streaming
    streamAI: (data: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      documentContent: string
      apiKey: string
      provider: 'claude' | 'openai' | 'ollama'
      model: string
      ollamaEndpoint?: string
    }) => Promise<void>
    onAIStreamStart: (callback: () => void) => () => void
    onAIStreamChunk: (callback: (chunk: string) => void) => () => void
    onAIStreamEnd: (callback: () => void) => () => void
    onAIStreamError: (callback: (error: string) => void) => () => void
    // Theme persistence
    saveThemePreference: (theme: string) => Promise<void>
    // Updates
    checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string; message: string }>
    getAppVersion: () => Promise<string>
    saveApiKey: (data: { provider: string; apiKey: string }) => Promise<boolean>
    loadApiKey: (provider: string) => Promise<string | null>
    deleteApiKey: (provider: string) => Promise<boolean>
    // Workspace
    openFolder: () => Promise<string | null>
    listDirectory: (dirPath: string) => Promise<FileTreeNode[]>
    searchWorkspace: (data: { workspacePath: string; query: string }) => Promise<SearchResult[]>
  }
}
