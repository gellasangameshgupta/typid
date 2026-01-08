/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (data: { filePath: string | null; content: string }) => Promise<string | null>
    readFile: (filePath: string) => Promise<string>
    setTitle: (data: { filePath: string | null; isDirty: boolean }) => Promise<void>
  }
}
