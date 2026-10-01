import React, { useState, useEffect } from 'react';
import { StudentKiosk } from './components/StudentKiosk';
import { AdminDashboard } from './components/AdminDashboard';
import { KioskDisplay16Inch } from './components/KioskDisplay16Inch';
import { Printer, Shield, Sparkles, Smartphone, Layers, Cpu, Monitor } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'kiosk' | 'display' | 'admin'>('kiosk');
  const [adminTab, setAdminTab] = useState<
    'overview' | 'machines' | 'jobs' | 'agent' | 'paper' | 'pricing' | 'webhooks' | 'ads' | 'audit'
  >('overview');
  const [machineId, setMachineId] = useState<string>('ATP-XAV-001');

  // Check URL pathname for direct QR scans (e.g. /m/ATP-XAV-001 or /admin or /display)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/m/')) {
      const id = path.replace('/m/', '').trim();
      if (id) {
        setMachineId(id);
        setView('kiosk');
      }
    } else if (path === '/admin') {
      setView('admin');
    } else if (path === '/display' || path === '/kiosk-display') {
      setView('display');
    }
  }, []);

  const handleSwitchMachine = (newId: string) => {
    setMachineId(newId);
    window.history.pushState({}, '', `/m/${newId}`);
  };

  const handleOpenAdmin = (tab: 'overview' | 'agent' | 'ads' = 'overview') => {
    setAdminTab(tab);
    setView('admin');
    window.history.pushState({}, '', '/admin');
  };

  const handleOpenKiosk = (id: string) => {
    setMachineId(id);
    setView('kiosk');
    window.history.pushState({}, '', `/m/${id}`);
  };

  const handleOpen16InchDisplay = (id?: string) => {
    if (id) setMachineId(id);
    setView('display');
    window.history.pushState({}, '', '/display');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      {/* Top Universal Mode Switcher Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-white tracking-wide">College Any Time Print (ATP)</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline text-slate-400">
            Target Printer: <strong className="text-slate-200">HP LaserJet Pro MFP M126nw</strong>
          </span>
        </div>

        {/* 4 Clear Navigation Buttons */}
        <div className="bg-slate-950 rounded-xl p-1 border border-slate-800 flex items-center gap-1">
          {/* Button 1: Student Kiosk (Mobile / Desktop) */}
          <button
            onClick={() => {
              setView('kiosk');
              window.history.pushState({}, '', `/m/${machineId}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              view === 'kiosk'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Student View</span>
          </button>

          {/* Button 2: 16-Inch Touch Screen Monitor & Screensaver Ads */}
          <button
            onClick={() => handleOpen16InchDisplay()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              view === 'display'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-500/20'
            }`}
            title="Open 16-Inch Touch Monitor Mode with Live Printer Status & Screensaver Ads"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16" Touch Display</span>
          </button>

          {/* Button 3: Windows 10 Agent & Direct Print */}
          <button
            onClick={() => handleOpenAdmin('agent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              view === 'admin' && adminTab === 'agent'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/20'
            }`}
            title="Open Windows 10 Agent & HP LaserJet Hardware Controls"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Windows 10 Agent</span>
          </button>

          {/* Button 4: Admin Fleet */}
          <button
            onClick={() => handleOpenAdmin('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              view === 'admin' && adminTab !== 'agent'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Fleet</span>
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      {view === 'kiosk' ? (
        <StudentKiosk
          machineId={machineId}
          onSwitchMachine={handleSwitchMachine}
          onOpenAdmin={() => handleOpenAdmin('overview')}
        />
      ) : view === 'display' ? (
        <KioskDisplay16Inch
          machineId={machineId}
          onOpenMobileKiosk={() => {
            setView('kiosk');
            window.history.pushState({}, '', `/m/${machineId}`);
          }}
          onOpenAdmin={() => handleOpenAdmin('ads')}
        />
      ) : (
        <AdminDashboard
          onOpenKiosk={handleOpenKiosk}
          initialTab={adminTab as any}
          onOpen16InchDisplay={handleOpen16InchDisplay}
        />
      )}
    </div>
  );
}
