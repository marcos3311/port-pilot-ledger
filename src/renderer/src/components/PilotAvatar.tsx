import { useState, useEffect } from 'react';
import { Practico } from '../../../shared/types';
import clsx from 'clsx';

interface PilotAvatarProps {
    pilot: Practico;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showStatus?: boolean;
}

export default function PilotAvatar({ pilot, size = 'md', className, showStatus = false }: PilotAvatarProps) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [pilot.foto_url, pilot.id]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    };

    const getPhotoUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Check for absolute local path (Windows or Unix style) containing slash or backslash
        if (url.includes('/') || url.includes('\\')) {
            return `pilot-photo://preview?path=${encodeURIComponent(url)}`;
        }
        // Using 'local' as host for better URL parsing in main process
        return `pilot-photo://local/${url}`;
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-24 h-24 text-2xl'
    };

    const isActive = pilot.activo === 1;

    return (
        <div className={clsx("relative inline-block", className)}>
            <div className={clsx(
                "rounded-full flex items-center justify-center font-bold overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300",
                sizeClasses[size],
                !pilot.foto_url || imgError ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-100 dark:border-slate-700" : "bg-slate-50 dark:bg-slate-700"
            )}>
                {pilot.foto_url && !imgError ? (
                    <img
                        src={getPhotoUrl(pilot.foto_url)!}
                        alt={pilot.nombre}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="tracking-widest">{getInitials(pilot.nombre)}</span>
                )}
            </div>
            {showStatus && (
                <span className={clsx(
                    "absolute bottom-0 right-0 block w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 border border-white dark:border-slate-900 shadow-sm transition-all duration-300",
                    isActive ? "bg-emerald-500" : "bg-rose-500"
                )} />
            )}
        </div>
    );
}
