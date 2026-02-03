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
            // Use toPng to get Data URL directly
            const dataUrl = await toPng(cardRef.current, {
                backgroundColor: '#f8fafc',
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

    if (!summary) return <div className="p-8 text-center text-slate-500 font-oswald uppercase tracking-widest text-xs">Cargando Resumen...</div>;

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
        <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-900 overflow-hidden relative">

            {/* White Container for Content */}
            <div className="flex-1 bg-white mt-32 mx-4 mb-4 rounded-[40px] shadow-2xl border border-slate-200/50 flex flex-col overflow-hidden relative">

                {/* Header Row: Invaded by the Floating Nav */}
                <div className="px-10 mt-8 flex justify-between items-start w-full relative z-40 pointer-events-none">

                    {/* Left: Back & Title */}
                    <div className="pointer-events-auto flex flex-col items-start gap-2">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Volver</span>
                        </button>
                    </div>

                    {/* Center: Spacer for Floating Nav */}
                    <div className="w-[500px] h-20" aria-hidden="true" />

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
                            className="h-12 px-6 rounded-2xl font-bold text-xs tracking-wide uppercase transition-colors shadow-sm border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 group flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                        </button>

                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto px-10 pb-10 w-full no-scrollbar z-10">
                    <div className="flex flex-col items-center gap-8 max-w-5xl mx-auto w-full pt-12">

                        {/* WhatsApp Card */}
                        <div ref={cardRef} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl w-full max-w-xl">
                            <div className="text-center border-b border-slate-50 mb-6 pb-4">
                                <h2 className="text-3xl font-black font-oswald text-slate-800 uppercase tracking-tighter">{summary.pilot.nombre}</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 bg-slate-50 py-1 px-3 rounded-full inline-block">
                                    Resumen de Saldos | {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative">
                                {/* Vertical Divider */}
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-100 -translate-x-1/2 block" />

                                <div className="pr-4">
                                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 bg-emerald-50 py-1.5 rounded-lg">
                                        A FAVOR (Me deben)
                                    </h3>
                                    <div className="space-y-3">
                                        {positiveBalances.map(b => (
                                            <button
                                                key={b.counterpartId}
                                                onClick={() => setFilterPilotId(b.counterpartId)}
                                                className="w-full text-left group hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors"
                                            >
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-bold group-hover:text-emerald-700 transition-colors uppercase text-[11px] truncate pr-2">{b.pilotName}</span>
                                                    <span className="text-emerald-600 font-black font-oswald text-lg">{b.balance}</span>
                                                </div>
                                            </button>
                                        ))}
                                        {positiveBalances.length === 0 && <p className="text-slate-300 text-[10px] uppercase font-bold tracking-tight py-4 text-center italic">Sin saldos a favor</p>}
                                    </div>
                                </div>

                                <div className="pl-4">
                                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 bg-rose-50 py-1.5 rounded-lg">
                                        EN CONTRA (Debo)
                                    </h3>
                                    <div className="space-y-3">
                                        {negativeBalances.map(b => (
                                            <button
                                                key={b.counterpartId}
                                                onClick={() => setFilterPilotId(b.counterpartId)}
                                                className="w-full text-left group hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors"
                                            >
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-bold group-hover:text-rose-700 transition-colors uppercase text-[11px] truncate pr-2">{b.pilotName}</span>
                                                    <span className="text-rose-600 font-black font-oswald text-lg">{Math.abs(b.balance)}</span>
                                                </div>
                                            </button>
                                        ))}
                                        {negativeBalances.length === 0 && <p className="text-slate-300 text-[10px] uppercase font-bold tracking-tight py-4 text-center italic">Sin deudas</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-50 flex justify-center">
                                <img src={logo} alt="Logo" className="h-14 w-auto drop-shadow-sm transition-opacity" />
                            </div>
                        </div>

                        {/* Capture Button (Moved) */}
                        <button
                            onClick={handleCopyImage}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-full font-bold text-xs tracking-wide uppercase transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>Capturar Resumen</span>
                        </button>

                        {/* Audit Table */}
                        <div className="w-full bg-white rounded-3xl border border-slate-100 overflow-hidden mb-8">
                            <div className="bg-slate-50/50 p-6 border-b border-slate-200 flex justify-between items-center backdrop-blur-sm">
                                <h3 className="text-sm font-bold font-oswald text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Historial
                                </h3>
                                {filterPilotId && (
                                    <button
                                        onClick={() => setFilterPilotId(null)}
                                        className="text-[10px] bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full font-bold uppercase transition-colors hover:border-slate-400 hover:text-slate-700 shadow-sm"
                                    >
                                        Ver Todos
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 w-24">Orden</th>
                                            <th className="px-6 py-4 w-32">Fecha</th>
                                            <th className="px-6 py-4">Intercambio</th>
                                            <th className="px-6 py-4 w-20 text-center">Días</th>
                                            <th className="px-6 py-4">Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-xs">
                                        {filteredHistorial.map(tx => {
                                            const isAcreedor = tx.acreedor_id === pilotId;
                                            const isDeudor = tx.deudor_id === pilotId;
                                            const isTriangulador = !isAcreedor && !isDeudor; // I am involved but not D or A => Triangulator

                                            return (
                                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-slate-700 font-oswald bg-slate-100 px-2 py-0.5 rounded text-[11px]">{tx.numero_orden}-{tx.anio_imputacion}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-500">
                                                        {tx.fecha_registro}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {tx.tipo === 'reciproco' ? (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-purple-600 font-bold uppercase tracking-wider text-[9px] bg-purple-50 px-1.5 rounded-[4px] border border-purple-100 mb-0.5">RECÍPROCO</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                        <span>Con:</span>
                                                                        <span className="font-bold uppercase text-slate-600">
                                                                            {isDeudor ? tx.acreedor_nombre : tx.deudor_nombre}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : tx.tipo === 'condonacion' ? (
                                                                <>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-amber-600 font-bold uppercase tracking-wider text-[9px] bg-amber-50 px-1.5 rounded-[4px] border border-amber-100 mb-0.5">CONDONACIÓN</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                        <span>{isDeudor ? 'Perdonado por:' : 'Perdonado a:'}</span>
                                                                        <span className="font-bold uppercase text-slate-600">
                                                                            {isDeudor ? tx.acreedor_nombre : tx.deudor_nombre}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {isAcreedor ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-emerald-600 font-black uppercase tracking-tighter bg-emerald-50 px-1.5 rounded-[4px] text-[10px]">ENTRA</span>
                                                                            <span className="text-slate-300">←</span>
                                                                            <span className="text-slate-600 font-bold uppercase">{tx.deudor_nombre}</span>
                                                                        </div>
                                                                    ) : isTriangulador ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-blue-500 font-black uppercase tracking-tighter bg-blue-50 px-1.5 rounded-[4px] text-[10px]">CUBRE</span>
                                                                            <span className="text-slate-300">→</span>
                                                                            <span className="text-slate-600 font-bold uppercase">{tx.acreedor_nombre}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-rose-500 font-black uppercase tracking-tighter bg-rose-50 px-1.5 rounded-[4px] text-[10px]">SALE</span>
                                                                            <span className="text-slate-300">→</span>
                                                                            <span className="text-slate-600 font-bold uppercase">{tx.acreedor_nombre}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={clsx(
                                                            "font-black font-oswald text-sm w-6 h-6 flex items-center justify-center rounded-full mx-auto",
                                                            tx.resumen_dias === 0 ? "bg-slate-100 text-slate-400" :
                                                                tx.resumen_dias! > 0 ? "bg-emerald-100 text-emerald-700" :
                                                                    "bg-rose-100 text-rose-700"
                                                        )}>
                                                            {Math.abs(tx.resumen_dias!)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 italic">
                                                        {tx.observacion && tx.observacion !== '' ? `"${tx.observacion}"` : <span className="text-slate-200">-</span>}
                                                        {Boolean(tx.es_triangulacion) && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-tighter">TRI</span>
                                                                <span className="text-[9px] text-slate-400">Cubrió {tx.realizado_por}</span>
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
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-lg font-bold font-oswald text-slate-800 uppercase tracking-tight">Editar Práctico</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
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
                                            className="ring-4 ring-slate-100"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                    </div>
                                    <button onClick={handlePhotoSelect} className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">
                                        Cambiar Foto
                                    </button>
                                </div>

                                {/* Name Display (Read Only) */}
                                <div className="w-full text-center">
                                    <h4 className="font-oswald text-xl font-bold text-slate-800">{editFormData.nombre}</h4>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Nombre del Práctico</p>
                                </div>

                                {/* Status Section */}
                                <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Estado</span>
                                        <span className={clsx(
                                            "text-sm font-bold",
                                            editFormData.activo === 1 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {editFormData.activo === 1 ? 'ACTIVO' : 'INACTIVO (BAJA)'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setEditFormData(prev => ({ ...prev, activo: prev.activo === 1 ? 0 : 1 }))}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors border",
                                            editFormData.activo === 1
                                                ? "bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                                                : "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                                        )}
                                    >
                                        {editFormData.activo === 1 ? 'Dar de Baja' : 'Reactivar'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-slate-500 font-bold uppercase text-xs tracking-wide hover:text-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold uppercase text-xs tracking-wide hover:bg-slate-800 shadow-lg shadow-slate-200"
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
