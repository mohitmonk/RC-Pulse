export interface ElectronAPI {
  auth: {
    login: () => Promise<unknown>
    logout: () => Promise<unknown>
    validateToken: () => Promise<unknown>
  }
  calls: {
    getCallLogs: (filterType: string, startDate?: string, endDate?: string) => Promise<unknown>
    exportCSV: (calls: unknown[]) => Promise<unknown>
    exportExcel: (calls: unknown[], summary: unknown) => Promise<unknown>
  }
  user: {
    getCurrentUser: () => Promise<unknown>
  }
  settings: {
    getSettings: () => Promise<unknown>
    updateSettings: (settings: unknown) => Promise<unknown>
  }
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

try {
  const { contextBridge, ipcRenderer } = require('electron')
  if (contextBridge) {
    contextBridge.exposeInMainWorld('electron', {
      auth: {
        login: () => ipcRenderer.invoke('auth:login'),
        logout: () => ipcRenderer.invoke('auth:logout'),
        validateToken: () => ipcRenderer.invoke('auth:validateToken')
      },
      calls: {
        getCallLogs: (filterType: string, startDate?: string, endDate?: string) =>
          ipcRenderer.invoke('calls:getCallLogs', filterType, startDate, endDate),
        exportCSV: (calls: unknown[]) => ipcRenderer.invoke('calls:exportCSV', calls),
        exportExcel: (calls: unknown[], summary: unknown) =>
          ipcRenderer.invoke('calls:exportExcel', calls, summary)
      },
      user: {
        getCurrentUser: () => ipcRenderer.invoke('user:getCurrentUser')
      },
      settings: {
        getSettings: () => ipcRenderer.invoke('settings:getSettings'),
        updateSettings: (settings: unknown) => ipcRenderer.invoke('settings:updateSettings', settings)
      }
    })
  }
} catch (e) {
  // Preload fallback in non-Electron / web preview environment
}
