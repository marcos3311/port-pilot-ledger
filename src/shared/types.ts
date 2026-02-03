export interface Practico {
    id: number;
    nombre: string;
    activo: number; // 1 = activo, 0 = retirado
    foto_url?: string;
}

export interface Transaccion {
    id: string; // UUID
    anio_imputacion: number;
    numero_orden: number;
    fecha_registro: string;
    fecha_turno: string;
    cantidad_dias: number;
    deudor_id: number;
    acreedor_id: number;
    realizado_por_id: number;
    es_triangulacion: boolean;
    estado: 'activo' | 'anulado';
    observacion?: string;
}

export interface DashboardData {
    transacciones: (Transaccion & {
        deudor: string;
        deudor_activo: number;
        acreedor: string;
        acreedor_activo: number;
        realizado_por: string;
        realizado_por_activo: number;
    })[];
}

export interface BilateralBalance {
    counterpartId: number;
    pilotName: string;
    balance: number; // positive = pilot is creditor (A FAVOR), negative = pilot is debtor (EN CONTRA)
}

export interface PilotSummary {
    pilot: Practico;
    balances: BilateralBalance[];
    historial: (Transaccion & { deudor: string; acreedor: string; realizado_por: string })[];
}
