import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import TopNavigationBar from './TopNavigationBar';
import PilotDetail from './PilotDetail';

import logo from '../assets/logo.png';
import logoDark from '../assets/logo-dark.png';

export default function Layout() {
    const [selectedPilotId, setSelectedPilotId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        console.log('Toggling theme from:', theme);
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handlePilotStatusChange = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">
            {/* Header: Logo & Title */}
            <div className="absolute top-0 left-0 w-full h-28 z-[60] flex items-center justify-between px-6 pointer-events-none">
                {/* Logo (Left) */}
                <button
                    onClick={() => setSelectedPilotId(null)}
                    className="pointer-events-auto transition-transform active:scale-97"
                >
                    <img src={theme === 'dark' ? logoDark : logo} alt="Logo" className="h-16 w-auto drop-shadow-sm filter" />
                </button>

                {/* Title (Center) */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full flex justify-center pointer-events-none">
                    <h1 className="font-sans font-black text-2xl text-slate-900/10 dark:text-white/10 uppercase tracking-[0.2em] select-none transition-colors duration-300">
                        Control de Cambios
                    </h1>
                </div>

                {/* Theme Switcher (Right) */}
                <div className="pointer-events-auto">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title={theme === 'light' ? "Cambiar a Modo Oscuro" : "Cambiar a Modo Claro"}
                    >
                        {theme === 'light' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* New Top Navigation (Floating) */}
            <div className="absolute top-24 left-0 w-full z-50 pointer-events-none">
                <TopNavigationBar
                    onPilotClick={setSelectedPilotId}
                    currentPilotId={selectedPilotId}
                    refreshKey={refreshKey}
                    onPilotUpdate={handlePilotStatusChange}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col pt-0">
                {selectedPilotId ? (
                    <PilotDetail
                        pilotId={selectedPilotId}
                        year={new Date().getFullYear()}
                        onBack={() => setSelectedPilotId(null)}
                        onStatusChange={handlePilotStatusChange}
                    />
                ) : (
                    <Dashboard
                        onNavigatePilot={setSelectedPilotId}
                        refreshKey={refreshKey}
                    />
                )}
            </main>
        </div>
    );
}
