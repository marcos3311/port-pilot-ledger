export interface Practico {
    id: number;
    nombre: string;
    activo: number; // 1 = activo, 0 = retirado
    foto_url?: string;
}

export interface RangoFecha {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
}

export interface DatosBase {
    dias: number;
    rangos: RangoFecha[];
}

export interface DatosUnilateral extends DatosBase {
    realizado_por_id?: number | null;
}

export interface LegReciproco extends DatosBase {
    realizado_por_id?: number | null;
}

export interface DatosReciproco {
    ida: LegReciproco;
    vuelta: LegReciproco;
}

export interface DatosCondonacion {
    dias: number;
}

export type TipoIntercambio = 'unilateral' | 'reciproco' | 'condonacion';

export interface IntercambioData {
    id: string; // UUID
    anio_imputacion: number;
    numero_orden: number;
    fecha_registro: string;
    tipo: TipoIntercambio;
    deudor_id: number;
    acreedor_id: number;
    datos_json: string; // Raw JSON from DB
    estado: 'activo' | 'anulado';
    observacion?: string;
}

// Helper type for application use (parsed JSON)
export interface Intercambio extends Omit<IntercambioData, 'datos_json'> {
    datos: DatosUnilateral | DatosReciproco | DatosCondonacion;
}

export interface DashboardData {
    transacciones: (Intercambio & {
        deudor_nombre: string;
        acreedor_nombre: string;
        // Helpers for display
        resumen_dias: number;
    })[];
}

export interface BilateralBalance {
    counterpartId: number;
    pilotName: string;
    balance: number; // positive = pilot is creditor (A FAVOR), negative = pilot is debtor (EN CONTRA)
    isActive: number;
}

export interface PilotSummary {
    pilot: Practico;
    balances: BilateralBalance[];
    historial: (Intercambio & {
        deudor_nombre: string;
        acreedor_nombre: string;
        realizado_por?: string;
        es_triangulacion?: boolean;
        resumen_dias?: number;
    })[];
}
