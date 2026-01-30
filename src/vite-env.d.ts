/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (data: { filePath: string | null; content: string }) => Promise<string | null>
    readFile: (filePath: string) => Promise<string>
    setTitle: (data: { filePath: string | null; isDirty: boolean }) => Promise<void>
    saveImage: (data: { documentPath: string | null; imageData: string; imageName: string }) => Promise<{ relativePath: string } | null>
    callAI: (data: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      documentContent: string
      apiKey: string
      provider: 'claude' | 'openai' | 'ollama'
      model: string
      ollamaEndpoint?: string
    }) => Promise<string>
    checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string; message: string }>
    getAppVersion: () => Promise<string>
  }
}
