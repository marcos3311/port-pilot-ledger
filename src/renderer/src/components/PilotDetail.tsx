import { useEffect, useState, useRef } from 'react';
import { PilotSummary, DatosUnilateral, DatosReciproco } from '../../../shared/types';
import { toPng } from 'html-to-image';

import logo from '../assets/logo.png';
import PilotAvatar from './PilotAvatar';
import clsx from 'clsx';

interface PilotDetailProps {
    pilotId: number;
    year: number;
    onBack: () => void;
    onStatusChange?: () => void;
}

export default function PilotDetail({ pilotId, year, onBack, onStatusChange }: PilotDetailProps) {
    const [summary, setSummary] = useState<PilotSummary | null>(null);
    const [filterPilotId, setFilterPilotId] = useState<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState<{ nombre: string, foto_url: string | null, activo: number }>({
        nombre: '',
        foto_url: null,
        activo: 1
    });

    const handlePhotoSelect = async () => {
        try {
            const path = await window.api.selectPilotPhoto();
            if (path) {
                setEditFormData(prev => ({ ...prev, foto_url: path }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async () => {
        if (!summary) return;
        try {
            await window.api.updatePractico({
                id: summary.pilot.id,
                ...editFormData
            });
            setShowEditModal(false);
            fetchSummary();
            // Notify layout if status changed OR we just did an update (like photo)
            if (onStatusChange) {
                onStatusChange();
            }
        } catch (err: any) {
            alert('Error al actualizar: ' + err.message);
        }
    };

    const fetchSummary = () => {
        window.api.getPilotSummary(pilotId, year).then(setSummary);
    };

    useEffect(() => {
        fetchSummary();
    }, [pilotId, year]);



    const handleCopyImage = async () => {
        if (!cardRef.current) return;
        try {
            const isDark = document.documentElement.classList.contains('dark');
            // Use toPng to get Data URL directly
            const dataUrl = await toPng(cardRef.current, {
                backgroundColor: isDark ? '#1e293b' : '#f8fafc', // slate-800 for dark, slate-50 for light
                pixelRatio: 3, // Upscale for better quality
                cacheBust: true,
            });

            await window.api.copyImageToClipboard(dataUrl);
            alert('¡Resumen copiado al portapapeles como imagen!');
        } catch (err) {
            console.error('Error copying image:', err);
            alert('Error al copiar la imagen.');
        }
    };

    if (!summary) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Cargando Resumen...</div>;

    const positiveBalances = summary.balances.filter(b => b.balance > 0);
    const negativeBalances = summary.balances.filter(b => b.balance < 0);

    const filteredHistorial = filterPilotId
        ? summary.historial.filter(tx => {
            if (tx.deudor_id === filterPilotId || tx.acreedor_id === filterPilotId) return true;

            // Triangulation Check
            if (tx.tipo === 'unilateral') {
                const d = tx.datos as DatosUnilateral;
                return d.realizado_por_id === filterPilotId;
            }
            if (tx.tipo === 'reciproco') {
                const d = tx.datos as DatosReciproco;
                return d.ida.realizado_por_id === filterPilotId || d.vuelta.realizado_por_id === filterPilotId;
            }
            return false;
        })
        : summary.historial;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">

            {/* White Container for Content */}
            <div className="flex-1 bg-white dark:bg-slate-800 mt-28 mx-6 mb-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden relative transition-all duration-300">

                {/* Header Row: Invaded by the Floating Nav */}
                <div className="px-8 mt-6 flex justify-between items-start w-full relative z-40 pointer-events-none">

                    {/* Left: Back */}
                    <div className="pointer-events-auto flex flex-col items-start gap-2">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors group bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Volver</span>
                        </button>
                    </div>

                    {/* Center: Spacer for Floating Nav */}
                    <div className="w-[450px] h-16" aria-hidden="true" />

                    {/* Right: Actions */}
                    <div className="pointer-events-auto flex items-start gap-3">
                        <button
                            onClick={() => {
                                setEditFormData({
                                    nombre: summary.pilot.nombre,
                                    foto_url: summary.pilot.foto_url || null,
                                    activo: summary.pilot.activo
                                });
                                setShowEditModal(true);
                            }}
                            className="h-9 px-4 rounded-lg font-bold text-[10px] tracking-wide uppercase transition-colors shadow-sm border bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white group flex items-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                        </button>

                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 w-full custom-scrollbar z-10 transition-colors duration-300">
                    <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto w-full pt-8">

                        {/* WhatsApp Card */}
                        <div ref={cardRef} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-lg relative overflow-hidden transition-all duration-300">
                            <div className="text-center border-b border-slate-100 dark:border-slate-700 mb-6 pb-4 relative z-10 transition-colors duration-300">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter transition-colors duration-300">{summary.pilot.nombre}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-2 bg-slate-50 dark:bg-slate-700/50 py-1 px-3 rounded-full inline-block border border-slate-100 dark:border-slate-600 transition-colors duration-300">
                                    Resumen de Saldos | {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative z-10">
                                {/* Vertical Divider */}
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-100 dark:bg-slate-700 -translate-x-1/2 block transition-colors duration-300" />

                                <div className="pr-4">
                                    <h3 className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 py-1.5 rounded border border-emerald-100/50 dark:border-emerald-800/50 transition-colors duration-300">
                                        A FAVOR (Me deben)
                                    </h3>
                                    <div className="space-y-2">
                                        {positiveBalances.map(b => (
                                            <button
                                                key={b.counterpartId}
                                                onClick={() => setFilterPilotId(b.counterpartId)}
                                                className="w-full text-left group hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded p-1.5 -mx-1.5 transition-colors duration-300"
                                            >
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 dark:text-slate-300 font-bold group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors uppercase text-[10px] truncate pr-2">{b.pilotName}</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-base transition-colors duration-300">{b.balance}</span>
                                                </div>
                                            </button>
                                        ))}
                                        {positiveBalances.length === 0 && <p className="text-slate-300 dark:text-slate-600 text-[9px] uppercase font-bold tracking-tight py-4 text-center italic transition-colors duration-300">Sin saldos a favor</p>}
                                    </div>
                                </div>

                                <div className="pl-4">
                                    <h3 className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 py-1.5 rounded border border-rose-100/50 dark:border-rose-800/50 transition-colors duration-300">
                                        EN CONTRA (Debo)
                                    </h3>
                                    <div className="space-y-2">
                                        {negativeBalances.map(b => (
                                            <button
                                                key={b.counterpartId}
                                                onClick={() => setFilterPilotId(b.counterpartId)}
                                                className="w-full text-left group hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded p-1.5 -mx-1.5 transition-colors duration-300"
                                            >
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 dark:text-slate-300 font-bold group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors uppercase text-[10px] truncate pr-2">{b.pilotName}</span>
                                                    <span className="text-rose-600 dark:text-rose-400 font-black text-base transition-colors duration-300">{Math.abs(b.balance)}</span>
                                                </div>
                                            </button>
                                        ))}
                                        {negativeBalances.length === 0 && <p className="text-slate-300 dark:text-slate-600 text-[9px] uppercase font-bold tracking-tight py-4 text-center italic transition-colors duration-300">Sin deudas</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-center">
                                <img src={logo} alt="Logo" className="h-10 w-auto" />
                            </div>
                        </div>

                        {/* Capture Button (Moved) */}
                        <button
                            onClick={handleCopyImage}
                            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-slate-100/20 hover:scale-105 active:scale-95 flex items-center gap-2 mb-4"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>Capturar Resumen</span>
                        </button>

                        {/* Audit Table */}
                        <div className="w-full bg-slate-50 dark:bg-slate-700/30 rounded-xl overflow-hidden mb-8 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                            <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors duration-300">
                                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 transition-colors duration-300">
                                    <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Historial
                                </h3>
                                {filterPilotId && (
                                    <button
                                        onClick={() => setFilterPilotId(null)}
                                        className="text-[9px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-lg font-bold uppercase transition-colors hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                        Ver Todos
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300">
                                        <tr>
                                            <th className="px-6 py-3 w-20">Orden</th>
                                            <th className="px-6 py-3 w-36">Fecha</th>
                                            <th className="px-6 py-3">Intercambio</th>
                                            <th className="px-6 py-3 w-16 text-center">Días</th>
                                            <th className="px-6 py-3">Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs bg-white dark:bg-slate-800 transition-colors duration-300">
                                        {filteredHistorial.map(tx => {
                                            const isAcreedor = tx.acreedor_id === pilotId;
                                            const isDeudor = tx.deudor_id === pilotId;
                                            const isTriangulador = !isAcreedor && !isDeudor; // I am involved but not D or A => Triangulator

                                            return (
                                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-[10px] ring-1 ring-slate-200 dark:ring-slate-600">{tx.numero_orden}-{tx.anio_imputacion}</span>
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400 text-[10px]">
                                                        {(() => {
                                                            const d = tx.datos as any;
                                                            if (tx.tipo === 'reciproco') {
                                                                const ida = d.ida ? (d.ida.rangos || []) : [];
                                                                const vuelta = d.vuelta ? (d.vuelta.rangos || []) : [];

                                                                const renderRange = (r: any) => {
                                                                    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
                                                                    const d1 = new Date(r.start).toLocaleDateString('es-ES', dateOpts);
                                                                    const d2 = r.end ? new Date(r.end).toLocaleDateString('es-ES', dateOpts) : d1;
                                                                    return d1 === d2 ? d1 : `${d1} - ${d2}`;
                                                                };

                                                                return (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <div className="flex items-start gap-1.5">
                                                                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 w-8 mt-0.5">Ida:</span>
                                                                            <div className="flex flex-col gap-0.5">
                                                                                {ida.map((r: any, i: number) => (
                                                                                    <span key={i} className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border border-slate-200 dark:border-slate-600 font-mono">
                                                                                        {renderRange(r)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-start gap-1.5">
                                                                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 w-8 mt-0.5">Vta:</span>
                                                                            <div className="flex flex-col gap-0.5">
                                                                                {vuelta.map((r: any, i: number) => (
                                                                                    <span key={i} className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border border-slate-200 dark:border-slate-600 font-mono">
                                                                                        {renderRange(r)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } else {
                                                                // Unilateral / Condonacion
                                                                const rangos = d.rangos || [];
                                                                if (rangos.length === 0) return <span className="text-slate-400 dark:text-slate-600 text-[10px]">-</span>;

                                                                return (
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        {rangos.map((r: any, i: number) => {
                                                                            const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
                                                                            const d1 = new Date(r.start).toLocaleDateString('es-ES', dateOpts);
                                                                            const d2 = r.end ? new Date(r.end).toLocaleDateString('es-ES', dateOpts) : d1;
                                                                            return (
                                                                                <span key={i} className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap border border-slate-200 dark:border-slate-600 font-mono">
                                                                                    {d1 === d2 ? d1 : `${d1} - ${d2}`}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {tx.tipo === 'reciproco' ? (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider text-[9px] bg-purple-50 dark:bg-purple-900/20 px-1.5 rounded-[4px] ring-1 ring-purple-100 dark:ring-purple-800 mb-0.5">RECÍPROCO</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                                        <span>Con:</span>
                                                                        <span className="font-bold uppercase text-slate-700 dark:text-slate-200">
                                                                            {isDeudor ? tx.acreedor_nombre : tx.deudor_nombre}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : tx.tipo === 'condonacion' ? (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider text-[9px] bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded-[4px] ring-1 ring-amber-100 dark:ring-amber-800 mb-0.5">CONDONACIÓN</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                                                        <span>{isDeudor ? 'Perdonado por:' : 'Perdonado a:'}</span>
                                                                        <span className="font-bold uppercase text-slate-700 dark:text-slate-200">
                                                                            {isDeudor ? tx.acreedor_nombre : tx.deudor_nombre}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isAcreedor ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-1.5 rounded-[4px] text-[10px] ring-1 ring-emerald-100 dark:ring-emerald-800">ENTRA</span>
                                                                            <span className="text-slate-300 dark:text-slate-600">←</span>
                                                                            <span className="text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">{tx.deudor_nombre}</span>
                                                                        </div>
                                                                    ) : isTriangulador ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-1.5 rounded-[4px] text-[10px] ring-1 ring-blue-100 dark:ring-blue-800">CUBRE</span>
                                                                            <span className="text-slate-300 dark:text-slate-600">→</span>
                                                                            <span className="text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">{tx.acreedor_nombre}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-rose-600 dark:text-rose-400 font-black uppercase tracking-tighter bg-rose-50 dark:bg-rose-900/20 px-1.5 rounded-[4px] text-[10px] ring-1 ring-rose-100 dark:ring-rose-800">SALE</span>
                                                                            <span className="text-slate-300 dark:text-slate-600">→</span>
                                                                            <span className="text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">{tx.acreedor_nombre}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={clsx(
                                                            "font-bold text-xs px-2 py-0.5 rounded-full inline-block min-w-[24px]",
                                                            tx.resumen_dias === 0 ? "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" :
                                                                tx.resumen_dias! > 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800" :
                                                                    "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 ring-1 ring-rose-100 dark:ring-rose-800"
                                                        )}>
                                                            {Math.abs(tx.resumen_dias!)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                                        {tx.observacion && tx.observacion !== '' ? (
                                                            <div className="flex items-start gap-1.5 bg-slate-50 dark:bg-slate-700/30 p-1.5 rounded border border-slate-100 dark:border-slate-700/50">
                                                                <svg className="w-3 h-3 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                                <p className="text-[10px] leading-snug">{tx.observacion}</p>
                                                            </div>
                                                        ) : <span className="text-slate-200 dark:text-slate-700 text-lg leading-none">-</span>}
                                                        {Boolean(tx.es_triangulacion) && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800 uppercase tracking-tighter">TRI</span>
                                                                <span className="text-[9px] text-slate-400 dark:text-slate-500">Cubrió {tx.realizado_por}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors duration-300">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors duration-300">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Editar Práctico</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-8 flex flex-col items-center gap-6">
                                {/* Photo Section */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative group cursor-pointer" onClick={handlePhotoSelect}>
                                        <PilotAvatar
                                            pilot={{ ...summary!.pilot, foto_url: editFormData.foto_url || undefined }}
                                            size="xl"
                                            className="ring-4 ring-slate-100 dark:ring-slate-700"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                    <button onClick={handlePhotoSelect} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 uppercase tracking-wide transition-colors">
                                        Cambiar Foto
                                    </button>
                                </div>

                                {/* Name Display (Read Only) */}
                                <div className="w-full text-center">
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{editFormData.nombre}</h4>
                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-1">Nombre del Práctico</p>
                                </div>

                                {/* Status Section */}
                                <div className="w-full bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Estado Actual</span>
                                        <span className={clsx(
                                            "text-xs font-bold mt-1",
                                            editFormData.activo === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                        )}>
                                            {editFormData.activo === 1 ? 'ACTIVO' : 'INACTIVO (BAJA)'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setEditFormData(prev => ({ ...prev, activo: prev.activo === 1 ? 0 : 1 }))}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors border shadow-sm",
                                            editFormData.activo === 1
                                                ? "bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-300"
                                                : "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300"
                                        )}
                                    >
                                        {editFormData.activo === 1 ? 'Dar de Baja' : 'Reactivar'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 transition-colors">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wide hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold uppercase text-xs tracking-wide hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10 transition-colors"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
