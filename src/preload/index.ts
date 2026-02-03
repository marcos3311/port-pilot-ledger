import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  getDashboardData: (year?: number | string) => ipcRenderer.invoke('get-dashboard-data', year),
  getPracticos: () => ipcRenderer.invoke('get-practicos'),
  getInactivePracticos: () => ipcRenderer.invoke('get-inactive-practicos'),
  createTransaction: (data: any) => ipcRenderer.invoke('create-transaction', data),
  deleteTransactionSimple: (id: string) => ipcRenderer.invoke('delete-transaction-simple', { id }),
  deleteTransactionShift: (id: string) => ipcRenderer.invoke('delete-transaction-shift', { id }),
  updateTransaction: (data: any) => ipcRenderer.invoke('update-transaction', data),
  getPilotSummary: (pilotId: number, year: number) => ipcRenderer.invoke('get-pilot-summary', { pilotId, year }),
  getAllPracticos: () => ipcRenderer.invoke('get-all-practicos'),
  createPractico: (data: { nombre: string; foto_url?: string | null }) => ipcRenderer.invoke('create-practico', data),
  selectPilotPhoto: () => ipcRenderer.invoke('select-pilot-photo'),
  updatePractico: (data: { id: number; nombre?: string; foto_url?: string | null; activo?: number }) => ipcRenderer.invoke('update-practico', data),
  updatePracticoStatus: (id: number, activo: number) => ipcRenderer.invoke('update-practico-status', { id, activo }),
  copyImageToClipboard: (dataUrl: string) => ipcRenderer.invoke('copy-image-to-clipboard', { dataUrl }),
  getAvailableYears: () => ipcRenderer.invoke('get-available-years')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
