
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

    // 1. Fetch ALL interchanges involved (active + void + annulled)
    const allTransacciones = db.prepare(`
        SELECT * FROM intercambios 
        ORDER BY anio_imputacion DESC, numero_orden DESC
    `).all() as IntercambioData[];

    // 1.5 Fetch CONDONACIONES
    const condonaciones = db.prepare(`
        SELECT * FROM condonaciones 
        WHERE acreedor_id = ? OR deudor_id = ?
        ORDER BY fecha DESC
            `).all(pilotId, pilotId) as any[];

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

        // --- UNILATERAL ---
        if (txData.tipo === 'unilateral') {
            const d = datos as DatosUnilateral;
            // Logic to determine involvement and apply debt
            if (txData.deudor_id === pilotId || txData.acreedor_id === pilotId || d.realizado_por_id === pilotId) {
                involved = true;

                if (txData.estado !== 'sin_efecto') {
                    applyStandardDebt(txData.deudor_id, txData.acreedor_id, d.dias);
                    if (d.realizado_por_id && d.realizado_por_id !== txData.acreedor_id) {
                        applyStandardDebt(txData.acreedor_id, d.realizado_por_id, d.dias);
                        realizado_por_nombre = getPilotName(d.realizado_por_id);
                    }
                } else {
                    // Just resolve names if needed for display
                    if (d.realizado_por_id) realizado_por_nombre = getPilotName(d.realizado_por_id);
                }
            }
        }
        else if (txData.tipo === 'reciproco') {
            const d = datos as DatosReciproco;
            const isIda = (txData.deudor_id === pilotId || txData.acreedor_id === pilotId || (d.ida.realizado_por_id === pilotId));
            const isVuelta = (txData.acreedor_id === pilotId || txData.deudor_id === pilotId || (d.vuelta.realizado_por_id === pilotId)); // Swapped roles usually

            if (isIda || isVuelta) {
                involved = true;

                if (txData.estado !== 'sin_efecto') {
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
                } else {
                    // Voided Reciproco - just names
                    if (d.ida.realizado_por_id) realizado_por_nombre = getPilotName(d.ida.realizado_por_id);
                    if (d.vuelta.realizado_por_id) {
                        const name = getPilotName(d.vuelta.realizado_por_id);
                        if (realizado_por_nombre) realizado_por_nombre += ` / ${name}`;
                        else realizado_por_nombre = name;
                    }
                }
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

    // --- APPLY CONDONACIONES ---
    condonaciones.forEach(c => {
        // Condonation logic: Perdonador (Acreedor) loses asset (-), Perdonado (Deudor) loses liability (+)
        // Wait, if I am Deudor and I am forgiven, my balance (which is negative) goes UP (closer to zero).
        // If I am Acreedor and I forgive, my balance (which is positive) goes DOWN.

        let netImpact = 0;
        let involved = false;

        if (c.deudor_id === pilotId) {
            // I was forgiven. My debt to Acreedor decreases.
            // Debt decrease = +Balance
            updateBalance(c.acreedor_id, c.cantidad_dias);
            netImpact += c.cantidad_dias;
            involved = true;
        } else if (c.acreedor_id === pilotId) {
            // I forgave. My credit from Deudor decreases.
            // Asset decrease = -Balance
            updateBalance(c.deudor_id, -c.cantidad_dias);
            netImpact -= c.cantidad_dias;
            involved = true;
        }

        if (involved) {
            filteredHistorial.push({
                id: c.id,
                anio_imputacion: parseInt(c.fecha.split('-')[0]), // Derived from date
                numero_orden: 0, // No order number
                fecha_registro: c.fecha, // Using fecha as register date
                tipo: 'condonacion',
                deudor_id: c.deudor_id,
                acreedor_id: c.acreedor_id,
                datos_json: JSON.stringify({ dias: c.cantidad_dias }), // Mock json for uniform handling in UI if needed, or use 'datos' directly
                datos: { dias: c.cantidad_dias },
                estado: 'activo',
                observacion: c.observacion,
                deudor_nombre: getPilotName(c.deudor_id),
                acreedor_nombre: getPilotName(c.acreedor_id),
                realizado_por: undefined,
                es_triangulacion: false,
                resumen_dias: netImpact
            } as any);
        }
    });

    // Sort combined history: Date DESC (primary), Order DESC (secondary)
    // Condonations have order 0, so purely based on date?
    // Let's sort by date descending.
    filteredHistorial.sort((a, b) => {
        const dateA = a.fecha_registro;
        const dateB = b.fecha_registro;
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        // If same date, prefer Intercambios (with order number) ?
        if (a.numero_orden > b.numero_orden) return -1;
        if (a.numero_orden < b.numero_orden) return 1;
        return 0;
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

export const handleGetDashboardData = (_: IpcMainInvokeEvent, payload?: any) => {
    let year: number | string | undefined;
    let limit = 50;
    let offset = 0;
    let view = 'intercambios';

    if (typeof payload === 'object' && payload !== null) {
        year = payload.year;
        if (typeof payload.limit === 'number') limit = payload.limit;
        if (typeof payload.offset === 'number') offset = payload.offset;
        if (payload.view) view = payload.view;
    } else {
        year = payload;
    }

    if (view === 'condonaciones') {
        let sql = `SELECT * FROM condonaciones`;
        const params: any[] = [];

        if (year && year !== 'Todos') {
            sql += ` WHERE strftime('%Y', fecha) = ? `;
            params.push(year.toString());
        }

        sql += ` ORDER BY fecha DESC LIMIT ? OFFSET ? `;
        params.push(limit, offset);

        const rawCondonaciones = db.prepare(sql).all(...params) as any[];

        const transacciones = rawCondonaciones.map(c => {
            const datos: DatosCondonacion = { dias: c.cantidad_dias };
            return {
                id: c.id,
                anio_imputacion: parseInt(c.fecha.split('-')[0]),
                numero_orden: 0,
                fecha_registro: c.fecha,
                tipo: 'condonacion',
                deudor_id: c.deudor_id,
                acreedor_id: c.acreedor_id,
                datos_json: JSON.stringify(datos),
                estado: 'activo',
                observacion: c.observacion,
                datos,
                deudor_nombre: getPilotName(c.deudor_id),
                acreedor_nombre: getPilotName(c.acreedor_id),
                realizado_por_nombre: undefined,
                resumen_dias: c.cantidad_dias
            };
        });

        // Check for more
        // This simple check might fail if exactly limit items exist but no more. 
        // A better way is fetching limit + 1. But for now we stick to the pattern.
        return { transacciones, hasMore: transacciones.length === limit };

    } else {
        let sql = `SELECT * FROM intercambios`;
        const params: any[] = [];

        if (year && year !== 'Todos') {
            sql += ` WHERE anio_imputacion = ? `;
            params.push(year);
        }

        sql += ` ORDER BY anio_imputacion DESC, numero_orden DESC LIMIT ? OFFSET ? `;
        params.push(limit, offset);

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

        return { transacciones, hasMore: transacciones.length === limit };
    }
};

export const handleCreateTransaction = (_: IpcMainInvokeEvent, payload: any) => {
    if (payload.deudor_id === payload.acreedor_id) {
        throw new Error('Deudor y Acreedor deben ser distintos.');
    }

    // --- V2 CONDONACION CHECK ---
    if (payload.tipo === 'condonacion') {
        const id = randomUUID();
        const now = new Date().toISOString().split('T')[0];

        // Payload for condonacion: { acreedor_id, deudor_id, datos: { dias }, observacion, ... }
        // We use 'fecha_turno' from the modal as the effective date if present, or today?
        // The modal sends 'fecha_turno'.
        const fecha = payload.fecha_turno || now;
        const cantidad_dias = payload.cantidad_dias || (payload.datos as DatosCondonacion).dias;

        db.prepare(`
            INSERT INTO condonaciones (
                id, fecha, acreedor_id, deudor_id, cantidad_dias, observacion
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, fecha, payload.acreedor_id, payload.deudor_id, cantidad_dias, payload.observacion);

        return { success: true, id };
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

export const handleSetTransactionVoid = (_: IpcMainInvokeEvent, { id, voided }: { id: string; voided: boolean }) => {
    const estado = voided ? 'sin_efecto' : 'activo';
    db.prepare('UPDATE intercambios SET estado = ? WHERE id = ?').run(estado, id);
    return { success: true };
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


