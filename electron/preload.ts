import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data: { filePath: string | null, content: string }) =>
    ipcRenderer.invoke('save-file', data),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  setTitle: (data: { filePath: string | null, isDirty: boolean }) =>
    ipcRenderer.invoke('set-title', data),
  saveImage: (data: { documentPath: string | null, imageData: string, imageName: string }) =>
    ipcRenderer.invoke('save-image', data)
})

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string, content: string } | null>
      saveFile: (data: { filePath: string | null, content: string }) => Promise<string | null>
      readFile: (filePath: string) => Promise<string>
      setTitle: (data: { filePath: string | null, isDirty: boolean }) => Promise<void>
      saveImage: (data: { documentPath: string | null, imageData: string, imageName: string }) => Promise<{ relativePath: string } | null>
    }
  }
}
