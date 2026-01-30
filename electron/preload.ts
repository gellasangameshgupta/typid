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
  // AI Assistant API
  callAI: (data: AIRequest) => ipcRenderer.invoke('ai-chat', data),
  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Secure API key storage
  saveApiKey: (data: { provider: string, apiKey: string }) => ipcRenderer.invoke('save-api-key', data),
  loadApiKey: (provider: string) => ipcRenderer.invoke('load-api-key', provider),
  deleteApiKey: (provider: string) => ipcRenderer.invoke('delete-api-key', provider)
})

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string, content: string } | null>
      saveFile: (data: { filePath: string | null, content: string }) => Promise<string | null>
      readFile: (filePath: string) => Promise<string>
      setTitle: (data: { filePath: string | null, isDirty: boolean }) => Promise<void>
      saveImage: (data: { documentPath: string | null, imageData: string, imageName: string }) => Promise<{ relativePath: string } | null>
      // AI Assistant
      callAI: (data: {
        messages: Array<{ role: 'user' | 'assistant', content: string }>
        documentContent: string
        apiKey: string
        provider: 'claude' | 'openai' | 'ollama'
        ollamaEndpoint?: string
      }) => Promise<string>
      // Updates
      checkForUpdates: () => Promise<{ updateAvailable: boolean, version?: string, message: string }>
      getAppVersion: () => Promise<string>
      // Secure API key storage
      saveApiKey: (data: { provider: string, apiKey: string }) => Promise<boolean>
      loadApiKey: (provider: string) => Promise<string | null>
      deleteApiKey: (provider: string) => Promise<boolean>
    }
  }
}
