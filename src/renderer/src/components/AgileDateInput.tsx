import { useRef } from 'react';
import clsx from 'clsx';

interface AgileDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {

}

export default function AgileDateInput({ className, ...props }: AgileDateInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = () => {
        try {
            inputRef.current?.showPicker();
        } catch (e) {
            console.error("Browser doesn't support showPicker or context invalid", e);
        }
    };

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="date"
                className={clsx(
                    "w-full appearance-none [&::-webkit-calendar-picker-indicator]:hidden",
                    "bg-white border border-slate-200 rounded p-2.5 text-sm font-medium text-slate-700 shadow-sm",
                    "focus:ring-2 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all",
                    className
                )}
                {...props}
            />
            <button
                type="button"
                tabIndex={-1} // SKIP TAB STOP
                onClick={handleIconClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none p-1"
                title="Seleccionar fecha"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
        </div>
    );
}
