import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export type ToastType = 'success' | 'error';

interface ToastProps {
    message: string;
    type?: ToastType;
    show: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type = 'success', show, onClose, duration = 1250 }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, duration);

            return () => clearTimeout(timer);
        }
        return undefined;
    }, [show, duration, onClose]);

    if (!show && !isVisible) return null;

    return createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
            <div
                className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-white/20 dark:border-slate-700/50 transition-all duration-500 ease-out transform",
                    isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95",
                    type === 'success' ? "bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900" : "bg-rose-500/90 text-white"
                )}
            >
                {type === 'success' ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                <span className="text-xs font-bold uppercase tracking-wide pr-1 pt-0.5">{message}</span>
            </div>
        </div>,
        document.body
    );
}
