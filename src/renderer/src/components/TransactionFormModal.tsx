import { useState, useEffect } from 'react';
import { Practico, Intercambio, TipoIntercambio, DatosUnilateral, DatosReciproco, DatosCondonacion, RangoFecha } from '../../../shared/types';
import PilotCombobox from './PilotCombobox';
import AgileDateInput from './AgileDateInput';
import clsx from 'clsx';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Intercambio;
    practicos: Practico[];
}

interface AgileRange {
    start: string;
    days: number;
    autoFocus?: boolean;
}

export default function TransactionFormModal({ isOpen, onClose, onSuccess, initialData, practicos }: TransactionFormModalProps) {

    // 1. Meta State
    const [anioImputacion, setAnioImputacion] = useState(new Date().getFullYear());
    const [numeroOrden, setNumeroOrden] = useState('');
    const [observacion, setObservacion] = useState('');

    // 2. Date State (Start + Duration) -> Now Ranges
    const [ranges, setRanges] = useState<AgileRange[]>([{ start: new Date().toISOString().split('T')[0], days: 1 }]);

    // 3. Pilot State (A & B)
    const [pilotA, setPilotA] = useState(''); // Primary (Trabaja / Ida Proponent / Perdonador)
    const [pilotB, setPilotB] = useState(''); // Secondary (Libera / Ida Counterpart / Perdonado)

    // 4. Type State
    const [mode, setMode] = useState<TipoIntercambio>('unilateral');

    // 5. Contextual State
    // Unilateral
    const [uniTriangulacion, setUniTriangulacion] = useState(false);
    const [uniRealizadoPor, setUniRealizadoPor] = useState('');

    // Reciproco
    const [idaTriangulacion, setIdaTriangulacion] = useState(false);
    const [idaRealizadoPor, setIdaRealizadoPor] = useState('');

    // Vuelta (Reciproco Only)
    const [vueltaRanges, setVueltaRanges] = useState<AgileRange[]>([{ start: '', days: 1 }]);
    const [vueltaTriangulacion, setVueltaTriangulacion] = useState(false);
    const [vueltaRealizadoPor, setVueltaRealizadoPor] = useState('');

    // Helpers (Business Logic kept same)
    const mapBackendRangesToAgile = (backendRanges: RangoFecha[], defaultDays: number): AgileRange[] => {
        if (!backendRanges || backendRanges.length === 0) return [{ start: new Date().toISOString().split('T')[0], days: defaultDays }];

        return backendRanges.map(r => {
            let d = 1;
            if (r.start && r.end) {
                const s = new Date(r.start);
                const e = new Date(r.end);
                const diffTime = Math.abs(e.getTime() - s.getTime());
                d = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }
            return { start: r.start, days: d };
        });
    };

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
                    setPilotA(initialData.acreedor_id.toString());
                    setPilotB(initialData.deudor_id.toString());

                    setRanges(mapBackendRangesToAgile(d.rangos || [], d.dias));

                    setUniTriangulacion(!!d.realizado_por_id && d.realizado_por_id !== initialData.acreedor_id);
                    setUniRealizadoPor(d.realizado_por_id ? d.realizado_por_id.toString() : '');

                } else if (initialData.tipo === 'reciproco') {
                    const d = initialData.datos as DatosReciproco;
                    setPilotA(initialData.deudor_id.toString());
                    setPilotB(initialData.acreedor_id.toString());

                    // Ida
                    setRanges(mapBackendRangesToAgile(d.ida.rangos || [], d.ida.dias));
                    setIdaTriangulacion(!!d.ida.realizado_por_id && d.ida.realizado_por_id !== initialData.acreedor_id);
                    setIdaRealizadoPor(d.ida.realizado_por_id ? d.ida.realizado_por_id.toString() : '');

                    // Vuelta
                    setVueltaRanges(mapBackendRangesToAgile(d.vuelta.rangos || [], d.vuelta.dias));
                    setVueltaTriangulacion(!!d.vuelta.realizado_por_id && d.vuelta.realizado_por_id !== initialData.deudor_id);
                    setVueltaRealizadoPor(d.vuelta.realizado_por_id ? d.vuelta.realizado_por_id.toString() : '');

                } else if (initialData.tipo === 'condonacion') {
                    setPilotA(initialData.acreedor_id.toString());
                    setPilotB(initialData.deudor_id.toString());
                    const d = initialData.datos as DatosCondonacion;
                    setRanges([{ start: new Date().toISOString().split('T')[0], days: d.dias }]);
                }
            } else {
                // Reset (Agile Defaults)
                setMode('unilateral');
                setAnioImputacion(new Date().getFullYear());
                setNumeroOrden('');
                setObservacion('');
                setRanges([{ start: new Date().toISOString().split('T')[0], days: 1 }]);
                setPilotA('');
                setPilotB('');

                setUniTriangulacion(false); setUniRealizadoPor('');
                setIdaTriangulacion(false); setIdaRealizadoPor('');
                setVueltaRanges([{ start: '', days: 1 }]);
                setVueltaTriangulacion(false); setVueltaRealizadoPor('');
            }
        }
    }, [isOpen, initialData]);

    const updateRange = (setter: React.Dispatch<React.SetStateAction<AgileRange[]>>, index: number, field: keyof AgileRange, value: string | number) => {
        setter(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };

            if (index === 0 && field === 'start' && setter === setRanges) {
                const y = parseInt((value as string).split('-')[0]);
                if (!isNaN(y)) setAnioImputacion(y);
            }

            return copy;
        });
    };

    const addRange = (setter: React.Dispatch<React.SetStateAction<AgileRange[]>>) => {
        setter(prev => [...prev, { start: '', days: 1, autoFocus: true }]);
    };

    const removeRange = (setter: React.Dispatch<React.SetStateAction<AgileRange[]>>, index: number) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const calculateTotalDays = (rs: AgileRange[]) => {
        return rs.reduce((acc, r) => acc + (r.days || 0), 0);
    };

    const getEndDate = (start: string, days: number): string => {
        if (!start || days < 1) return '-';
        const d = new Date(start);
        d.setDate(d.getDate() + (days - 1));
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });
    };

    const convertAgileToBackendRanges = (agile: AgileRange[]): RangoFecha[] => {
        return agile.map(r => {
            if (!r.start) return { start: '', end: '' };
            const dStart = new Date(r.start);
            const dEnd = new Date(r.start);
            dEnd.setDate(dEnd.getDate() + (r.days - 1));
            return {
                start: r.start,
                end: dEnd.toISOString().split('T')[0]
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const totalDays = calculateTotalDays(ranges);
            const backendRanges = convertAgileToBackendRanges(ranges);

            let payload: any = {
                anio_imputacion: anioImputacion,
                customOrderNumber: numeroOrden ? parseInt(numeroOrden) : undefined,
                tipo: mode,
                observacion,
                fecha_turno: ranges[0]?.start || new Date().toISOString(),
                cantidad_dias: totalDays || 0
            };

            const pA = parseInt(pilotA);
            const pB = parseInt(pilotB);

            if (mode === 'unilateral') {
                payload.acreedor_id = pA;
                payload.deudor_id = pB;
                const datos: DatosUnilateral = {
                    dias: totalDays,
                    rangos: backendRanges,
                    realizado_por_id: uniTriangulacion ? parseInt(uniRealizadoPor) : null
                };
                payload.datos = datos;
            } else if (mode === 'reciproco') {
                payload.deudor_id = pA;
                payload.acreedor_id = pB;

                const vueltaTotalDays = calculateTotalDays(vueltaRanges);
                const vueltaBackendRanges = convertAgileToBackendRanges(vueltaRanges);

                const datos: DatosReciproco = {
                    ida: {
                        dias: totalDays,
                        rangos: backendRanges,
                        realizado_por_id: idaTriangulacion ? parseInt(idaRealizadoPor) : null
                    },
                    vuelta: {
                        dias: vueltaTotalDays,
                        rangos: vueltaBackendRanges,
                        realizado_por_id: vueltaTriangulacion ? parseInt(vueltaRealizadoPor) : null
                    }
                };
                payload.datos = datos;
                payload.cantidad_dias = totalDays;

            } else if (mode === 'condonacion') {
                payload.acreedor_id = pA;
                payload.deudor_id = pB;
                const datos: DatosCondonacion = { dias: totalDays };
                payload.datos = datos;
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

    const labelPilotA = mode === 'unilateral' ? 'Trabaja (Acreedor)'
        : mode === 'reciproco' ? 'Práctico A (Solicita)'
            : 'Perdona (Acreedor)';

    const labelPilotB = mode === 'unilateral' ? 'Libera (Deudor)'
        : mode === 'reciproco' ? 'Práctico B (Cubre)'
            : 'Es Perdonado (Deudor)';

    const renderDateInputs = (rs: AgileRange[], setter: React.Dispatch<React.SetStateAction<AgileRange[]>>, label: string) => (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm transition-colors duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2 transition-colors duration-300">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-100 transition-colors duration-300">{label}</label>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded transition-colors duration-300">Total: <span className="text-slate-900 dark:text-slate-100">{calculateTotalDays(rs)}</span> días</div>
            </div>

            <div className="space-y-3">
                {rs.map((r, i) => (
                    <div key={i} className="flex gap-3 items-end group">
                        <div className="flex-1">
                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 transition-colors duration-300">Fecha Inicio</label>
                            <AgileDateInput
                                value={r.start}
                                onChange={(e) => updateRange(setter, i, 'start', e.target.value)}
                                autoFocus={!!r.autoFocus}
                                required
                            />
                        </div>
                        <div className="w-20">
                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 transition-colors duration-300">Días</label>
                            <input type="number" min="1" value={r.days} onChange={(e) => updateRange(setter, i, 'days', parseInt(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-700 focus:border-slate-400 dark:focus:border-slate-500 outline-none text-center transition-all duration-300" required />
                        </div>
                        <div className="pb-3 w-16 text-right text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap opacity-60 transition-colors duration-300">
                            → {getEndDate(r.start, r.days)}
                        </div>
                        {rs.length > 1 && (
                            <button type="button" onClick={() => removeRange(setter, i)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-2.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors mb-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => addRange(setter)} className="mt-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 py-1">
                <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-full group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors duration-300"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                Agregar Rango
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col font-inter transition-colors duration-300">

                {/* Header */}
                <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center z-10 transition-colors duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-slate-900 dark:bg-slate-100 rounded-full transition-colors duration-300"></div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide transition-colors duration-300">Nuevo Registro</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 dark:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">

                    {/* 1. TOP META */}
                    <div className="grid grid-cols-[80px_80px_1fr] gap-6 items-start">
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider transition-colors duration-300">Año</label>
                            <input type="number" value={anioImputacion} onChange={(e) => setAnioImputacion(parseInt(e.target.value))}
                                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-600 focus:border-slate-800 dark:focus:border-slate-400 outline-none p-1 text-base font-bold text-center text-slate-700 dark:text-slate-200 transition-colors duration-300" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider transition-colors duration-300">Orden</label>
                            <input type="number" value={numeroOrden} onChange={(e) => setNumeroOrden(e.target.value)} placeholder="Auto"
                                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-600 focus:border-slate-800 dark:focus:border-slate-400 outline-none p-1 text-base font-bold text-center text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors duration-300" />
                        </div>
                        <div className="flex flex-col justify-end items-end h-full pt-4">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1 transition-colors duration-300">Imputación</span>
                            <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize leading-none transition-colors duration-300">
                                {ranges[0]?.start ? new Date(ranges[0].start).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 2. DATES (PRIMARY) */}
                        {renderDateInputs(ranges, setRanges, 'Período del Servicio')}

                        {/* 3. PILOTS */}
                        <div className="grid grid-cols-2 gap-4">
                            <PilotCombobox
                                label={labelPilotA}
                                value={pilotA}
                                onChange={(val) => setPilotA(val)}
                                practicos={practicos}
                                theme={mode === 'unilateral' ? 'emerald' : mode === 'reciproco' ? 'purple' : 'amber'}
                            />
                            <PilotCombobox
                                label={labelPilotB}
                                value={pilotB}
                                onChange={(val) => setPilotB(val)}
                                practicos={practicos}
                                theme={mode === 'unilateral' ? 'rose' : mode === 'reciproco' ? 'purple' : 'slate'}
                            />
                        </div>
                    </div>

                    {/* 4. TYPE SELECTOR */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-1.5 rounded-lg shadow-sm transition-colors duration-300">
                        <div className="flex">
                            {(['unilateral', 'reciproco', 'condonacion'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        setMode(m);
                                        // Smart Default Logic
                                        if (m === 'reciproco' && ranges[0]?.start) {
                                            const idaYear = ranges[0].start.split('-')[0];
                                            if (idaYear) {
                                                const today = new Date();
                                                const month = (today.getMonth() + 1).toString().padStart(2, '0');
                                                const day = today.getDate().toString().padStart(2, '0');
                                                const smartDate = `${idaYear}-${month}-${day}`;
                                                if (!vueltaRanges[0]?.start) {
                                                    setVueltaRanges([{ start: smartDate, days: 1 }]);
                                                }
                                            }
                                        }
                                    }}
                                    className={clsx(
                                        "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all duration-300",
                                        mode === m ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-100" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 5. CONTEXTUAL EXTRAS */}

                    {/* Unilateral Triangulation */}
                    {mode === 'unilateral' && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
                            <div className="flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer select-none group">
                                    <div className="relative">
                                        <input type="checkbox" checked={uniTriangulacion} onChange={(e) => setUniTriangulacion(e.target.checked)}
                                            className="appearance-none w-4 h-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-slate-800 dark:checked:bg-slate-200 checked:border-slate-800 dark:checked:border-slate-200 transition-all duration-300" />
                                        {uniTriangulacion && <svg className="absolute inset-0 w-4 h-4 text-white dark:text-slate-900 p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={clsx("text-xs font-bold uppercase tracking-wide transition-colors duration-300", uniTriangulacion ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>Triangulación</span>
                                </label>
                                {uniTriangulacion && (
                                    <PilotCombobox
                                        label="Realizado Por (Tercero)"
                                        value={uniRealizadoPor}
                                        onChange={setUniRealizadoPor}
                                        practicos={practicos}
                                        theme="slate"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reciproco Extras */}
                    {mode === 'reciproco' && (
                        <div className="space-y-6">
                            {/* Ida Logic (Uses Top Dates) */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-purple-500 dark:border-l-purple-500 transition-colors duration-300">
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-4 tracking-widest transition-colors duration-300">Opción Ida (Triangulación)</div>
                                <div className="flex flex-col gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <div className="relative">
                                            <input type="checkbox" checked={idaTriangulacion} onChange={(e) => setIdaTriangulacion(e.target.checked)}
                                                className="appearance-none w-4 h-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-purple-600 dark:checked:bg-purple-500 checked:border-purple-600 dark:checked:border-purple-500 transition-all duration-300" />
                                            {idaTriangulacion && <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={clsx("text-xs font-bold uppercase tracking-wide transition-colors duration-300", idaTriangulacion ? "text-purple-700 dark:text-purple-400" : "text-slate-500 dark:text-slate-400")}>Triangulación Ida</span>
                                    </label>
                                    {idaTriangulacion && (
                                        <PilotCombobox
                                            label="Realizado Por (Tercero)"
                                            value={idaRealizadoPor}
                                            onChange={setIdaRealizadoPor}
                                            practicos={practicos}
                                            theme="purple"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Vuelta Logic (New Dates - RANGES) */}
                            {renderDateInputs(vueltaRanges, setVueltaRanges, 'Período de la Vuelta')}

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500 dark:border-l-emerald-500 transition-colors duration-300">
                                <div className="flex flex-col gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <div className="relative">
                                            <input type="checkbox" checked={vueltaTriangulacion} onChange={(e) => setVueltaTriangulacion(e.target.checked)}
                                                className="appearance-none w-4 h-4 rounded border border-slate-300 dark:border-slate-600 checked:bg-emerald-600 dark:checked:bg-emerald-500 checked:border-emerald-600 dark:checked:border-emerald-500 transition-all duration-300" />
                                            {vueltaTriangulacion && <svg className="absolute inset-0 w-4 h-4 text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={clsx("text-xs font-bold uppercase tracking-wide transition-colors duration-300", vueltaTriangulacion ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>Triangulación Vuelta</span>
                                    </label>
                                    {vueltaTriangulacion && (
                                        <PilotCombobox
                                            label="Realizado Por (Tercero)"
                                            value={vueltaRealizadoPor}
                                            onChange={setVueltaRealizadoPor}
                                            practicos={practicos}
                                            theme="emerald"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6. OBSERVACIONES */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 transition-colors duration-300">
                        <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)}
                            className="w-full rounded p-3 text-sm resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none text-slate-700 dark:text-slate-200 bg-transparent min-h-[80px] transition-colors duration-300"
                            placeholder="AGREGAR OBSERVACIONES..." />
                    </div>

                </form>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-4 bg-white dark:bg-slate-800 z-10 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.05)] transition-colors duration-300">
                    <button onClick={onClose} className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3.5 rounded-lg font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-xs tracking-widest">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3.5 rounded-lg font-bold uppercase hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg hover:shadow-slate-900/20 transition-all hover:scale-[1.01] text-xs tracking-widest flex justify-center items-center gap-2">
                        <span>Confirmar Operación</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
