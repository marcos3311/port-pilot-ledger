import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Practico } from '../../../shared/types';
import clsx from 'clsx';
import TransactionFormModal from './TransactionFormModal';
import { useFocusTrap } from '../hooks/useFocusTrap';
import ConfirmModal from './ConfirmModal';

interface DashboardProps {
    onNavigatePilot: (id: number) => void;
    refreshKey?: number;
}

export default function Dashboard({ onNavigatePilot, refreshKey }: DashboardProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const [practicos, setPracticos] = useState<Practico[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [filterYear, setFilterYear] = useState<number | 'Todos'>('Todos');
    const [viewMode, setViewMode] = useState<'intercambios' | 'condonaciones'>('intercambios');

    const deleteModalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(deleteModalRef, showDeleteModal);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastTxElementRef = useCallback((node: HTMLTableRowElement | null) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setOffset(prevOffset => prevOffset + 30);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore]);

    const fetchTransactions = async (reset = false) => {
        setIsLoading(true);
        try {
            const currentOffset = reset ? 0 : offset;
            const response = await window.api.getDashboardData({
                year: filterYear,
                limit: 30,
                offset: currentOffset,
                view: viewMode
            });

            setTransactions(prev => reset ? response.transacciones : [...prev, ...response.transacciones]);
            setHasMore(response.hasMore);
            if (reset) setOffset(0);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setIsLoading(false);
            setInitialLoad(false);
        }
    };

    const fetchAuxData = () => {
        window.api.getPracticos().then(data => setPracticos(data.sort((a, b) => a.id - b.id)));
        window.api.getAvailableYears().then(setAvailableYears);
    };

    // Initial load for aux data
    useEffect(() => {
        fetchAuxData();
    }, []);

    // Reset and fetch on filter change, view change or refresh
    useEffect(() => {
        setTransactions([]);
        setOffset(0);
        setHasMore(true);
        fetchTransactions(true);
    }, [filterYear, viewMode, refreshKey]);

    // Fetch more when offset changes (but not on reset 0, which is handled by above effect)
    useEffect(() => {
        if (offset > 0) {
            fetchTransactions(false);
        }
    }, [offset]);

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
        await window.api.deleteTransactionSimple(deletingId, 'intercambio');
        setShowDeleteModal(false);
        setDeletingId(null);
        fetchTransactions(true);
    };

    const confirmDeleteShift = async () => {
        if (!deletingId) return;
        await window.api.deleteTransactionShift(deletingId);
        setShowDeleteModal(false);
        setDeletingId(null);
        fetchTransactions(true);
    };

    const [voidConfirmState, setVoidConfirmState] = useState<{ isOpen: boolean; id: string | null; currentStatus: string }>({ isOpen: false, id: null, currentStatus: '' });

    const toggleVoid = (id: string, currentStatus: string) => {
        setVoidConfirmState({ isOpen: true, id, currentStatus });
    };

    const handleConfirmVoid = async () => {
        const { id, currentStatus } = voidConfirmState;
        if (!id) return;

        const isVoid = currentStatus === 'sin_efecto';

        try {
            await window.api.setTransactionVoid(id, !isVoid);
            // Optimistic update or refresh
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, estado: isVoid ? 'activo' : 'sin_efecto' } : t));
            setVoidConfirmState({ isOpen: false, id: null, currentStatus: '' });
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (initialLoad && transactions.length === 0) return <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse transition-colors duration-300">Cargando...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">

            {/* White Container for Content */}
            <div className="flex-1 bg-white dark:bg-slate-800 mt-36 mx-6 mb-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden relative transition-all duration-300">

                {/* Header Row: Invaded by the Floating Nav */}
                <div className="px-8 mt-6 flex justify-between items-start w-full relative z-40 pointer-events-none">

                    {/* Left: Integrated Control Bar (Compact Vertical) */}
                    <div className="pointer-events-auto flex flex-col items-start bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-lg border border-slate-200 dark:border-slate-700 gap-2 transition-all">

                        {/* View Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 rounded-lg p-0.5 gap-0.5">
                            <button
                                onClick={() => setViewMode('intercambios')}
                                className={clsx(
                                    "px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all duration-300 flex items-center gap-1.5",
                                    viewMode === 'intercambios'
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                )}
                                title="Libro de Cambios"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                <span>LIBRO</span>
                            </button>
                            <button
                                onClick={() => setViewMode('condonaciones')}
                                className={clsx(
                                    "px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-all duration-300 flex items-center gap-1.5",
                                    viewMode === 'condonaciones'
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                )}
                                title="Condonaciones"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>COND</span>
                            </button>
                        </div>

                        {/* Year Filter (Compact Line) */}
                        <div className="flex items-center gap-2 px-1 w-full border-t border-slate-100 dark:border-slate-700/50 pt-1.5">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">AÑO</span>
                            <div className="relative group/select flex items-center flex-1">
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value === 'Todos' ? 'Todos' : parseInt(e.target.value))}
                                    className="bg-transparent border-none text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer p-0 pr-4 leading-none appearance-none transition-colors hover:text-slate-900 dark:hover:text-white w-full text-right"
                                >
                                    <option value="Todos" className="dark:bg-slate-800">TODO</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year} className="dark:bg-slate-800">{year}</option>
                                    ))}
                                </select>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover/select:text-slate-500 transition-colors">
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                    </svg>
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
                            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-slate-100/20 hover:scale-105 active:scale-95 group"
                            title="Nuevo Registro"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content: Master List */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 w-full no-scrollbar z-10 pt-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all duration-300">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md transition-colors duration-300">
                                <tr>
                                    <th className="px-6 py-4 w-28 text-center">Orden</th>
                                    <th className="px-6 py-4 w-48">Fecha Servicio</th>
                                    <th className="px-6 py-4">Cambio (Trabaja → Libre)</th>
                                    <th className="px-6 py-4 w-24 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm transition-colors duration-300">
                                {transactions.map((tx: any, index: number) => {
                                    const tipo = tx.tipo;
                                    const datos = tx.datos;
                                    const hasInactivePilot =
                                        tx.deudor_activo === 0 ||
                                        tx.acreedor_activo === 0;

                                    // Helper for Dates
                                    const renderDates = () => {
                                        if (tipo === 'reciproco') {
                                            const rangesIda = datos?.ida?.rangos || [];
                                            const rangesVuelta = datos?.vuelta?.rangos || [];

                                            const renderRangeList = (ranges: any[], label: string, colorClass: string) => {
                                                if (ranges.length === 0) return null;
                                                return (
                                                    <div className="flex flex-col gap-0.5 mb-1">
                                                        <span className={clsx("text-[9px] uppercase font-bold tracking-wider", colorClass)}>{label}</span>
                                                        {ranges.slice(0, 1).map((r, i) => {
                                                            const d1 = new Date(r.start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });
                                                            const d2 = r.end ? new Date(r.end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : d1;
                                                            return (
                                                                <span key={i} className="font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                                                                    {d1 === d2 ? d1 : `${d1} — ${d2}`}
                                                                </span>
                                                            );
                                                        })}
                                                        {ranges.length > 1 && <span className="text-[9px] text-slate-400">+{ranges.length - 1} más</span>}
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div className="flex flex-col">
                                                    {renderRangeList(rangesIda, "Ida", "text-purple-500 dark:text-purple-400")}
                                                    {renderRangeList(rangesVuelta, "Vuelta", "text-emerald-500 dark:text-emerald-400")}
                                                </div>
                                            );
                                        }

                                        if (tipo === 'condonacion') {
                                            const d = new Date(tx.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                                            return <span className="font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">{d}</span>;
                                        };

                                        let ranges: any[] = [];
                                        if (tipo === 'unilateral') ranges = datos?.rangos || [];

                                        if (ranges.length === 0) return <span className="text-slate-300 dark:text-slate-600">-</span>;

                                        return (
                                            <div className="flex flex-col gap-1">
                                                {ranges.slice(0, 2).map((r, i) => {
                                                    const d1 = new Date(r.start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });
                                                    const d2 = r.end ? new Date(r.end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : d1;
                                                    return (
                                                        <span key={i} className="font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300 text-[11px]">
                                                            {d1 === d2 ? d1 : `${d1} — ${d2}`}
                                                        </span>
                                                    );
                                                })}
                                                {ranges.length > 2 && <span className="text-[9px] text-slate-400">+{ranges.length - 2} más</span>}
                                            </div>
                                        );
                                    };

                                    const isLastElement = index === transactions.length - 1;

                                    return (
                                        <tr
                                            key={tx.id}
                                            ref={isLastElement ? lastTxElementRef : null}
                                            className={clsx(
                                                "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group",
                                                (tx.estado === 'anulado' || hasInactivePilot) && "bg-slate-50/50 dark:bg-slate-800/50 opacity-60 grayscale",
                                                tx.estado === 'sin_efecto' && "bg-slate-50/50 dark:bg-slate-800/50 opacity-50 decoration-slate-400 line-through text-slate-400"
                                            )}
                                        >
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={clsx(
                                                        "font-bold px-2 py-0.5 rounded text-xs ring-1 ring-inset",
                                                        tipo === 'reciproco' ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-purple-100 dark:ring-purple-800" :
                                                            tipo === 'condonacion' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-amber-100 dark:ring-amber-800" : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-600"
                                                    )}>
                                                        {tipo === 'condonacion' ? tx.anio_imputacion : `${tx.numero_orden}-${tx.anio_imputacion}`}
                                                    </span>
                                                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">{tipo.slice(0, 3)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    {renderDates()}
                                                    {tx.resumen_dias > 0 && (
                                                        <span className="text-[9px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider w-fit">
                                                            {tx.resumen_dias} DÍAS
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-3">
                                                    {/* MAIN ACTORS */}
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={() => onNavigatePilot(tx.acreedor_id)} className="font-bold text-slate-700 dark:text-slate-200 min-w-32 hover:text-slate-900 dark:hover:text-white transition-colors text-left text-sm">
                                                            {tx.acreedor_nombre}
                                                        </button>

                                                        {tipo === 'reciproco' ? (
                                                            <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                            </div>
                                                        ) : tipo === 'condonacion' ? (
                                                            <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-800 flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                                <svg className="w-3 h-3 text-slate-400 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            </div>
                                                        )}

                                                        <button onClick={() => onNavigatePilot(tx.deudor_id)} className="font-bold text-slate-700 dark:text-slate-200 min-w-32 hover:text-slate-900 dark:hover:text-white transition-colors text-right text-sm">
                                                            {tx.deudor_nombre}
                                                        </button>
                                                    </div>

                                                    {/* DETAILS / TRIANGULATION */}
                                                    {tipo === 'unilateral' && datos.realizado_por_id && (
                                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded border border-slate-200 dark:border-slate-600 border-l-2 border-l-amber-500 flex items-center gap-2 max-w-fit">
                                                            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Triangulación</span>
                                                            <span className="text-[10px] text-slate-700 dark:text-slate-200 font-bold">{practicos.find(p => p.id === datos.realizado_por_id)?.nombre || datos.realizado_por_id}</span>
                                                        </div>
                                                    )}

                                                    {tipo === 'reciproco' && (
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                                                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/30 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                                                <span className="uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Ida</span>
                                                                <span className="font-semibold text-slate-600 dark:text-slate-300">{datos.ida.dias} días</span>
                                                                {datos.ida.realizado_por_id && <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">TR</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/30 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                                                <span className="uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Vuelta</span>
                                                                <span className="font-semibold text-slate-600 dark:text-slate-300">{datos.vuelta.dias} días</span>
                                                                {datos.vuelta.realizado_por_id && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">TR</span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {tx.observacion && (
                                                        <div className="mt-2 flex items-start gap-2 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                            <div className="text-slate-400 dark:text-slate-500 mt-0.5">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug">{tx.observacion}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(tx)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    {viewMode === 'intercambios' && (
                                                        <button onClick={() => toggleVoid(tx.id, tx.estado)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title={tx.estado === 'sin_efecto' ? "Restaurar" : "Sin Efecto"}>
                                                            {tx.estado === 'sin_efecto' ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button onClick={() => { setDeletingId(tx.id); setShowDeleteModal(true); }} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {transactions.length === 0 && !isLoading && (
                            <div className="py-24 text-center">
                                <p className="text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[10px] font-bold">No hay registros para este período</p>
                            </div>
                        )}
                        {isLoading && transactions.length > 0 && (
                            <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/50">
                                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-0 mr-1"></span>
                                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150 mr-1"></span>
                                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-300"></span>
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
                    fetchTransactions(true);
                }}
                initialData={selectedTx}
                practicos={practicos}
            />

            <ConfirmModal
                isOpen={voidConfirmState.isOpen}
                onClose={() => setVoidConfirmState({ ...voidConfirmState, isOpen: false })}
                onConfirm={handleConfirmVoid}
                title={voidConfirmState.currentStatus === 'sin_efecto' ? "Restaurar Transacción" : "Marcar Sin Efecto"}
                message={voidConfirmState.currentStatus === 'sin_efecto'
                    ? "¿Está seguro de restaurar esta transacción? Volverá a sumar en los saldos."
                    : "¿Está seguro de marcar como Sin Efecto? No sumará en los saldos, pero se mantiene en el historial."}
                confirmText={voidConfirmState.currentStatus === 'sin_efecto' ? "Restaurar" : "Sin Efecto"}
                type={voidConfirmState.currentStatus === 'sin_efecto' ? "default" : "warning"}
            />

            {/* Modal: Smart Delete (Only for standard transactions) */}
            {viewMode === 'intercambios' && showDeleteModal && createPortal(
                <div ref={deleteModalRef} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-2">Eliminar Registro</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                                ¿Cómo desea proceder con la eliminación?
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={confirmDeleteSimple}
                                className="w-full border border-slate-200 dark:border-slate-600 hover:border-slate-800 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 p-3 rounded-lg flex flex-col items-center transition-all group"
                            >
                                <span className="font-bold uppercase text-xs tracking-wider">Opción 1: Liberar Nro</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Crea un hueco en el libro</span>
                            </button>

                            <button
                                onClick={confirmDeleteShift}
                                className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 p-3 rounded-lg flex flex-col items-center transition-all shadow-lg"
                            >
                                <span className="font-bold uppercase text-xs tracking-wider text-slate-50 dark:text-slate-900">Opción 2: Eliminar y Reordenar</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Renumera los registros siguientes</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingId(null);
                                }}
                                className="w-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold uppercase text-[10px] tracking-widest pt-4"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Simple Delete Confirmation for Condonaciones */}
            {viewMode === 'condonaciones' && showDeleteModal && createPortal(
                <div ref={deleteModalRef} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-2 text-center">Eliminar Condonación</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 text-center">
                            ¿Está seguro de eliminar esta condonación?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingId(null);
                                }}
                                className="flex-1 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (deletingId) {
                                        await window.api.deleteTransactionSimple(deletingId, 'condonacion');
                                        setShowDeleteModal(false);
                                        setDeletingId(null);
                                        fetchTransactions(true);
                                    }
                                }}
                                className="flex-1 p-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-xs tracking-wider shadow-lg transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
