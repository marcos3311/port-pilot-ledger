import { useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger' | 'warning';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'default'
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap(modalRef, isOpen);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300 transform scale-100 opacity-100 animate-[fadeIn_0.2s_ease-out]">
                <div className="text-center mb-6">
                    <div className={clsx(
                        "w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 transition-colors",
                        type === 'danger' ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" :
                            type === 'warning' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}>
                        {type === 'danger' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        ) : type === 'warning' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-2">{title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={clsx(
                            "flex-1 p-2.5 rounded-lg font-bold uppercase text-xs tracking-wider shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]",
                            type === 'danger' ? "bg-rose-600 hover:bg-rose-700 text-white" :
                                type === 'warning' ? "bg-amber-500 hover:bg-amber-600 text-white" :
                                    "bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900"
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
