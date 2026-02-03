
import db from './database';
import {
    Intercambio, IntercambioData, PilotSummary, BilateralBalance,
    Practico, DatosUnilateral, DatosReciproco, DatosCondonacion
} from '../shared/types';
import { IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'crypto';

// --- Helpers ---
const parseDatos = (json: string, tipo: string): any => {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error('Error parsing JSON for tipo ' + tipo, e);
        return null;
    }
};

const getPilotName = (id: number): string => {
    const p = db.prepare('SELECT nombre FROM practicos WHERE id = ?').get(id) as { nombre: string };
    return p ? p.nombre : 'Unknown';
};

const getPilotActive = (id: number): number => {
    const p = db.prepare('SELECT activo FROM practicos WHERE id = ?').get(id) as { activo: number };
    return p ? p.activo : 0;
};

// --- Main Handler ---
export const handleGetPilotSummary = (_: IpcMainInvokeEvent, { pilotId }: { pilotId: number }): PilotSummary => {
    const pilot = db.prepare('SELECT * FROM practicos WHERE id = ?').get(pilotId) as Practico;
    if (!pilot) throw new Error('Práctico no encontrado');

    // 1. Fetch all ACTIVE interchanges involved
    const allTransacciones = db.prepare(`
        SELECT * FROM intercambios 
        WHERE estado = 'activo'
        ORDER BY anio_imputacion DESC, numero_orden DESC
    `).all() as IntercambioData[];

    const balanceMap: Record<number, { pilotName: string; balance: number; isActive: number }> = {};
    const filteredHistorial: (Intercambio & { deudor_nombre: string; acreedor_nombre: string; realizado_por?: string; es_triangulacion?: boolean })[] = [];

    const updateBalance = (targetId: number, amount: number) => {
        if (targetId === pilotId) return;
        if (!balanceMap[targetId]) {
            balanceMap[targetId] = {
                pilotName: getPilotName(targetId),
                balance: 0,
                isActive: getPilotActive(targetId)
            };
        }
        balanceMap[targetId].balance += amount;
    };

    allTransacciones.forEach(txData => {
        const datos = parseDatos(txData.datos_json, txData.tipo);
        if (!datos) return;

        // --- ACCOUNTING LOGIC V2 (CHAINED) ---
        let involved = false;
        let realizado_por_nombre: string | undefined = undefined;
        let netImpact = 0; // Tracks the net change in the pilot's "Asset" position

        // Helper to apply Standard Debt (Deudor owes Acreedor)
        const applyStandardDebt = (deudor: number, acreedor: number, amount: number) => {
            if (deudor === pilotId) {
                updateBalance(acreedor, -amount); // I am Deudor, I owe Acreedor
                netImpact -= amount;
                involved = true;
            } else if (acreedor === pilotId) {
                updateBalance(deudor, amount); // I am Acreedor, Deudor owes me
                netImpact += amount;
                involved = true;
            }
        };

        if (txData.tipo === 'unilateral') {
            const d = datos as DatosUnilateral;
            const dias = d.dias;
            const trianguladorId = d.realizado_por_id;

            // 1. Standard: Deudor -> Acreedor
            applyStandardDebt(txData.deudor_id, txData.acreedor_id, dias);

            // 2. Triangulation: Acreedor -> Triangulador
            if (trianguladorId && trianguladorId !== txData.acreedor_id) {
                applyStandardDebt(txData.acreedor_id, trianguladorId, dias);
                realizado_por_nombre = getPilotName(trianguladorId);
            }
        }
        else if (txData.tipo === 'reciproco') {
            const d = datos as DatosReciproco;

            // --- IDA (Leg 1) ---
            applyStandardDebt(txData.deudor_id, txData.acreedor_id, d.ida.dias);

            if (d.ida.realizado_por_id && d.ida.realizado_por_id !== txData.acreedor_id) {
                applyStandardDebt(txData.acreedor_id, d.ida.realizado_por_id, d.ida.dias);
                realizado_por_nombre = getPilotName(d.ida.realizado_por_id);
            }

            // --- VUELTA (Leg 2) ---
            const deudorVuelta = txData.acreedor_id;
            const acreedorVuelta = txData.deudor_id;

            applyStandardDebt(deudorVuelta, acreedorVuelta, d.vuelta.dias);

            if (d.vuelta.realizado_por_id && d.vuelta.realizado_por_id !== acreedorVuelta) {
                applyStandardDebt(acreedorVuelta, d.vuelta.realizado_por_id, d.vuelta.dias);
                const name = getPilotName(d.vuelta.realizado_por_id);
                if (realizado_por_nombre) realizado_por_nombre += ` / ${name}`;
                else realizado_por_nombre = name;
            }
        }
        else if (txData.tipo === 'condonacion') {
            const d = datos as DatosCondonacion;
            if (txData.deudor_id === pilotId) {
                updateBalance(txData.acreedor_id, d.dias); // Debt reduces (+balance)
                netImpact += d.dias;
                involved = true;
            } else if (txData.acreedor_id === pilotId) {
                updateBalance(txData.deudor_id, -d.dias); // Asset reduces (-balance)
                netImpact -= d.dias;
                involved = true;
            }
        }

        if (involved) {
            filteredHistorial.push({
                ...txData,
                datos,
                deudor_nombre: getPilotName(txData.deudor_id),
                acreedor_nombre: getPilotName(txData.acreedor_id),
                realizado_por: realizado_por_nombre,
                es_triangulacion: !!realizado_por_nombre,
                resumen_dias: netImpact // Use calculated net impact
            } as any);
        }
    });

    const balances: BilateralBalance[] = Object.entries(balanceMap)
        .map(([id, data]) => ({
            counterpartId: parseInt(id),
            pilotName: data.pilotName,
            balance: data.balance,
            isActive: data.isActive
        }))
        .filter(b => b.balance !== 0 && b.isActive === 1);

    return { pilot, balances, historial: filteredHistorial };
};

export const handleGetDashboardData = (_: IpcMainInvokeEvent, year?: number | string) => {
    let sql = `SELECT * FROM intercambios`;
    const params: any[] = [];

    if (year && year !== 'Todos') {
        sql += ` WHERE anio_imputacion = ?`;
        params.push(year);
    }

    sql += ` ORDER BY anio_imputacion DESC, numero_orden DESC`;

    const rawTxs = db.prepare(sql).all(...params) as IntercambioData[];

    const transacciones = rawTxs.map(tx => {
        const datos = parseDatos(tx.datos_json, tx.tipo);
        let resumen_dias = 0;
        // Dashboard summary remains simple/absolute as it is context-free
        if (tx.tipo === 'unilateral') resumen_dias = (datos as DatosUnilateral).dias;
        if (tx.tipo === 'reciproco') resumen_dias = (datos as DatosReciproco).ida.dias;
        if (tx.tipo === 'condonacion') resumen_dias = (datos as DatosCondonacion).dias;

        return {
            ...tx,
            datos,
            deudor_nombre: getPilotName(tx.deudor_id),
            acreedor_nombre: getPilotName(tx.acreedor_id),
            realizado_por_nombre: (tx.tipo === 'unilateral' && (datos as DatosUnilateral).realizado_por_id) ? getPilotName((datos as DatosUnilateral).realizado_por_id!) : undefined,
            resumen_dias
        };
    });

    return { transacciones };
};

export const handleCreateTransaction = (_: IpcMainInvokeEvent, payload: any) => {
    if (payload.deudor_id === payload.acreedor_id) {
        throw new Error('Deudor y Acreedor deben ser distintos.');
    }

    let finalOrderNumber = payload.customOrderNumber;
    if (finalOrderNumber) {
        const exists = db.prepare('SELECT 1 FROM intercambios WHERE anio_imputacion = ? AND numero_orden = ?')
            .get(payload.anio_imputacion, finalOrderNumber);
        if (exists) throw new Error(`El Nro Orden ${finalOrderNumber} ya existe.`);
    } else {
        const max = db.prepare('SELECT MAX(numero_orden) as max FROM intercambios WHERE anio_imputacion = ?')
            .get(payload.anio_imputacion) as { max: number | null };
        finalOrderNumber = (max.max || 0) + 1;
    }

    if (finalOrderNumber < 1) finalOrderNumber = 1;

    const id = randomUUID();
    const now = new Date().toISOString().split('T')[0];

    db.prepare(`
        INSERT INTO intercambios (
            id, anio_imputacion, numero_orden, fecha_registro, 
            tipo, deudor_id, acreedor_id, datos_json, estado, observacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        payload.anio_imputacion,
        finalOrderNumber,
        now,
        payload.tipo,
        payload.deudor_id,
        payload.acreedor_id,
        JSON.stringify(payload.datos),
        'activo',
        payload.observacion
    );

    return { success: true, id };
};

export const handleUpdateTransaction = (_: IpcMainInvokeEvent, payload: any) => {
    if (payload.deudor_id === payload.acreedor_id) {
        throw new Error('Deudor y Acreedor deben ser distintos.');
    }

    if (!payload.id) throw new Error('Transaction ID is required for update');

    const tx = db.prepare('SELECT * FROM intercambios WHERE id = ?').get(payload.id);
    if (!tx) throw new Error('Transacción no encontrada');

    let finalOrderNumber = payload.customOrderNumber;
    if (finalOrderNumber) {
        const exists = db.prepare('SELECT 1 FROM intercambios WHERE anio_imputacion = ? AND numero_orden = ? AND id != ?')
            .get(payload.anio_imputacion, finalOrderNumber, payload.id);
        if (exists) throw new Error(`El Nro Orden ${finalOrderNumber} ya existe.`);
    } else {
        finalOrderNumber = (tx as any).numero_orden;
    }

    db.prepare(`
        UPDATE intercambios SET 
            anio_imputacion = ?,
            numero_orden = ?,
            tipo = ?,
            deudor_id = ?,
            acreedor_id = ?,
            datos_json = ?,
            observacion = ?
        WHERE id = ?
    `).run(
        payload.anio_imputacion,
        finalOrderNumber,
        payload.tipo,
        payload.deudor_id,
        payload.acreedor_id,
        JSON.stringify(payload.datos),
        payload.observacion,
        payload.id
    );

    return { success: true };
};
