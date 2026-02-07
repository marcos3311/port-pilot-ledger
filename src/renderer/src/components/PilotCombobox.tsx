import { useState, useRef, useEffect } from 'react';
import { Practico } from '../../../shared/types';
import PilotAvatar from './PilotAvatar';
import clsx from 'clsx';

interface PilotComboboxProps {
    label: string;
    value: string;
    onChange: (id: string) => void;
    practicos: Practico[];
    theme?: 'slate' | 'emerald' | 'rose' | 'purple' | 'amber' | 'blue';
    className?: string;
}

export default function PilotCombobox({ label, value, onChange, practicos, theme = 'slate', className }: PilotComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1); // For keyboard navigation
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedPilot = practicos.find(p => p.id.toString() === value);

    // Helpers
    const getLastName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        return parts.length > 0 ? parts[parts.length - 1] : fullName;
    };

    // Filter Logic
    const filteredPracticos = query === ''
        ? practicos
        : practicos.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()));

    // Outside Click & Blur Handling
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                validateSelection();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedPilot, query]);

    const validateSelection = () => {
        // If query is empty, allow clearing. If query matches display of selected, fine.
        // If user typed something but didn't select, revert or clear?
        // UX: Revert to selected pilot name if exists, else clear if query doesn't match a logic.
        // For now, simplify: just sync query to selected pilot (or empty)
        if (selectedPilot) {
            setQuery(getLastName(selectedPilot.nombre));
        } else {
            setQuery('');
        }
    };

    // Sync Query with Selection (External changes or initial)
    useEffect(() => {
        if (selectedPilot) {
            setQuery(getLastName(selectedPilot.nombre));
        } else {
            // Only clear query if it's strictly empty value and we aren't typing (open)
            // But here we rely on isOpen interaction.
            if (!isOpen) setQuery('');
        }
    }, [selectedPilot]);

    const handleSelect = (id: string, name: string) => {
        onChange(id);
        setQuery(getLastName(name));
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredPracticos.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < filteredPracticos.length) {
                    const p = filteredPracticos[activeIndex];
                    handleSelect(p.id.toString(), p.nombre);
                }
                break;
            case 'Tab':
                // Allow default Tab behavior (move to next field) but close dropdown.
                // Optionally select highlighted item if any? 
                // User requirement: "Autocomplete so i can press tab to change to other practico field"
                // Usually Tab confirms selection if highlighted, or just leaves.
                if (activeIndex >= 0 && activeIndex < filteredPracticos.length) {
                    const p = filteredPracticos[activeIndex];
                    handleSelect(p.id.toString(), p.nombre);
                } else {
                    setIsOpen(false);
                    validateSelection();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                validateSelection();
                break;
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Check if focus is moving to something inside the wrapper (unlikely if buttons aren't tabbable)
        // If focus moves outside, close.
        if (!wrapperRef.current?.contains(e.relatedTarget)) {
            setIsOpen(false);
            validateSelection();
        }
    };

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && activeIndex >= 0 && listRef.current) {
            const item = listRef.current.children[activeIndex] as HTMLElement;
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex, isOpen]);

    const themeStyles = {
        slate: 'border-slate-200 focus:border-slate-400 focus:ring-slate-100',
        emerald: 'border-slate-200 border-l-4 border-l-emerald-500 focus:border-emerald-300 focus:ring-emerald-50', // Matte Green Accent
        rose: 'border-slate-200 border-l-4 border-l-rose-500 focus:border-rose-300 focus:ring-rose-50',       // Matte Red Accent
        purple: 'border-slate-200 border-l-4 border-l-purple-500 focus:border-purple-300 focus:ring-purple-50', // Matte Purple Accent
        amber: 'border-slate-200 border-l-4 border-l-amber-500 focus:border-amber-300 focus:ring-amber-50',    // Matte Amber Accent
        blue: 'border-slate-200 border-l-4 border-l-blue-500 focus:border-blue-300 focus:ring-blue-50'
    };

    return (
        <div ref={wrapperRef} className={clsx("relative", className)} onBlur={handleBlur}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider truncate">{label}</label>

            <div className="relative group">
                <div className="relative">
                    {/* Selected Avatar Indicator */}
                    {selectedPilot && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-90 grayscale-[20%] group-hover:grayscale-0 transition-all">
                            <PilotAvatar pilot={selectedPilot} size="sm" />
                        </div>
                    )}

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                            setActiveIndex(0);
                            if (e.target.value === '') {
                                onChange('');
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onClick={() => setIsOpen(true)}
                        onFocus={() => {
                            setIsOpen(true);
                            inputRef.current?.select();
                        }}
                        className={clsx(
                            "w-full rounded bg-white p-2.5 text-sm font-semibold text-slate-700 outline-none shadow-sm transition-all focus:ring-2",
                            "placeholder:text-slate-300 placeholder:font-normal",
                            themeStyles[theme],
                            selectedPilot ? "pl-11" : "pl-3" // Adjust padding
                        )}
                        placeholder="BUSCAR..."
                        autoComplete="off"
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-slate-500 transition-colors">
                        <svg className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div ref={listRef} className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 custom-scrollbar ring-1 ring-slate-100">
                        {filteredPracticos.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center italic">No hay resultados</div>
                        ) : (
                            filteredPracticos.map((p, index) => (
                                <div
                                    key={p.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelect(p.id.toString(), p.nombre);
                                    }}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 p-2 cursor-pointer transition-colors border-b border-slate-50 last:border-0",
                                        index === activeIndex ? "bg-slate-50" : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className="scale-75 origin-left">
                                        <PilotAvatar pilot={p} size="sm" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">{p.nombre}</span>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{p.id}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
