import { useEffect, useState } from 'react';
import { DashboardData, Practico } from '../../../shared/types';
import clsx from 'clsx';
import TransactionFormModal from './TransactionFormModal';

interface DashboardProps {
    onNavigatePilot: (id: number) => void;
    refreshKey?: number;
}

export default function Dashboard({ onNavigatePilot, refreshKey }: DashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [practicos, setPracticos] = useState<Practico[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [filterYear, setFilterYear] = useState<number | 'Todos'>('Todos');

    const fetchData = () => {
        window.api.getDashboardData(filterYear).then(setData);
        window.api.getPracticos().then(setPracticos);
        window.api.getAvailableYears().then(setAvailableYears);
        console.log('Dashboard refreshing data...');
    };

    const formatDateRange = (startDateStr: string, days: number) => {
        const start = new Date(startDateStr + 'T12:00:00');
        if (days === 1) {
            return start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }
        const end = new Date(start);
        end.setDate(start.getDate() + (days - 1));

        const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        return `${fmt(start)} — ${fmt(end)}`;
    };

    useEffect(() => {
        fetchData();
    }, [filterYear, refreshKey]);

    const handleCreateNew = () => {
        setSelectedTx(null);
        setShowModal(true);
    };

    const handleEdit = (tx: any) => {
        setSelectedTx(tx);
        setShowModal(true);
    };

    const confirmDeleteSimple = async () => {
        if (!deletingId) return;
        await window.api.deleteTransactionSimple(deletingId);
        setShowDeleteModal(false);
        setDeletingId(null);
        fetchData();
    };

    const confirmDeleteShift = async () => {
        if (!deletingId) return;
        await window.api.deleteTransactionShift(deletingId);
        setShowDeleteModal(false);
        setDeletingId(null);
        fetchData();
    };

    if (!data) return <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400 font-oswald tracking-[0.3em] uppercase animate-pulse">Cargando...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-900 overflow-hidden relative">

            {/* White Container for Content */}
            <div className="flex-1 bg-white mt-32 mx-4 mb-4 rounded-[40px] shadow-2xl border border-slate-200/50 flex flex-col overflow-hidden relative">

                {/* Header Row: Invaded by the Floating Nav */}
                <div className="px-10 mt-8 flex justify-between items-start w-full relative z-40 pointer-events-none">

                    {/* Left: Year Filter */}
                    <div className="pointer-events-auto">
                        <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-2xl">
                            <div className="flex flex-col gap-0 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Año</label>
                                <div className="relative group/select">
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value === 'Todos' ? 'Todos' : parseInt(e.target.value))}
                                        className="bg-transparent border-none font-oswald text-xl font-bold text-slate-800 focus:ring-0 outline-none cursor-pointer p-0 pr-8 leading-none appearance-none transition-colors group-hover/select:text-blue-600"
                                    >
                                        <option value="Todos">TODOS</option>
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover/select:text-blue-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Spacer for Floating Nav */}
                    <div className="flex-1 min-w-[20px] h-20" aria-hidden="true" />

                    {/* Right: New Change Button */}
                    <div className="pointer-events-auto">
                        <button
                            onClick={handleCreateNew}
                            className="bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group border border-slate-800"
                            title="Nuevo Registro"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content: Master List */}
                <div className="flex-1 overflow-y-auto px-10 pb-10 w-full no-scrollbar z-10 pt-12">
                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-5 w-32">Orden</th>
                                    <th className="px-6 py-5 w-40">Fecha Servicio</th>
                                    <th className="px-6 py-5">Intercambio (Desde → Hacia)</th>
                                    <th className="px-6 py-5 w-24 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {data.transacciones.map((tx) => {
                                    const hasInactivePilot =
                                        tx.deudor_activo === 0 ||
                                        tx.acreedor_activo === 0 ||
                                        (Boolean(tx.es_triangulacion) && tx.realizado_por_activo === 0);

                                    return (
                                        <tr key={tx.id} className={clsx("hover:bg-slate-50/50 transition-colors group", (tx.estado === 'anulado' || hasInactivePilot) && "bg-gray-50 opacity-60 grayscale")}>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 font-oswald bg-slate-100 px-3 py-1 rounded-lg w-fit text-base">{tx.numero_orden}-{tx.anio_imputacion}</span>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap mt-1.5 pl-1 italic">{tx.fecha_registro}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-semibold whitespace-nowrap text-slate-600">
                                                        {formatDateRange(tx.fecha_turno, tx.cantidad_dias)}
                                                    </span>
                                                    {tx.cantidad_dias > 1 && (
                                                        <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase tracking-wider w-fit">
                                                            {tx.cantidad_dias} DÍAS
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={() => onNavigatePilot(tx.deudor_id)}
                                                            className="font-bold text-slate-800 min-w-36 hover:text-blue-600 transition-colors text-left"
                                                        >
                                                            {tx.deudor}
                                                        </button>
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                        </div>
                                                        <button
                                                            onClick={() => onNavigatePilot(tx.acreedor_id)}
                                                            className="font-bold text-slate-800 min-w-36 hover:text-blue-600 transition-colors text-right"
                                                        >
                                                            {tx.acreedor}
                                                        </button>
                                                    </div>
                                                    {Boolean(tx.es_triangulacion) && tx.realizado_por_id !== tx.acreedor_id && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-200 uppercase tracking-tighter">
                                                                TRIANGULACIÓN
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                Cubierto por: <strong className="text-slate-600">{tx.realizado_por}</strong>
                                                            </span>
                                                        </div>
                                                    )}
                                                    {tx.observacion && (
                                                        <p className="text-[11px] text-slate-400 mt-1.5 italic leading-tight border-l-2 border-slate-200 pl-3">"{tx.observacion}"</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(tx)}
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-200"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDeletingId(tx.id);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100 hover:border-red-200"
                                                        title="Eliminar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {data.transacciones.length === 0 && (
                            <div className="py-32 text-center">
                                <p className="text-slate-300 uppercase tracking-[0.2em] text-[10px] font-black">No hay registros para este período</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TransactionFormModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedTx(null);
                }}
                onSuccess={() => {
                    setShowModal(false);
                    fetchData();
                }}
                initialData={selectedTx}
                practicos={practicos}
            />

            {/* Modal: Smart Delete */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-8">
                        <div className="text-center">
                            <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold font-oswald text-slate-800 uppercase tracking-tight mb-2">Eliminar Registro</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                ¿Cómo desea proceder con la eliminación? Esta acción afectará el orden secuencial del libro.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={confirmDeleteSimple}
                                className="w-full border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 text-slate-700 p-4 rounded-xl flex flex-col items-center transition-all group"
                            >
                                <span className="font-bold uppercase text-xs tracking-wider">Opción 1: Liberar Nro</span>
                                <span className="text-[10px] text-slate-400 font-medium mt-1">Borra el registro pero mantiene los números siguientes (Crea un hueco)</span>
                            </button>

                            <button
                                onClick={confirmDeleteShift}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-xl flex flex-col items-center transition-all shadow-lg"
                            >
                                <span className="font-bold uppercase text-xs tracking-wider text-blue-400">Opción 2: Eliminar y Reordenar</span>
                                <span className="text-[10px] text-slate-400 font-medium mt-1">Borra el registro y renumera automáticamente los registros siguientes</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingId(null);
                                }}
                                className="w-full text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest pt-4"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
