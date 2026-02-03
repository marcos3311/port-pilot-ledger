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
        // Using 'local' as host for better URL parsing in main process
        return `pilot-photo://local/${url}`;
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-24 h-24 text-2xl'
    };

    return (
        <div className={clsx("relative inline-block", className)}>
            <div className={clsx(
                "rounded-full flex items-center justify-center font-black font-oswald overflow-hidden border-2 border-white shadow-sm transition-all",
                sizeClasses[size],
                !pilot.foto_url || imgError ? "bg-slate-200 text-slate-500" : "bg-white"
            )}>
                {pilot.foto_url && !imgError ? (
                    <img
                        src={getPhotoUrl(pilot.foto_url)!}
                        alt={pilot.nombre}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span>{getInitials(pilot.nombre)}</span>
                )}
            </div>
            {showStatus && (
                <span className={clsx(
                    "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white",
                    pilot.activo === 1 ? "bg-emerald-500" : "bg-slate-400"
                )} />
            )}
        </div>
    );
}
