import { useState } from 'react';
import Dashboard from './Dashboard';
import TopNavigationBar from './TopNavigationBar';
import PilotDetail from './PilotDetail';

import logo from '../assets/logo.png';

export default function Layout() {
    const [selectedPilotId, setSelectedPilotId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handlePilotStatusChange = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
            {/* Header: Logo & Title */}
            <div className="absolute top-0 left-0 w-full h-32 z-40 flex items-center justify-between px-8 pointer-events-none">
                {/* Logo (Left) */}
                <button
                    onClick={() => setSelectedPilotId(null)}
                    className="pointer-events-auto transition-transform hover:scale-105 active:scale-95"
                >
                    <img src={logo} alt="Logo" className="h-24 w-auto drop-shadow-md" />
                </button>

                {/* Title (Center) */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full flex justify-center pointer-events-none">
                    <h1 className="font-oswald font-black text-4xl text-slate-800 tracking-tighter uppercase drop-shadow-sm select-none">
                        Control de Cambios
                    </h1>
                </div>

                {/* Spacer for Right Side (Optional) */}
                <div className="w-16" />
            </div>

            {/* New Top Navigation (Floating) */}
            <div className="absolute top-28 left-0 w-full z-50 pointer-events-none">
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
