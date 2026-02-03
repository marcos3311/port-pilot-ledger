import { useState, useEffect } from 'react';
import { Practico, Intercambio, TipoIntercambio, DatosUnilateral, DatosReciproco, DatosCondonacion, RangoFecha } from '../../../shared/types';
import clsx from 'clsx';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Intercambio;
    practicos: Practico[];
}

export default function TransactionFormModal({ isOpen, onClose, onSuccess, initialData, practicos }: TransactionFormModalProps) {

    const [mode, setMode] = useState<TipoIntercambio>('unilateral');

    // Shared State
    const [anioImputacion, setAnioImputacion] = useState(new Date().getFullYear());
    const [numeroOrden, setNumeroOrden] = useState('');
    const [observacion, setObservacion] = useState('');

    // Mode Specific State
    // Unilateral
    const [uniDeudor, setUniDeudor] = useState('');
    const [uniAcreedor, setUniAcreedor] = useState('');
    const [uniTriangulacion, setUniTriangulacion] = useState(false);
    const [uniRealizadoPor, setUniRealizadoPor] = useState('');
    const [uniRangos, setUniRangos] = useState<RangoFecha[]>([{ start: '', end: '' }]);

    // Reciproco
    const [recDeudor, setRecDeudor] = useState(''); // "A" (Main Deudor / Initiator)
    const [recAcreedor, setRecAcreedor] = useState(''); // "B" (Main Acreedor / Counterpart)

    // Ida (A -> B)
    const [idaTriangulacion, setIdaTriangulacion] = useState(false);
    const [idaRealizadoPor, setIdaRealizadoPor] = useState('');
    const [idaRangos, setIdaRangos] = useState<RangoFecha[]>([{ start: '', end: '' }]);

    // Vuelta (B -> A)
    const [vueltaTriangulacion, setVueltaTriangulacion] = useState(false);
    const [vueltaRealizadoPor, setVueltaRealizadoPor] = useState('');
    const [vueltaRangos, setVueltaRangos] = useState<RangoFecha[]>([{ start: '', end: '' }]);

    // Condonacion
    const [condDeudor, setCondDeudor] = useState(''); // Who owed
    const [condAcreedor, setCondAcreedor] = useState(''); // Who forgives
    const [condDias, setCondDias] = useState(1);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode
                setMode(initialData.tipo);
                setAnioImputacion(initialData.anio_imputacion);
                setNumeroOrden(initialData.numero_orden.toString());
                setObservacion(initialData.observacion || '');

                if (initialData.tipo === 'unilateral') {
                    const d = initialData.datos as DatosUnilateral;
                    setUniDeudor(initialData.deudor_id.toString());
                    setUniAcreedor(initialData.acreedor_id.toString());
                    setUniTriangulacion(!!d.realizado_por_id && d.realizado_por_id !== initialData.acreedor_id); // Basic heuristic
                    setUniRealizadoPor(d.realizado_por_id ? d.realizado_por_id.toString() : '');
                    setUniRangos(d.rangos && d.rangos.length > 0 ? d.rangos : [{ start: '', end: '' }]);
                } else if (initialData.tipo === 'reciproco') {
                    const d = initialData.datos as DatosReciproco;
                    setRecDeudor(initialData.deudor_id.toString());
                    setRecAcreedor(initialData.acreedor_id.toString());

                    // Ida
                    setIdaTriangulacion(!!d.ida.realizado_por_id && d.ida.realizado_por_id !== initialData.acreedor_id);
                    setIdaRealizadoPor(d.ida.realizado_por_id ? d.ida.realizado_por_id.toString() : '');
                    setIdaRangos(d.ida.rangos && d.ida.rangos.length > 0 ? d.ida.rangos : [{ start: '', end: '' }]);

                    // Vuelta
                    setVueltaTriangulacion(!!d.vuelta.realizado_por_id && d.vuelta.realizado_por_id !== initialData.deudor_id);
                    setVueltaRealizadoPor(d.vuelta.realizado_por_id ? d.vuelta.realizado_por_id.toString() : '');
                    setVueltaRangos(d.vuelta.rangos && d.vuelta.rangos.length > 0 ? d.vuelta.rangos : [{ start: '', end: '' }]);
                } else if (initialData.tipo === 'condonacion') {
                    const d = initialData.datos as DatosCondonacion;
                    setCondDeudor(initialData.deudor_id.toString());
                    setCondAcreedor(initialData.acreedor_id.toString());
                    setCondDias(d.dias);
                }
            } else {
                // Reset to defaults
                setMode('unilateral');
                setAnioImputacion(new Date().getFullYear());
                setNumeroOrden('');
                setObservacion('');

                // Clear all inner states
                setUniDeudor(''); setUniAcreedor(''); setUniTriangulacion(false); setUniRealizadoPor('');
                setUniRangos([{ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }]);

                setRecDeudor(''); setRecAcreedor('');
                setIdaTriangulacion(false); setIdaRealizadoPor(''); setIdaRangos([{ start: '', end: '' }]);
                setVueltaTriangulacion(false); setVueltaRealizadoPor(''); setVueltaRangos([{ start: '', end: '' }]);

                setCondDeudor(''); setCondAcreedor(''); setCondDias(1);
            }
        }
    }, [isOpen, initialData]);

    // Helpers

    const calculateDays = (rangos: RangoFecha[]) => {
        let total = 0;
        rangos.forEach(r => {
            if (r.start && r.end) {
                const start = new Date(r.start);
                const end = new Date(r.end);
                const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
                if (diff >= 0) total += diff + 1;
            }
        });
        return total;
    };

    const addRango = (setter: React.Dispatch<React.SetStateAction<RangoFecha[]>>) => {
        setter(prev => [...prev, { start: '', end: '' }]);
    };

    const removeRango = (setter: React.Dispatch<React.SetStateAction<RangoFecha[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const updateRango = (setter: React.Dispatch<React.SetStateAction<RangoFecha[]>>, index: number, field: 'start' | 'end', value: string) => {
        setter(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            // Auto-fill end if start set? optional.
            if (field === 'start' && !copy[index].end) copy[index].end = value;
            return copy;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let payload: any = {
                anio_imputacion: anioImputacion,
                customOrderNumber: numeroOrden ? parseInt(numeroOrden) : undefined,
                tipo: mode,
                observacion,
                fecha_turno: new Date().toISOString(), // Legacy field filler?
                cantidad_dias: 0 // Legacy filler
            };

            if (mode === 'unilateral') {
                payload.deudor_id = parseInt(uniDeudor);
                payload.acreedor_id = parseInt(uniAcreedor);
                const datos: DatosUnilateral = {
                    dias: calculateDays(uniRangos),
                    rangos: uniRangos,
                    realizado_por_id: uniTriangulacion ? parseInt(uniRealizadoPor) : null
                };
                payload.datos = datos;
                payload.cantidad_dias = datos.dias;
                // Legacy support for search
                payload.fecha_turno = uniRangos[0]?.start || new Date().toISOString();
            } else if (mode === 'reciproco') {
                payload.deudor_id = parseInt(recDeudor);
                payload.acreedor_id = parseInt(recAcreedor);
                const datos: DatosReciproco = {
                    ida: {
                        dias: calculateDays(idaRangos),
                        rangos: idaRangos,
                        realizado_por_id: idaTriangulacion ? parseInt(idaRealizadoPor) : null
                    },
                    vuelta: {
                        dias: calculateDays(vueltaRangos),
                        rangos: vueltaRangos,
                        realizado_por_id: vueltaTriangulacion ? parseInt(vueltaRealizadoPor) : null
                    }
                };
                payload.datos = datos;
                payload.cantidad_dias = datos.ida.dias; // Approximated for legacy
                payload.fecha_turno = idaRangos[0]?.start || new Date().toISOString();
            } else if (mode === 'condonacion') {
                payload.deudor_id = parseInt(condDeudor);
                payload.acreedor_id = parseInt(condAcreedor);
                const datos: DatosCondonacion = { dias: condDias };
                payload.datos = datos;
                payload.cantidad_dias = condDias;
            }

            if (initialData?.id) {
                payload.id = initialData.id;
                await window.api.updateTransaction(payload);
            } else {
                await window.api.createTransaction(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (!isOpen) return null;

    const renderDateRanges = (rangos: RangoFecha[], setter: React.Dispatch<React.SetStateAction<RangoFecha[]>>) => (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Fechas / Rangos</label>
            {rangos.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <input type="date" value={r.start} onChange={(e) => updateRango(setter, i, 'start', e.target.value)}
                        className="border border-slate-200 rounded p-1 text-xs" />
                    <span className="text-slate-400">-</span>
                    <input type="date" value={r.end} onChange={(e) => updateRango(setter, i, 'end', e.target.value)}
                        className="border border-slate-200 rounded p-1 text-xs" />
                    {rangos.length > 1 && (
                        <button type="button" onClick={() => removeRango(setter, i)} className="text-red-500 hover:text-red-700">×</button>
                    )}
                </div>
            ))}
            <div className="flex justify-between items-center">
                <button type="button" onClick={() => addRango(setter)} className="text-blue-600 text-xs hover:underline">+ Agregar Salto</button>
                <span className="text-xs font-bold text-slate-700">Total: {calculateDays(rangos)} días</span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold font-oswald text-slate-800 uppercase tracking-tight">Registro de Cambio V2</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200">
                    {(['unilateral', 'reciproco', 'condonacion'] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={clsx(
                                "flex-1 py-3 text-sm font-bold uppercase transition-colors",
                                mode === m ? "border-b-2 border-slate-900 text-slate-900 bg-white" : "text-slate-400 bg-slate-50 hover:bg-slate-100"
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">

                    {/* Common Header */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Año</label>
                            <input type="number" value={anioImputacion} onChange={(e) => setAnioImputacion(parseInt(e.target.value))}
                                className="w-full border border-slate-200 rounded p-2 text-xs" placeholder="YYYY" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Orden (Opcional)</label>
                            <input type="number" value={numeroOrden} onChange={(e) => setNumeroOrden(e.target.value)} placeholder="Auto"
                                className="w-full border border-slate-200 rounded p-2 text-xs" />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* MODES */}
                    {mode === 'unilateral' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trabaja (Acreedor)</label>
                                    <select value={uniAcreedor} onChange={(e) => setUniAcreedor(e.target.value)} className="w-full border p-2 rounded text-sm" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Libera (Deudor)</label>
                                    <select value={uniDeudor} onChange={(e) => setUniDeudor(e.target.value)} className="w-full border p-2 rounded text-sm" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {renderDateRanges(uniRangos, setUniRangos)}

                            <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                    <input type="checkbox" checked={uniTriangulacion} onChange={(e) => setUniTriangulacion(e.target.checked)} />
                                    <span className="text-xs font-bold text-slate-700 uppercase">Triangulación (Tercero realiza el trabajo)</span>
                                </label>
                                {uniTriangulacion && (
                                    <select value={uniRealizadoPor} onChange={(e) => setUniRealizadoPor(e.target.value)} className="w-full border p-2 rounded text-sm" required>
                                        <option value="">Quién lo hizo físicamente?</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {mode === 'reciproco' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Práctico A (TRABAJA)</label>
                                    <select value={recAcreedor} onChange={(e) => setRecAcreedor(e.target.value)} className="w-full border p-2 rounded text-sm bg-green-50" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Práctico B (LIBRE)</label>
                                    <select value={recDeudor} onChange={(e) => setRecDeudor(e.target.value)} className="w-full border p-2 rounded text-sm bg-blue-50" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* IDA */}
                            <div className="border rounded-lg p-4 relative">
                                <span className="absolute -top-2 left-3 bg-white px-2 text-xs font-bold text-rose-600 uppercase">Ida: B TRABAJA por A</span>
                                <div className="space-y-3">
                                    {renderDateRanges(idaRangos, setIdaRangos)}
                                    <div className="flex items-center gap-4 text-xs">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={idaTriangulacion} onChange={(e) => setIdaTriangulacion(e.target.checked)} />
                                            Triangulado?
                                        </label>
                                        {idaTriangulacion && (
                                            <select value={idaRealizadoPor} onChange={(e) => setIdaRealizadoPor(e.target.value)} className="border p-1 rounded" required>
                                                <option value="">Tercero...</option>
                                                {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* VUELTA */}
                            <div className="border rounded-lg p-4 relative">
                                <span className="absolute -top-2 left-3 bg-white px-2 text-xs font-bold text-emerald-600 uppercase">Vuelta: A devuelve a B</span>
                                <div className="space-y-3">
                                    {renderDateRanges(vueltaRangos, setVueltaRangos)}
                                    <div className="flex items-center gap-4 text-xs">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={vueltaTriangulacion} onChange={(e) => setVueltaTriangulacion(e.target.checked)} />
                                            Triangulado?
                                        </label>
                                        {vueltaTriangulacion && (
                                            <select value={vueltaRealizadoPor} onChange={(e) => setVueltaRealizadoPor(e.target.value)} className="border p-1 rounded" required>
                                                <option value="">Tercero...</option>
                                                {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'condonacion' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quién Perdona? (Acreedor)</label>
                                    <select value={condAcreedor} onChange={(e) => setCondAcreedor(e.target.value)} className="w-full border p-2 rounded text-sm" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">A Quién? (Deudor)</label>
                                    <select value={condDeudor} onChange={(e) => setCondDeudor(e.target.value)} className="w-full border p-2 rounded text-sm" required>
                                        <option value="">Seleccionar...</option>
                                        {practicos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad de Días</label>
                                <input type="number" min="1" value={condDias} onChange={(e) => setCondDias(parseInt(e.target.value))}
                                    className="w-full border p-2 rounded text-sm" required />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observaciones</label>
                        <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)}
                            className="w-full border border-slate-200 rounded p-2 text-sm h-20 resize-none" placeholder="Detalles..." />
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 flex gap-4 bg-slate-50">
                    <button onClick={onClose} className="flex-1 border border-slate-200 bg-white text-slate-600 py-3 rounded font-bold uppercase hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="flex-1 bg-slate-900 text-white py-3 rounded font-bold uppercase hover:bg-slate-800 shadow-xl">
                        Confirmar Operación
                    </button>
                </div>
            </div>
        </div>
    );
}
