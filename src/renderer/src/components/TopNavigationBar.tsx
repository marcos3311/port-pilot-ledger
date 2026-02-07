import { useRef, useState, useEffect } from 'react';
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
            <div className="bg-white/95 backdrop-blur-sm rounded-b-2xl px-6 pb-3 pt-2 pointer-events-auto flex flex-col items-center gap-1 w-auto max-w-[calc(100vw-28rem)] transition-all duration-300 shadow-sm border-b border-x border-slate-200 border-t-0">
                {/* Carousel Container */}
                <div className="relative w-full flex items-center justify-center px-2 sm:px-8">
                    {/* Scroll Buttons */}
                    <button onClick={() => scroll('left')} className="absolute left-0 z-10 p-2 text-slate-300 hover:text-slate-600 transition-colors hidden sm:block bg-white/50 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div
                        ref={scrollRef}
                        onWheel={handleWheel}
                        className="flex gap-5 overflow-x-auto pb-3 pt-2 px-4 items-center scroll-smooth justify-start mx-auto max-w-full no-scrollbar"
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
                                        ? "bg-slate-900 scale-105 ring-2 ring-slate-100 shadow-md"
                                        : "bg-transparent group-hover:bg-slate-100"
                                )}>
                                    <PilotAvatar pilot={p} size="md" />
                                    {currentPilotId === p.id && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rounded-full" />
                                    )}
                                </div>
                                <span className={clsx(
                                    "text-[9px] font-bold uppercase truncate max-w-full tracking-widest transition-colors",
                                    currentPilotId === p.id ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
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
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-slate-800 group-hover:text-slate-800 transition-all bg-slate-50/50">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-800 uppercase tracking-widest">Nuevo</span>
                        </button>

                        {/* Retired Pilots Button (Inline) */}
                        <button
                            onClick={() => setShowRetiredModal(true)}
                            className="group flex flex-col items-center gap-2 min-w-[60px] hover:scale-105 transition-transform"
                        >
                            <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-slate-800 group-hover:text-slate-800 transition-all bg-slate-50/50">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-800 uppercase tracking-widest">Retor</span>
                        </button>
                    </div>

                    <button onClick={() => scroll('right')} className="absolute right-0 z-10 p-2 text-slate-300 hover:text-slate-600 transition-colors bg-white/50 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Create Pilot Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
                    <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold font-oswald text-slate-800 uppercase tracking-tight">Nuevo Práctico</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={newPilotName}
                                    onChange={e => setNewPilotName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Foto del Práctico (Opcional)</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const path = await window.api.selectPilotPhoto();
                                            if (path) setNewPilotFoto(path);
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-lg text-sm font-bold transition-colors border border-slate-200 flex-1 text-left truncate"
                                    >
                                        {newPilotFoto ? newPilotFoto.split(/[\\/]/).pop() : 'Seleccionar imagen desde PC...'}
                                    </button>
                                    {newPilotFoto && (
                                        <button
                                            type="button"
                                            onClick={() => setNewPilotFoto('')}
                                            className="p-3 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-500 font-bold uppercase text-xs tracking-wide hover:text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase text-xs tracking-wide shadow-sm"
                            >
                                Crear
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Retired Pilots Modal */}
            {showRetiredModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold font-oswald text-slate-800 uppercase tracking-tight">Prácticos Retirados</h3>
                            <button onClick={() => setShowRetiredModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {inactivePracticos.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-slate-400 font-oswald text-sm uppercase tracking-wider">No hay prácticos retirados</p>
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
                                            className="flex flex-col items-center p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                                        >
                                            <div className="grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">
                                                <PilotAvatar pilot={p} size="lg" />
                                            </div>
                                            <span className="mt-3 text-xs font-bold text-slate-500 group-hover:text-slate-800 uppercase tracking-wide text-center">
                                                {p.nombre}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                            <button
                                onClick={() => setShowRetiredModal(false)}
                                className="px-4 py-2 text-slate-500 font-bold uppercase text-xs tracking-wide hover:text-slate-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
