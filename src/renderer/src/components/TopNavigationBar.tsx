import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Practico } from '../../../shared/types';
import PilotAvatar from './PilotAvatar';
import clsx from 'clsx';

interface TopNavigationBarProps {
    onPilotClick: (id: number) => void;
    currentPilotId?: number | null;
    refreshKey?: number;
    onPilotUpdate?: () => void;
}

export default function TopNavigationBar({ onPilotClick, currentPilotId, refreshKey, onPilotUpdate }: TopNavigationBarProps) {
    const [practicos, setPracticos] = useState<Practico[]>([]);
    const [inactivePracticos, setInactivePracticos] = useState<Practico[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showRetiredModal, setShowRetiredModal] = useState(false);
    const [newPilotName, setNewPilotName] = useState('');
    const [newPilotFoto, setNewPilotFoto] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchPracticos = () => {
        window.api.getPracticos().then(data => {
            setPracticos(data.sort((a, b) => a.id - b.id));
        });
    };

    const fetchInactivePracticos = () => {
        window.api.getInactivePracticos().then(setInactivePracticos);
    };

    useEffect(() => {
        fetchPracticos();
    }, [refreshKey]);

    useEffect(() => {
        if (showRetiredModal) {
            fetchInactivePracticos();
        }
    }, [showRetiredModal, refreshKey]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await window.api.createPractico({
                nombre: newPilotName,
                foto_url: newPilotFoto || null
            });
            setShowModal(false);
            setNewPilotName('');
            setNewPilotFoto('');
            fetchPracticos();
            if (onPilotUpdate) onPilotUpdate();
        } catch (err: any) {
            alert('Error al crear práctico: ' + err.message);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Add Wheel Support for Horizontal Scroll
    const handleWheel = (e: React.WheelEvent) => {
        if (scrollRef.current) {
            e.preventDefault();
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const formatPilotName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length <= 1) return name;
        const initial = parts[0].charAt(0).toUpperCase();
        const lastName = parts[parts.length - 1];
        return `${initial}. ${lastName}`;
    };

    return (
        <div className="flex justify-center w-full pointer-events-none mb-4">
            {/* The Capsule */}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-b-2xl px-6 pb-3 pt-2 pointer-events-auto flex flex-col items-center gap-1 w-auto max-w-[calc(100vw-28rem)] transition-all duration-300"
            >
                {/* Carousel Container */}
                <div className="relative w-full flex items-center justify-center px-2 sm:px-8">
                    {/* Scroll Buttons */}
                    <button onClick={() => scroll('left')} className="absolute left-0 z-10 p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors hidden sm:block">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div
                        ref={scrollRef}
                        onWheel={handleWheel}
                        className={clsx(
                            "flex gap-5 overflow-x-auto pb-3 pt-2 px-4 items-center scroll-smooth justify-start mx-auto max-w-full",
                            isHovered ? "scrollbar-visible" : "scrollbar-hidden"
                        )}
                    >
                        {practicos.map(p => (
                            <button
                                key={p.id}
                                onClick={() => onPilotClick(p.id)}
                                className="group flex flex-col items-center gap-2 min-w-[75px] transition-transform hover:scale-105"
                            >
                                <div className={clsx(
                                    "p-0.5 rounded-full transition-all duration-300 relative",
                                    currentPilotId === p.id
                                        ? "bg-slate-900 dark:bg-slate-100 scale-105 ring-2 ring-slate-100 dark:ring-slate-700 shadow-md"
                                        : "bg-transparent group-hover:bg-slate-100 dark:group-hover:bg-slate-700"
                                )}>
                                    <PilotAvatar pilot={p} size="md" />
                                    {currentPilotId === p.id && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 dark:bg-slate-100 rounded-full" />
                                    )}
                                </div>
                                <span className={clsx(
                                    "text-[9px] font-bold uppercase truncate max-w-full tracking-widest transition-colors",
                                    currentPilotId === p.id ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                )}>
                                    {formatPilotName(p.nombre)}
                                </span>
                            </button>
                        ))}

                        {/* Add Pilot Button (Inline) */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="group flex flex-col items-center gap-2 min-w-[60px] hover:scale-105 transition-transform"
                        >
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-slate-800 dark:group-hover:border-slate-200 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-all bg-slate-50/50 dark:bg-slate-700/30">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 uppercase tracking-widest">Nuevo</span>
                        </button>

                        {/* Retired Pilots Button (Inline) */}
                        <button
                            onClick={() => setShowRetiredModal(true)}
                            className="group flex flex-col items-center gap-2 min-w-[60px] hover:scale-105 transition-transform"
                        >
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-slate-800 dark:group-hover:border-slate-200 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-all bg-slate-50/50 dark:bg-slate-700/30">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 uppercase tracking-widest">Retor</span>
                        </button>
                    </div>

                    <button onClick={() => scroll('right')} className="absolute right-0 z-10 p-2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Create Pilot Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-lg z-[100] flex items-center justify-center p-4 pointer-events-auto transition-all duration-300">
                    <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col transition-colors duration-300">
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center z-10 relative">
                            <h3 className="text-lg font-black font-sans text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Nuevo Práctico</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900/50 flex-1">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={newPilotName}
                                    onChange={e => setNewPilotName(e.target.value)}
                                    className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 focus:border-slate-400 dark:focus:border-slate-500 outline-none transition-all shadow-sm"
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Foto del Práctico</label>
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={async () => {
                                    const path = await window.api.selectPilotPhoto();
                                    if (path) setNewPilotFoto(path);
                                }}>
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden transition-colors group-hover:border-slate-400 dark:group-hover:border-slate-500">
                                        {newPilotFoto ? (
                                            <img src={`pilot-photo://preview?path=${encodeURIComponent(newPilotFoto)}`} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group-hover:border-slate-300 dark:group-hover:border-slate-600">
                                            <span className="truncate max-w-[180px]">{newPilotFoto ? newPilotFoto.split(/[\\/]/).pop() : 'Seleccionar imagen...'}</span>
                                            <span className="text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-400 dark:text-slate-500">Examinar</span>
                                        </div>
                                    </div>
                                    {newPilotFoto && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setNewPilotFoto(''); }}
                                            className="p-3 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                            title="Eliminar foto"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-white dark:bg-slate-800 p-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 z-10 relative">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-slate-900/10 dark:shadow-slate-100/10 transition-all hover:scale-105 active:scale-95"
                            >
                                Crear Práctico
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Retired Pilots Modal */}
            {showRetiredModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-lg z-[100] flex items-center justify-center p-4 pointer-events-auto transition-all duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col transition-colors duration-300">
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center z-10 relative">
                            <h3 className="text-lg font-black font-sans text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Prácticos Retirados</h3>
                            <button
                                onClick={() => setShowRetiredModal(false)}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                            {inactivePracticos.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                    </div>
                                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-xs tracking-widest">No hay prácticos retirados</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {inactivePracticos.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                onPilotClick(p.id);
                                                setShowRetiredModal(false);
                                            }}
                                            className="flex flex-col items-center p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-lg hover:-translate-y-0.5 transition-all group duration-300"
                                        >
                                            <div className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 scale-95 group-hover:scale-105">
                                                <PilotAvatar pilot={p} size="lg" />
                                            </div>
                                            <span className="mt-4 text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 uppercase tracking-widest text-center transition-colors">
                                                {formatPilotName(p.nombre)}
                                            </span>
                                            <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                                                INACTIVO
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-white dark:bg-slate-800 p-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 z-10 relative">
                            <button
                                onClick={() => setShowRetiredModal(false)}
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
