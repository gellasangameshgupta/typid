import { contextBridge, ipcRenderer } from 'electron'

// AI request/response types
interface AIRequest {
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  documentContent: string
  apiKey: string
  provider: 'claude' | 'openai' | 'ollama'
  model: string
  ollamaEndpoint?: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data: { filePath: string | null, content: string }) =>
    ipcRenderer.invoke('save-file', data),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  setTitle: (data: { filePath: string | null, isDirty: boolean }) =>
    ipcRenderer.invoke('set-title', data),
  saveImage: (data: { documentPath: string | null, imageData: string, imageName: string }) =>
    ipcRenderer.invoke('save-image', data),
  // AI Assistant API with streaming
  streamAI: (data: AIRequest) => ipcRenderer.invoke('ai-chat-stream', data),
  onAIStreamStart: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('ai-stream-start', handler)
    return () => ipcRenderer.removeListener('ai-stream-start', handler)
  },
  onAIStreamChunk: (callback: (chunk: string) => void) => {
    const handler = (_: unknown, chunk: string) => callback(chunk)
    ipcRenderer.on('ai-stream-chunk', handler)
    return () => ipcRenderer.removeListener('ai-stream-chunk', handler)
  },
  onAIStreamEnd: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('ai-stream-end', handler)
    return () => ipcRenderer.removeListener('ai-stream-end', handler)
  },
  onAIStreamError: (callback: (error: string) => void) => {
    const handler = (_: unknown, error: string) => callback(error)
    ipcRenderer.on('ai-stream-error', handler)
    return () => ipcRenderer.removeListener('ai-stream-error', handler)
  },
  // Theme persistence
  saveThemePreference: (theme: string) => ipcRenderer.invoke('save-theme', theme),
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Secure API key storage
  saveApiKey: (data: { provider: string, apiKey: string }) => ipcRenderer.invoke('save-api-key', data),
  loadApiKey: (provider: string) => ipcRenderer.invoke('load-api-key', provider),
  deleteApiKey: (provider: string) => ipcRenderer.invoke('delete-api-key', provider),
  // Workspace
  openFolder: () => ipcRenderer.invoke('open-folder'),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  searchWorkspace: (data: { workspacePath: string, query: string }) => ipcRenderer.invoke('search-workspace', data)
})

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string, content: string } | null>
      saveFile: (data: { filePath: string | null, content: string }) => Promise<string | null>
      readFile: (filePath: string) => Promise<string>
      setTitle: (data: { filePath: string | null, isDirty: boolean }) => Promise<void>
      saveImage: (data: { documentPath: string | null, imageData: string, imageName: string }) => Promise<{ relativePath: string } | null>
      // AI Assistant with streaming
      streamAI: (data: {
        messages: Array<{ role: 'user' | 'assistant', content: string }>
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
      checkForUpdates: () => Promise<{ updateAvailable: boolean, version?: string, message: string }>
      getAppVersion: () => Promise<string>
      // Secure API key storage
      saveApiKey: (data: { provider: string, apiKey: string }) => Promise<boolean>
      loadApiKey: (provider: string) => Promise<string | null>
      deleteApiKey: (provider: string) => Promise<boolean>
      // Workspace
      openFolder: () => Promise<string | null>
      listDirectory: (dirPath: string) => Promise<FileTreeNode[]>
      searchWorkspace: (data: { workspacePath: string, query: string }) => Promise<SearchResult[]>
    }
  }
}

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
