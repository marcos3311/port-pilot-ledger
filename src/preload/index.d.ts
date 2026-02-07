import { ElectronAPI } from '@electron-toolkit/preload'
import { DashboardData, Practico } from '../shared/types' // Assuming Practico is imported or defined elsewhere

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDashboardData: (args?: number | string | { year?: number | string; limit?: number; offset?: number }) => Promise<{ transacciones: DashboardData['transacciones']; hasMore: boolean }>,
      getPracticos: () => Promise<Practico[]>,
      getInactivePracticos: () => Promise<Practico[]>,
      createTransaction: (data: any) => Promise<{ success: boolean; id: string; numero_orden: number }>,
      deleteTransactionSimple: (id: string) => Promise<{ success: boolean }>,
      deleteTransactionShift: (id: string) => Promise<{ success: boolean }>,
      updateTransaction: (data: any) => Promise<{ success: boolean }>,
      getPilotSummary: (pilotId: number, year: number) => Promise<any>,
      getAllPracticos: () => Promise<Practico[]>,
      createPractico: (data: { nombre: string; foto_url?: string | null }) => Promise<{ success: boolean; id: number }>,
      selectPilotPhoto: () => Promise<string | null>,
      updatePractico: (data: { id: number; nombre?: string; foto_url?: string | null; activo?: number }) => Promise<{ success: boolean }>,
      updatePracticoStatus: (id: number, activo: number) => Promise<{ success: boolean }>,
      copyImageToClipboard: (dataUrl: string) => Promise<{ success: boolean }>,
      getAvailableYears: () => Promise<number[]>
    }
  }
}
