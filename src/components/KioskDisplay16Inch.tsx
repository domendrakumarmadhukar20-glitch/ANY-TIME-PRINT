import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileText,
  Smartphone,
  Maximize2,
  Minimize2,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Sliders,
  Play,
  Pause,
  Compass,
} from 'lucide-react';
import { Advertisement, KioskDisplaySettings, Machine, PrintJob, PricingRule } from '../types';

interface KioskDisplay16InchProps {
  machineId: string;
  onOpenMobileKiosk?: () => void;
  onOpenAdmin?: () => void;
}

export const KioskDisplay16Inch: React.FC<KioskDisplay16InchProps> = ({
  machineId,
  onOpenMobileKiosk,
  onOpenAdmin,
}) => {
  // Real-time Display Data
  const [machine, setMachine] = useState<Machine | null>(null);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [pricing, setPricing] = useState<PricingRule | null>(null);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [kioskSettings, setKioskSettings] = useState<KioskDisplaySettings>({
    screensaverIdleSeconds: 20,
    screensaverEnabled: true,
    showWorkingStatusAlways: true,
    monitorSizeName: '16-Inch HD Multi-Touch Widescreen',
    touchToWakeMessage: '👆 स्क्रीन पर कहीं भी टच करें या मोबाइल से QR स्कैन करें',
    adBannerContactPhone: '+91 99999 99999',
    adBannerContactText: 'इस 16 इंच स्क्रीन पर अपना विज्ञापन दिखाने के लिए संपर्क करें',
  });

  // Mode: 'ACTIVE_WORKING' (Status & Kiosk) vs 'SCREENSAVER_AD' (Full Ad billboard)
  const [mode, setMode] = useState<'ACTIVE_WORKING' | 'SCREENSAVER_AD'>('ACTIVE_WORKING');
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [showDirectPrintModal, setShowDirectPrintModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<any>(null);

  // 1. Fetch live kiosk display data
  const fetchDisplayInfo = async () => {
    try {
      const res = await fetch(`/api/kiosk/display-info/${machineId}`);
      if (res.ok) {
        const data = await res.json();
        setMachine(data.machine);
        setActiveJob(data.activeJob);
        setQueuedCount(data.queuedCount);
        setPricing(data.pricing);
        if (data.advertisements && data.advertisements.length > 0) {
          setAdvertisements(data.advertisements);
        }
        if (data.kioskSettings) {
          setKioskSettings(data.kioskSettings);
        }
        if (data.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
        }

        // If a print job is actively printing, automatically wake screen to ACTIVE_WORKING!
        if (data.activeJob && (data.activeJob.status === 'PRINTING' || data.activeJob.status === 'QUEUED')) {
          setMode('ACTIVE_WORKING');
          setIdleSeconds(0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch kiosk display info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayInfo();
    const interval = setInterval(fetchDisplayInfo, 2500);
    return () => clearInterval(interval);
  }, [machineId]);

  // 2. Digital Clock
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // 3. User Activity & Touch-to-Wake Detection
  const handleUserTouch = () => {
    setIdleSeconds(0);
    if (mode === 'SCREENSAVER_AD') {
      setMode('ACTIVE_WORKING');
    }
  };

  useEffect(() => {
    const onActivity = () => handleUserTouch();
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('mousedown', onActivity);
    window.addEventListener('keydown', onActivity);

    return () => {
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('mousedown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [mode]);

  // 4. Idle Countdown Timer for Screensaver
  useEffect(() => {
    if (!kioskSettings.screensaverEnabled) return;

    idleTimerRef.current = setInterval(() => {
      // Don't switch to screensaver if an active job is printing
      if (activeJob && (activeJob.status === 'PRINTING' || activeJob.status === 'QUEUED')) {
        setIdleSeconds(0);
        return;
      }

      setIdleSeconds((prev) => {
        const next = prev + 1;
        if (next >= kioskSettings.screensaverIdleSeconds && mode !== 'SCREENSAVER_AD') {
          setMode('SCREENSAVER_AD');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(idleTimerRef.current);
  }, [kioskSettings.screensaverIdleSeconds, kioskSettings.screensaverEnabled, mode, activeJob]);

  // 5. Ad Carousel Rotation in Screensaver Mode
  useEffect(() => {
    if (advertisements.length === 0) return;
    const currentAd = advertisements[currentAdIndex] || advertisements[0];
    const duration = (currentAd.durationSeconds || 8) * 1000;

    const timer = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentAdIndex, advertisements, mode]);

  // 6. Fullscreen API toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.log(err));
      setIsFullscreen(false);
    }
  };

  const activeAd = advertisements[currentAdIndex] || advertisements[0] || {
    id: 'AD-FALLBACK',
    title: 'Any Time Print (ATP) Campus Kiosk',
    tagline: 'High Speed 24x7 Laser Printing Station for College Students',
    advertiserName: 'College Print Network',
    contactPhone: '+91 99999 99999',
    bannerBadge: 'CAMPUS PRINTER',
    bgGradient: 'from-indigo-950 via-slate-900 to-blue-950',
    accentColor: 'indigo',
    durationSeconds: 8,
  };

  const studentQrUrl = `${window.location.origin}/m/${machineId}`;

  // =========================================================================
  // RENDER MODE B: FULLSCREEN 16-INCH DIGITAL ADVERTISEMENT BILLBOARD
  // =========================================================================
  if (mode === 'SCREENSAVER_AD') {
    return (
      <div
        ref={containerRef}
        onClick={handleUserTouch}
        className={`relative w-full min-h-screen bg-slate-950 text-white overflow-hidden select-none cursor-pointer flex flex-col justify-between transition-colors duration-700 bg-gradient-to-br ${activeAd.bgGradient || 'from-indigo-950 via-slate-900 to-blue-950'}`}
      >
        {/* Subtle Ambient Background Mesh */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

        {/* Top Header Bar for 16" Signage */}
        <div className="relative z-10 p-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-400/40 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wide text-white">Any Time Print (ATP)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  KIOSK ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {machine?.name || 'Central Library Kiosk'} • HP LaserJet Pro MFP M126nw
              </p>
            </div>
          </div>

          {/* Clock & Status Badge */}
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <div className="font-mono text-2xl font-bold tracking-tight text-white">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-xs text-slate-400">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/15"
              title="Toggle Fullscreen (16-Inch Kiosk Monitor)"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Central High-Impact Advertisement Showcase */}
        <div className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Left Column: Big Catchy Ad Offer */}
          <div className="flex-1 space-y-6 animate-in fade-in duration-500">
            {/* Ad Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-amber-300 font-bold text-xs uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              {activeAd.bannerBadge || 'FEATURED CAMPUS PARTNER'}
            </div>

            {/* Big Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-md">
              {activeAd.title}
            </h1>

            {/* Sub-headline / Tagline */}
            <p className="text-lg md:text-2xl text-slate-200 font-medium leading-relaxed drop-shadow">
              {activeAd.tagline}
            </p>

            {/* Description */}
            {activeAd.description && (
              <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-normal">
                {activeAd.description}
              </p>
            )}

            {/* Advertiser Contact Card */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="bg-black/40 border border-white/15 px-4 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Contact / Inquiry</div>
                  <div className="font-mono text-base font-bold text-emerald-300">{activeAd.contactPhone}</div>
                </div>
              </div>

              {activeAd.ctaText && (
                <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold text-white">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>{activeAd.ctaText}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: QR Code & "Touch Screen to Print" Card */}
          <div className="w-full md:w-80 lg:w-96 bg-black/60 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-4">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              Laser Printer Ready (HP M126nw)
            </span>

            {/* Giant High-Contrast QR Code */}
            <div className="bg-white p-3.5 rounded-2xl shadow-xl flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to Print from Mobile"
                  className="w-44 h-44 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-400 font-mono">
                  Loading QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="font-bold text-base text-white">
                फोन से प्रिंट करें (Scan with Mobile)
              </div>
              <p className="text-xs text-slate-400">
                Camera या Paytm खोलकर QR स्कैन करें और अपनी PDF तुरंत प्रिंट करें
              </p>
            </div>

            {/* Big Touch To Start Button */}
            <button
              onClick={handleUserTouch}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer"
            >
              <span>👆 टच स्क्रीन छूकर शुरू करें</span>
            </button>
          </div>
        </div>

        {/* Bottom Wake-up & Ad Controls Ticker */}
        <div className="relative z-10 bg-black/60 border-t border-white/10 p-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Auto-cycle Indicators */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sponsored Ad ({currentAdIndex + 1}/{advertisements.length}):</span>
            <div className="flex items-center gap-1.5">
              {advertisements.map((ad, idx) => (
                <button
                  key={ad.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentAdIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentAdIndex ? 'w-8 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Center: Pulsing Touch Screen Prompt */}
          <div className="flex items-center gap-2 text-white font-bold animate-pulse text-sm">
            <span>{kioskSettings.touchToWakeMessage}</span>
          </div>

          {/* Right: Want to Advertise? */}
          <div className="flex items-center gap-2 text-slate-300">
            <span className="hidden lg:inline text-slate-400">{kioskSettings.adBannerContactText}:</span>
            <span className="font-mono text-emerald-400 font-bold">{kioskSettings.adBannerContactPhone}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER MODE A: ACTIVE WORKING STATUS & TOUCH KIOSK INTERFACE (16-INCH SCREEN)
  // =========================================================================
  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white"
    >
      {/* 1. TOP 16-INCH KIOSK HEADER BAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 p-4 lg:px-8 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-white tracking-wide">
                College Any Time Print (ATP)
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                16" KIOSK ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {machine?.name || 'Library Central Kiosk'} • {machine?.location || 'Ground Floor Circulation Desk'}
            </p>
          </div>
        </div>

        {/* Center Live Working Status Pill */}
        <div className="hidden md:flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400">Target Hardware:</span>
          <span className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            HP LaserJet Pro MFP M126nw
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Tray Stock:</span>
          <span className="font-mono font-bold text-emerald-400">
            {machine?.paperSheetsRemaining ?? 490} A4 Sheets
          </span>
        </div>

        {/* Right Action Icons: Fullscreen, Screensaver Trigger, Clock */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="font-mono text-lg font-bold text-white">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Idle Screensaver in {Math.max(0, kioskSettings.screensaverIdleSeconds - idleSeconds)}s
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('SCREENSAVER_AD')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Preview Advertisement Screensaver"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Play Ads</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            title="Toggle 16-Inch Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN 16-INCH WORKING DASHBOARD (STATUS + LIVE PRINT + SCAN STATION) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-6">
        {/* ROW 1: LIVE PRINTER STATUS DECK */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Printer Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                machine?.status === 'ONLINE'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
              }`}
            >
              <Printer className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Printer State</div>
              <div className="text-lg font-black text-white flex items-center gap-1.5">
                {activeJob?.status === 'PRINTING' ? (
                  <span className="text-amber-400 animate-pulse">Printing Document</span>
                ) : machine?.status === 'ONLINE' ? (
                  <span className="text-emerald-400">Ready to Print</span>
                ) : (
                  <span className="text-rose-400">Attention Required</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">HP LaserJet Pro MFP M126nw</p>
            </div>
          </div>

          {/* Card 2: Paper Tray Level */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-bold">
                <span>A4 Paper Tray</span>
                <span className="font-mono text-white">{machine?.paperLevelPercent ?? 98}%</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {machine?.paperSheetsRemaining ?? 490}{' '}
                <span className="text-xs font-normal text-slate-400">/ {machine?.paperTrayCapacity ?? 500} sheets</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${machine?.paperLevelPercent ?? 98}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Toner & Hardware */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Black Toner Level</div>
              <div className="text-lg font-black text-white font-mono">
                {machine?.tonerLevelPercent ?? 92}%{' '}
                <span className="text-xs font-normal text-emerald-400 font-sans">Healthy</span>
              </div>
              <p className="text-[11px] text-slate-400">HP 83A Black LaserJet Cartridge</p>
            </div>
          </div>

          {/* Card 4: College Print Rates */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0 font-black text-xl">
              ₹
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Fixed College Rates</div>
              <div className="text-sm font-bold text-white space-y-0.5">
                <div>Single-Side: <span className="text-emerald-400 font-mono">₹{pricing?.bwSingleSideRate.toFixed(2) ?? '2.00'}</span></div>
                <div>Both-Sides: <span className="text-indigo-400 font-mono">₹{pricing?.bwDoubleSideRate.toFixed(2) ?? '3.00'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: ACTIVE PRINT JOB MONITOR (If Printing or Queued) */}
        {activeJob && (
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border-2 border-indigo-500/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-spin">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                      LIVE PRINTING IN PROGRESS
                    </span>
                    <span className="text-xs font-mono text-slate-400">Order #{activeJob.jobId}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white truncate max-w-md">
                    {activeJob.fileName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-slate-400">Printing Page: </span>
                  <span className="text-emerald-300 font-bold text-sm">
                    {activeJob.currentPrintingPage || 1} / {activeJob.effectivePages || 1}
                  </span>
                </div>
                <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-slate-400">Copies: </span>
                  <span className="text-white font-bold text-sm">{activeJob.copies || 1}</span>
                </div>
              </div>
            </div>

            {/* Printing Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Laser spooler active • Heating fuser • Output tray collecting...
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {activeJob.progressPercent || 50}%
                </span>
              </div>
              <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-emerald-400 to-teal-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(15, activeJob.progressPercent || 50)}%` }}
                />
              </div>
            </div>

            <div className="text-center text-xs text-amber-200/90 font-medium">
              👉 छात्र कृपया HP LaserJet Pro MFP M126nw की एग्जिट ट्रे से अपना प्रिंट प्राप्त करें।
            </div>
          </div>
        )}

        {/* ROW 3: INTERACTIVE TOUCH STATION & QR MOBILE SCAN DUAL ZONE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ZONE 1 (7 cols): Giant Scan & Print QR Station (For students standing in front) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-3xl shadow-2xl shrink-0 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to Print from Mobile"
                  className="w-52 h-52 object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-52 h-52 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-mono">
                  Loading QR...
                </div>
              )}
            </div>

            <div className="space-y-4 text-center sm:text-left">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
                  📱 FASTEST MOBILE SCAN
                </span>
                <h2 className="text-2xl lg:text-3xl font-black text-white mt-2 leading-tight">
                  अपने फोन से तुरंत प्रिंट करें
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  1. अपने फोन का कैमरा, Google Lens या Paytm खोलें।<br />
                  2. इस QR कोड को स्कैन करके PDF चुनें और UPI से पे करें।<br />
                  3. आपका प्रिंट तुरंत नीचे HP प्रिंटर से निकल जाएगा!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenMobileKiosk) onOpenMobileKiosk();
                    else window.open(`/m/${machineId}`, '_blank');
                  }}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Open Mobile View</span>
                </button>

                <div className="text-[11px] text-slate-400">
                  No App Download Required • Works with Any Phone
                </div>
              </div>
            </div>
          </div>

          {/* ZONE 2 (5 cols): 16-Inch Mini Advertisement Preview & Touch Interaction */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-900/50 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Upcoming Advertisement
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Slide {currentAdIndex + 1}/{advertisements.length}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="text-xs text-indigo-400 font-semibold">{activeAd.advertiserName}</div>
                <h4 className="font-bold text-base text-white line-clamp-2">{activeAd.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-2">{activeAd.tagline}</p>
                <div className="text-[11px] text-emerald-400 font-mono pt-1">
                  📞 {activeAd.contactPhone}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('SCREENSAVER_AD')}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Show Fullscreen Advertisements (16" Mode)</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                जब कोई छात्र स्क्रीन पर टच नहीं करेगा, तो यह विज्ञापन स्वतः फुलस्क्रीन हो जाएगा।
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. 16-INCH KIOSK FOOTER BAR */}
      <footer className="bg-slate-900/90 border-t border-slate-800 py-3 px-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>College Any Time Print (ATP) Hardware Kiosk</span>
          <span>•</span>
          <span className="text-slate-300">16-Inch Touch Screen Display Ready</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>Advertiser Support: <strong className="text-emerald-400 font-mono">{kioskSettings.adBannerContactPhone}</strong></span>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-slate-500 hover:text-slate-300 underline cursor-pointer"
            >
              Admin Fleet
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
