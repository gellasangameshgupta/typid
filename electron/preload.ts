import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data: { filePath: string | null, content: string }) =>
    ipcRenderer.invoke('save-file', data),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath)
})

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ filePath: string, content: string } | null>
      saveFile: (data: { filePath: string | null, content: string }) => Promise<string | null>
      readFile: (filePath: string) => Promise<string>
    }
  }
}
