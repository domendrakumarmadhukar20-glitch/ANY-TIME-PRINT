import React, { useState, useEffect } from 'react';
import {
  Printer,
  Layers,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  QrCode,
  Settings,
  Shield,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Cpu,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Key,
  CreditCard,
  Package,
  PlusCircle,
  BookOpen,
  MapPin,
  Globe,
  Monitor,
  Trash2,
  Plus,
  Phone,
  Play,
} from 'lucide-react';
import { Machine, PrintJob, PricingRule, PaperRefillLog, Advertisement, KioskDisplaySettings } from '../types';
import { QrStickerModal } from './QrStickerModal';
import { VirtualAgentTerminal } from './VirtualAgentTerminal';

interface AdminDashboardProps {
  onOpenKiosk: (machineId: string) => void;
  onOpen16InchDisplay?: (machineId?: string) => void;
  initialTab?: 'overview' | 'machines' | 'jobs' | 'agent' | 'paper' | 'pricing' | 'webhooks' | 'ads' | 'audit';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenKiosk,
  onOpen16InchDisplay,
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'machines' | 'jobs' | 'agent' | 'paper' | 'pricing' | 'webhooks' | 'ads' | 'audit'
  >(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Metrics
  const [metrics, setMetrics] = useState<any>({
    todayRevenue: 0,
    totalJobs: 0,
    successfulPrints: 0,
    failedPrints: 0,
    pendingPayments: 0,
    queuedJobs: 0,
    onlineMachines: 0,
    offlineMachines: 0,
    totalColleges: 2,
  });

  // Machines
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [stickerMachine, setStickerMachine] = useState<Machine | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [jobSearch, setJobSearch] = useState<string>('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);

  // Webhooks
  const [webhooks, setWebhooks] = useState<any[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Paper Refill Inventory & Log Register
  const [refillLogs, setRefillLogs] = useState<PaperRefillLog[]>([]);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);
  const [refillMachineId, setRefillMachineId] = useState<string>('ATP-XAV-001');
  const [refillSheets, setRefillSheets] = useState<number>(500);
  const [refillOperator, setRefillOperator] = useState<string>('Domendra Kumar (Kiosk Admin)');
  const [refillBrand, setRefillBrand] = useState<string>('JK Copier A4 75 GSM (1 Full Ream)');
  const [refillNotes, setRefillNotes] = useState<string>('Morning paper replenishment in empty tray');
  const [refillResetTray, setRefillResetTray] = useState<boolean>(true);
  const [refilling, setRefilling] = useState<boolean>(false);

  // Pricing
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [editingPricing, setEditingPricing] = useState<PricingRule | null>(null);
  const [savingPricing, setSavingPricing] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<any>({
    defaultFileRetentionMinutes: 30,
    paymentWebhookSecret: 'atp_whsec_prod_994a821e90',
    paymentGatewayProvider: 'RAZORPAY_SANDBOX',
    allowSimulatedPayments: true,
  });

  // Razorpay Gateway Linking State
  const [rzpKeyId, setRzpKeyId] = useState<string>('');
  const [rzpKeySecret, setRzpKeySecret] = useState<string>('');
  const [rzpWebhookSec, setRzpWebhookSec] = useState<string>('');
  const [rzpEnabled, setRzpEnabled] = useState<boolean>(false);
  const [rzpProvider, setRzpProvider] = useState<'RAZORPAY_LIVE' | 'RAZORPAY_TEST'>('RAZORPAY_TEST');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isLive?: boolean } | null>(null);
  const [testingRzp, setTestingRzp] = useState<boolean>(false);
  const [savingRzp, setSavingRzp] = useState<boolean>(false);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Advertisements & 16-Inch Kiosk Display State
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [kioskSettings, setKioskSettings] = useState<KioskDisplaySettings>({
    screensaverIdleSeconds: 20,
    screensaverEnabled: true,
    showWorkingStatusAlways: true,
    monitorSizeName: '16-Inch HD Multi-Touch Widescreen',
    touchToWakeMessage: '👆 स्क्रीन पर कहीं भी टच करें या मोबाइल से QR स्कैन करें',
    adBannerContactPhone: '+91 99999 99999',
    adBannerContactText: 'इस 16 इंच स्क्रीन पर अपना विज्ञापन दिखाने के लिए संपर्क करें',
  });
  const [savingKioskSettings, setSavingKioskSettings] = useState<boolean>(false);
  const [showNewAdModal, setShowNewAdModal] = useState<boolean>(false);
  const [newAdTitle, setNewAdTitle] = useState<string>('');
  const [newAdTagline, setNewAdTagline] = useState<string>('');
  const [newAdDesc, setNewAdDesc] = useState<string>('');
  const [newAdAdvertiser, setNewAdAdvertiser] = useState<string>('');
  const [newAdPhone, setNewAdPhone] = useState<string>('');
  const [newAdBadge, setNewAdBadge] = useState<string>('STUDENT OFFER');
  const [newAdDuration, setNewAdDuration] = useState<number>(8);
  const [newAdGradient, setNewAdGradient] = useState<string>('from-blue-950 via-slate-900 to-indigo-950');
  const [creatingAd, setCreatingAd] = useState<boolean>(false);

  // Data fetching functions
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        metricsRes,
        machinesRes,
        jobsRes,
        pricingRes,
        webhooksRes,
        auditRes,
        settingsRes,
        refillsRes,
        gatewayRes,
        adsRes,
        kioskSetRes,
      ] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/machines'),
        fetch('/api/admin/jobs'),
        fetch('/api/admin/pricing'),
        fetch('/api/admin/webhooks'),
        fetch('/api/admin/audit-logs'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/paper-refills'),
        fetch('/api/admin/gateway-config'),
        fetch('/api/advertisements'),
        fetch('/api/kiosk/settings'),
      ]);

      if (metricsRes.ok) {
        const d = await metricsRes.json();
        setMetrics(d.metrics);
      }
      if (machinesRes.ok) {
        const d = await machinesRes.json();
        setMachines(d.machines);
        if (!selectedMachine && d.machines.length > 0) {
          setSelectedMachine(d.machines[0]);
        }
      }
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        setJobs(d.jobs);
      }
      if (pricingRes.ok) {
        const d = await pricingRes.json();
        setPricingRules(d.pricingRules);
      }
      if (webhooksRes.ok) {
        const d = await webhooksRes.json();
        setWebhooks(d.webhooks);
      }
      if (auditRes.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setSettings(d.settings);
      }
      if (refillsRes.ok) {
        const d = await refillsRes.json();
        setRefillLogs(d.refills || []);
      }
      if (gatewayRes.ok) {
        const g = await gatewayRes.json();
        setRzpKeyId(g.razorpayKeyId || '');
        setRzpWebhookSec(g.razorpayWebhookSecret || '');
        setRzpEnabled(g.razorpayEnabled || false);
        setRzpProvider(
          g.paymentGatewayProvider === 'RAZORPAY_LIVE' ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST'
        );
        setWebhookUrl(g.webhookUrl || window.location.origin + '/api/payments/webhook');
      }
      if (adsRes.ok) {
        const a = await adsRes.json();
        setAdvertisements(a.advertisements || []);
      }
      if (kioskSetRes.ok) {
        const ks = await kioskSetRes.json();
        if (ks.settings) setKioskSettings(ks.settings);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle Refund
  const handleRefund = async (jobId: string) => {
    if (!confirm(`Are you sure you want to issue a refund for Job ${jobId}?`)) return;
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/refund`, { method: 'POST' });
      if (res.ok) {
        alert(`Refund successfully issued for ${jobId}!`);
        fetchAllData();
      } else {
        const err = await res.json();
        alert('Refund error: ' + err.error);
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    }
  };

  // Handle Save Pricing Rule
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPricing) return;
    try {
      setSavingPricing(true);
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPricing),
      });
      if (res.ok) {
        alert('Pricing rules updated successfully!');
        setEditingPricing(null);
        fetchAllData();
      }
    } catch (err: any) {
      alert('Failed to save pricing: ' + err.message);
    } finally {
      setSavingPricing(false);
    }
  };

  // Handle Save Paper Refill
  const handleSavePaperRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRefilling(true);
      const res = await fetch(`/api/machines/${refillMachineId}/refill-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetsAdded: refillSheets,
          operatorName: refillOperator,
          paperBrand: refillBrand,
          notes: refillNotes,
          resetTray: refillResetTray,
        }),
      });
      if (res.ok) {
        await fetchAllData();
        setShowRefillModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record paper refill');
      }
    } catch (err: any) {
      alert('Error recording paper refill: ' + err.message);
    } finally {
      setRefilling(false);
    }
  };

  // Export Refills to CSV
  const exportRefillsCsv = () => {
    if (refillLogs.length === 0) {
      alert('No paper refill entries to export.');
      return;
    }
    const headers = [
      'Refill_ID',
      'Date_Time',
      'Machine_ID',
      'Machine_Name',
      'Location',
      'Sheets_Added',
      'Previous_Stock',
      'New_Balance',
      'Operator',
      'Paper_Brand',
      'Notes',
    ];
    const rows = refillLogs.map((r) => [
      r.id,
      new Date(r.timestamp).toLocaleString('en-IN'),
      r.machineId,
      `"${r.machineName}"`,
      `"${r.location}"`,
      r.sheetsAdded,
      r.previousSheets,
      r.newTotalSheets,
      `"${r.operatorName}"`,
      `"${r.paperBrand}"`,
      `"${r.notes || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ATP_Paper_Refill_Register_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Test Razorpay API Connection
  const handleTestRazorpay = async () => {
    setTestingRzp(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/gateway-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: rzpKeyId, keySecret: rzpKeySecret }),
      });
      const d = await res.json();
      setTestResult(d);
    } catch (err: any) {
      setTestResult({ success: false, message: 'Connection test failed: ' + err.message });
    } finally {
      setTestingRzp(false);
    }
  };

  // Save Razorpay Gateway Settings
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRzp(true);
    try {
      const res = await fetch('/api/admin/gateway-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayKeyId: rzpKeyId,
          razorpayKeySecret: rzpKeySecret,
          razorpayWebhookSecret: rzpWebhookSec,
          razorpayEnabled: rzpEnabled,
          paymentGatewayProvider: rzpProvider,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        alert('Razorpay gateway settings saved successfully! Gateway is ' + (rzpEnabled ? 'ACTIVATED' : 'INACTIVE'));
        fetchAllData();
      } else {
        alert('Error saving gateway: ' + (d.error || 'Failed'));
      }
    } catch (err: any) {
      alert('Failed to save gateway config: ' + err.message);
    } finally {
      setSavingRzp(false);
    }
  };

  // 16-Inch Kiosk Display & Advertisement Handlers
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdAdvertiser.trim()) {
      alert('कृपया शीर्षक (Title) और विज्ञापनदाता का नाम (Advertiser Name) दर्ज करें।');
      return;
    }
    setCreatingAd(true);
    try {
      const res = await fetch('/api/advertisements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAdTitle,
          tagline: newAdTagline,
          description: newAdDesc,
          advertiserName: newAdAdvertiser,
          contactPhone: newAdPhone,
          bannerBadge: newAdBadge,
          durationSeconds: newAdDuration,
          bgGradient: newAdGradient,
          isActive: true,
        }),
      });
      if (res.ok) {
        setShowNewAdModal(false);
        setNewAdTitle('');
        setNewAdTagline('');
        setNewAdDesc('');
        setNewAdAdvertiser('');
        setNewAdPhone('');
        fetchAllData();
      } else {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
    } catch (err: any) {
      alert('Failed to create advertisement: ' + err.message);
    } finally {
      setCreatingAd(false);
    }
  };

  const handleToggleAdActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/advertisements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) fetchAllData();
    } catch (err: any) {
      alert('Error toggling ad: ' + err.message);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('क्या आप वाकई इस विज्ञापन को हटाना चाहते हैं?')) return;
    try {
      const res = await fetch(`/api/advertisements/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAllData();
    } catch (err: any) {
      alert('Error deleting ad: ' + err.message);
    }
  };

  const handleSaveKioskSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKioskSettings(true);
    try {
      const res = await fetch('/api/kiosk/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kioskSettings),
      });
      if (res.ok) {
        alert('16" Kiosk Display Settings saved successfully!');
        fetchAllData();
      }
    } catch (err: any) {
      alert('Failed to save kiosk settings: ' + err.message);
    } finally {
      setSavingKioskSettings(false);
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesStatus = jobStatusFilter === 'ALL' || j.status === jobStatusFilter;
    const q = jobSearch.toLowerCase();
    const matchesSearch =
      !jobSearch ||
      j.jobId.toLowerCase().includes(q) ||
      j.originalFileName.toLowerCase().includes(q) ||
      j.machineId.toLowerCase().includes(q) ||
      (j.paymentId && j.paymentId.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base text-white tracking-tight">ATP FLEET COMMAND</h1>
                <span className="text-[10px] bg-indigo-900/80 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-700/60">
                  HP M126nw Cluster
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Self-Service College QR Print & Verified Payment Spooler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onOpen16InchDisplay && (
              <button
                onClick={() => onOpen16InchDisplay(selectedMachine ? selectedMachine.id : 'ATP-XAV-001')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                title="Launch 16-Inch Kiosk Monitor Display with Screensaver Ads"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16" Kiosk Display</span>
              </button>
            )}
            <button
              onClick={() => onOpenKiosk(selectedMachine ? selectedMachine.id : 'ATP-XAV-001')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Student Kiosk
            </button>
            <button
              onClick={fetchAllData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto pt-3 mt-1 scrollbar-none text-xs">
          {[
            { id: 'overview', label: 'Fleet Overview', icon: TrendingUp },
            { id: 'machines', label: `Machines (${machines.length})`, icon: Printer },
            { id: 'ads', label: `16" Screen & Ads (${advertisements.length})`, icon: Monitor },
            { id: 'paper', label: `Paper Stock & Refills (${refillLogs.length})`, icon: Package },
            { id: 'jobs', label: `Print Jobs (${jobs.length})`, icon: Layers },
            { id: 'agent', label: 'Windows 10 Agent & Hardware', icon: Cpu },
            { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
            { id: 'webhooks', label: 'Payment Webhooks', icon: Shield },
            { id: 'audit', label: 'Audit Trail', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* TAB 1: FLEET OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Today's Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">₹{metrics.todayRevenue.toFixed(2)}</div>
                <span className="text-[11px] text-emerald-400 font-medium">100% Verified UPI/Card</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Successful Prints</span>
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">{metrics.successfulPrints}</div>
                <span className="text-[11px] text-slate-400">Total jobs: {metrics.totalJobs}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>In Spooler Queue</span>
                  <Layers className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">{metrics.queuedJobs}</div>
                <span className="text-[11px] text-slate-400">Active printing: HP M126nw</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Fleet Machines</span>
                  <Printer className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {metrics.onlineMachines}
                  <span className="text-xs text-slate-400 font-normal"> / {machines.length} Online</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {metrics.offlineMachines > 0 ? `${metrics.offlineMachines} Attention` : 'All Systems Ready'}
                </span>
              </div>
            </div>

            {/* Quick Machines Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Active Kiosks & Printers</h3>
                  <p className="text-xs text-slate-400">
                    Live hardware heartbeat and queue telemetry
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('machines')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  Manage All Machines <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {machines.map((m) => {
                  const isOnline = m.status === 'ONLINE' && !m.paperJam && !m.outOfPaper;
                  return (
                    <div
                      key={m.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded text-amber-400 border border-slate-800">
                            {m.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isOnline
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                              }`}
                            ></span>
                            {isOnline ? 'ONLINE' : 'NEEDS ATTENTION'}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white">{m.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{m.location}</p>

                        <div className="mt-3 pt-3 border-t border-slate-900 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Printer</span>
                            <span className="font-medium text-slate-300 truncate block">
                              {m.printerModel}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Paper Balance</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {m.outOfPaper
                                ? '0 Sheets (EMPTY)'
                                : `${m.paperSheetsRemaining ?? m.paperSheetsAvailable ?? 490} / ${m.paperTrayCapacity || 500} Sheets`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between gap-1">
                        <button
                          onClick={() => {
                            setRefillMachineId(m.id);
                            setShowRefillModal(true);
                          }}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/40"
                          title="Record paper added at this location"
                        >
                          <Package className="w-3.5 h-3.5" />
                          + Paper
                        </button>
                        <button
                          onClick={() => setStickerMachine(m)}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR Sticker
                        </button>
                        <button
                          onClick={() => onOpenKiosk(m.id)}
                          className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors"
                        >
                          Open Kiosk
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Print Jobs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Recent Print Stream</h3>
                  <p className="text-xs text-slate-400">
                    Latest student jobs processed through verified payment webhooks
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  View All Jobs ({jobs.length}) <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="pb-3">Job ID</th>
                      <th className="pb-3">Document</th>
                      <th className="pb-3">Kiosk</th>
                      <th className="pb-3">Pages / Copies</th>
                      <th className="pb-3">Paid Amount</th>
                      <th className="pb-3">Print Status</th>
                      <th className="pb-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {jobs.slice(0, 6).map((j) => (
                      <tr key={j.jobId} className="hover:bg-slate-800/30">
                        <td className="py-3 font-mono text-indigo-400 font-bold">{j.jobId}</td>
                        <td className="py-3 text-white max-w-[180px] truncate">
                          {j.originalFileName}
                        </td>
                        <td className="py-3 font-mono text-slate-300">{j.machineId}</td>
                        <td className="py-3 text-slate-300">
                          {j.effectivePages} pgs • {j.copies} c ({j.duplexMode})
                        </td>
                        <td className="py-3 font-bold text-emerald-400">
                          ₹{j.calculatedAmount || j.amount}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              j.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : j.status === 'PRINTING'
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800 animate-pulse'
                                : j.status === 'QUEUED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : j.status === 'FAILED'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {new Date(j.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          No print jobs processed yet. Upload and test via the Student Kiosk!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MACHINES MANAGEMENT */}
        {activeTab === 'machines' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">College Machines & Printers</h2>
                <p className="text-xs text-slate-400">
                  Manage installed ATP kiosks, Windows authentication tokens, and printable QR codes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {machines.map((machine) => {
                const isOnline = machine.status === 'ONLINE';
                return (
                  <div
                    key={machine.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-black text-sm bg-slate-950 text-amber-400 border border-slate-800 px-3 py-1 rounded-xl">
                          {machine.id}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            isOnline
                              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                              : 'bg-rose-950/80 border-rose-700 text-rose-400'
                          }`}
                        >
                          {machine.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white">{machine.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{machine.location}</p>
                      <p className="text-[11px] text-indigo-400 font-semibold mt-0.5">
                        {machine.collegeName}
                      </p>

                      <div className="mt-4 bg-slate-950 rounded-2xl p-4 border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Printer Model:</span>
                          <span className="font-semibold text-slate-200">
                            {machine.printerModel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Connection:</span>
                          <span className="font-mono text-slate-200">
                            {machine.printerConnection || 'USB001'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Paper Balance:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {machine.outOfPaper
                              ? '0 Sheets (EMPTY)'
                              : `${machine.paperSheetsRemaining ?? machine.paperSheetsAvailable ?? 490} / ${machine.paperTrayCapacity || 500} Sheets`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Lifetime Printed:</span>
                          <span className="font-mono text-indigo-300 font-semibold">
                            {machine.totalSheetsPrintedLifetime || 0} Sheets
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Toner Level:</span>
                          <span className="font-mono text-slate-200">{machine.tonerLevelPercent}%</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                          <span className="text-slate-400">Agent Token:</span>
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                            <span>{machine.secretToken || 'atp_sec••••••••'}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  machine.secretToken || 'atp_sec_xav_lib_01_98f4a'
                                );
                                setCopiedToken(machine.id);
                                setTimeout(() => setCopiedToken(null), 2000);
                              }}
                              className="text-indigo-400 hover:text-white"
                              title="Copy token"
                            >
                              {copiedToken === machine.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRefillMachineId(machine.id);
                          setShowRefillModal(true);
                        }}
                        className="w-full mt-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Package className="w-3.5 h-3.5" />
                        + Load Paper in Tray (कागज लोड करें)
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setStickerMachine(machine)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Print QR Sticker
                      </button>

                      <button
                        onClick={() => onOpenKiosk(machine.id)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                        title="Simulate Scan"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PAPER INVENTORY & LOCATION REFILL REGISTER */}
        {activeTab === 'paper' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  Campus Paper Stock & Location Refill Register
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  किस लोकेशन के प्रिंटर में कब कितना पेपर डाला गया और कितना बाकी है, उसका लाइव रजिस्टर
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportRefillsCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Register (CSV)
                </button>
                <button
                  onClick={() => {
                    setRefillMachineId(machines[0]?.id || 'ATP-XAV-001');
                    setShowRefillModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  + Load Paper in Printer (कागज डालें)
                </button>
              </div>
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Total Paper in Trays</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {machines.reduce((acc, m) => acc + (m.paperSheetsRemaining ?? m.paperSheetsAvailable ?? 0), 0)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Sheets available right now</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Total Sheets Printed</span>
                <span className="text-2xl font-black text-indigo-400 font-mono">
                  {machines.reduce((acc, m) => acc + (m.totalSheetsPrintedLifetime || 0), 0)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Sheets consumed across campus</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Total Refill Entries</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {refillLogs.length}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Logged replenishment events</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Low Paper Alerts</span>
                <span className="text-2xl font-black text-white font-mono">
                  {machines.filter((m) => (m.paperSheetsRemaining ?? m.paperSheetsAvailable ?? 0) < 50).length}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Trays below 50 sheets</span>
              </div>
            </div>

            {/* Current Paper by Location Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">Live Paper Status by Campus Location</h3>
                  <p className="text-xs text-slate-400">
                    प्रत्येक प्रिंटर की लोकेशन, वर्तमान शीट्स, कुल प्रिंट और अंतिम लोड की जानकारी
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {machines.map((m) => {
                  const remaining = m.paperSheetsRemaining ?? m.paperSheetsAvailable ?? 490;
                  const capacity = m.paperTrayCapacity || 500;
                  const pct = Math.min(100, Math.round((remaining / capacity) * 100));
                  const isLow = remaining < 50;
                  const isEmpty = remaining === 0 || m.outOfPaper;

                  return (
                    <div
                      key={m.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {m.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isEmpty
                                ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                                : isLow
                                ? 'bg-amber-950/80 border-amber-700 text-amber-300 animate-pulse'
                                : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            }`}
                          >
                            {isEmpty ? 'EMPTY' : isLow ? 'LOW PAPER' : 'HEALTHY'}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white">{m.name}</h4>
                        <div className="flex items-start gap-1 text-xs text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{m.location}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{m.collegeName}</p>

                        <div className="mt-3 pt-3 border-t border-slate-900 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Current Paper:</span>
                            <span className="font-mono text-emerald-400 font-black text-sm">
                              {remaining} / {capacity} Sheets
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isEmpty ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>Printed Lifetime:</span>
                            <span className="font-mono text-indigo-300 font-bold">
                              {m.totalSheetsPrintedLifetime || 0} Sheets
                            </span>
                          </div>

                          {m.lastPaperRefillDate && (
                            <div className="text-[10px] text-slate-500">
                              Last refilled:{' '}
                              {new Date(m.lastPaperRefillDate).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRefillMachineId(m.id);
                          setShowRefillModal(true);
                        }}
                        className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        + Load Paper at this Location
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paper Refill History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="font-bold text-base text-white">Paper Refill & Stock History Register</h3>
                <p className="text-xs text-slate-400">
                  कागज कब डाला गया, किस ऑपरेटर ने डाला, कितना पहले था और नया बैलेंस क्या बना
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Refill ID & Time</th>
                      <th className="py-3 px-4">Printer & Exact Location</th>
                      <th className="py-3 px-4 text-center">Sheets Added</th>
                      <th className="py-3 px-4 text-center">Previous ➔ New Balance</th>
                      <th className="py-3 px-4">Operator / Staff</th>
                      <th className="py-3 px-4">Paper Brand / Type</th>
                      <th className="py-3 px-4">Notes & Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {refillLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-indigo-400 font-bold block">{log.id}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(log.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <span className="font-bold text-white block">{log.machineName}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            {log.location}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                            +{log.sheetsAdded} Sheets
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-slate-500">{log.previousSheets}</span>
                          <span className="text-slate-400 mx-1.5">➔</span>
                          <span className="font-bold text-emerald-400">{log.newTotalSheets} Sheets</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {log.operatorName}
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {log.paperBrand}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    {refillLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No paper refill records found. Click "+ Load Paper in Printer" above to log your first ream!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRINT JOBS MONITOR */}
        {activeTab === 'jobs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Print Jobs Spooler Monitor</h2>
                <p className="text-xs text-slate-400">
                  Real-time status, cryptographic payment verification, and duplication protection
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/admin/export-csv"
                  download
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </a>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Job ID, filename, or payment ID..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs">
                {['ALL', 'QUEUED', 'PRINTING', 'COMPLETED', 'FAILED', 'REFUNDED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setJobStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      jobStatusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Job ID</th>
                      <th className="py-3 px-4">Machine</th>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Config</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Order & ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {filteredJobs.map((job) => (
                      <tr key={job.jobId} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {job.jobId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{job.machineId}</td>
                        <td className="py-3.5 px-4 text-white max-w-[200px] truncate">
                          {job.originalFileName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {job.effectivePages} pgs • {job.copies} copy ({job.duplexMode})
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          ₹{job.calculatedAmount || job.amount}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          <span className="block">{job.paymentOrderId}</span>
                          {job.paymentId && (
                            <span className="text-emerald-400 font-semibold">✓ {job.paymentId}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : job.status === 'PRINTING'
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800 animate-pulse'
                                : job.status === 'QUEUED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : job.status === 'REFUNDED'
                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                : job.status === 'FAILED'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                          >
                            Details
                          </button>
                          {job.status === 'FAILED' && (
                            <button
                              onClick={() => handleRefund(job.jobId)}
                              className="px-2 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-300 rounded text-[11px]"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredJobs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No jobs found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WINDOWS 10 AGENT & HARDWARE TERMINAL */}
        {activeTab === 'agent' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white">
                Windows 10 Print Agent & HP LaserJet Hardware
              </h2>
              <p className="text-xs text-slate-400">
                Interactive background agent runner for HP LaserJet Pro MFP M126nw and deployment package
              </p>
            </div>

            {/* Select which machine to simulate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold">Active Kiosk Terminal:</span>
                <select
                  value={selectedMachine?.id || ''}
                  onChange={(e) => {
                    const found = machines.find((m) => m.id === e.target.value);
                    if (found) setSelectedMachine(found);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.name} ({m.printerModel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Live Agent Polling Active (Every 3.0s)
              </div>
            </div>

            {/* Interactive Terminal */}
            {selectedMachine && <VirtualAgentTerminal machine={selectedMachine} onRefreshMachine={fetchAllData} />}

            {/* Windows 10 Deployment Guide & Code Package */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                How to Run on Real Windows 10 Host Computer
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The agent package is pre-configured in the repository folder <code className="text-indigo-400 font-mono">/agent/</code>. Follow these 3 simple steps to connect your physical HP LaserJet Pro MFP M126nw:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-2">1</span>
                  <h4 className="font-bold text-white mb-1">Verify Printer Driver</h4>
                  <p className="text-slate-400">
                    Connect HP M126nw via USB or Wi-Fi. Verify in Windows Settings that the printer name matches <strong className="text-slate-200">"HP LaserJet Pro MFP M126nw"</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-2">2</span>
                  <h4 className="font-bold text-white mb-1">Configure config.json</h4>
                  <p className="text-slate-400">
                    Paste the machine ID (<code className="text-amber-400 font-mono">ATP-XAV-001</code>) and secret token into <code className="text-indigo-400 font-mono">agent/config.json</code>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-2">3</span>
                  <h4 className="font-bold text-white mb-1">Execute run_agent.bat</h4>
                  <p className="text-slate-400">
                    Double-click <code className="text-emerald-400 font-mono">run_agent.bat</code>. It starts the background daemon, establishes heartbeat, and executes automatic prints!
                  </p>
                </div>
              </div>

              {/* Direct File Download Buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download Windows 10 Agent Files:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/agent-package/file/run_agent.bat"
                    download="run_agent.bat"
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    run_agent.bat
                  </a>
                  <a
                    href="/api/agent-package/file/atp_agent.py"
                    download="atp_agent.py"
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    atp_agent.py
                  </a>
                  <a
                    href="/api/agent-package/file/config.json"
                    download="config.json"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    config.json
                  </a>
                  <a
                    href="/api/agent-package/file/README_WINDOWS_AGENT.md"
                    download="README_WINDOWS_AGENT.md"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Setup Guide (.md)
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRICING RULES */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white">College Pricing Configuration</h2>
              <p className="text-xs text-slate-400">
                Configure per-page rates, duplex sheet discounts, and service fees
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                        {rule.id}
                      </span>
                      <h3 className="font-bold text-base text-white mt-2">
                        {rule.collegeId === 'COL-XAV'
                          ? "St. Xavier's College Rules"
                          : 'Delhi Metropolitan University Rules'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditingPricing({ ...rule })}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30"
                    >
                      Edit Rates
                    </button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">B&W Single Side</span>
                      <span className="text-base font-black text-white">
                        ₹{rule.bwSingleSideRate.toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal"> / page</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">B&W Double Side</span>
                      <span className="text-base font-black text-emerald-400">
                        ₹{rule.bwDoubleSideRate.toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal"> / sheet</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Color Single Side</span>
                      <span className="text-base font-black text-white">
                        ₹{rule.colorSingleSideRate.toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal"> / page</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Max Copies Limit</span>
                      <span className="text-base font-black text-slate-200">
                        {rule.maxCopies} copies
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Pricing Modal */}
            {editingPricing && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <h3 className="font-bold text-lg text-white">Edit Pricing Rule ({editingPricing.id})</h3>

                  <form onSubmit={handleSavePricing} className="space-y-4 text-xs">
                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">
                        B&W Single Side Rate (₹/page)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingPricing.bwSingleSideRate}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            bwSingleSideRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">
                        B&W Double Side Rate (₹/sheet)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingPricing.bwDoubleSideRate}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            bwDoubleSideRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-semibold">
                        Max Copies per Job
                      </label>
                      <input
                        type="number"
                        value={editingPricing.maxCopies}
                        onChange={(e) =>
                          setEditingPricing({
                            ...editingPricing,
                            maxCopies: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        required
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPricing(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingPricing}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20"
                      >
                        {savingPricing ? 'Saving...' : 'Save Pricing'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PAYMENT WEBHOOKS & SECURITY */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white">Payment Gateway & Webhook Security</h2>
              <p className="text-xs text-slate-400">
                रेज़रपे पेमेंट गेटवे लिंक करें, लाइव मर्चेंट अकाउंट जोड़ें, और क्रिप्टोग्राफिक वेबहुक ऑडिट देखें
              </p>
            </div>

            {/* Razorpay Gateway Link & Account Credentials Card */}
            <div className="bg-slate-900 border border-indigo-900/60 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg">
                    ₹
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      Link Razorpay Merchant Account (रेज़रपे खाता लिंक करें)
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          rzpEnabled
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        {rzpEnabled ? 'GATEWAY ACTIVE' : 'SANDBOX / NOT CONFIGURED'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      छात्रों द्वारा UPI (GPay/PhonePe/Paytm) से किया गया भुगतान सीधे आपके बैंक खाते में आने के लिए
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Mode:</span>
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      rzpProvider === 'RAZORPAY_LIVE'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-indigo-950 text-indigo-400 border-indigo-800'
                    }`}
                  >
                    {rzpProvider === 'RAZORPAY_LIVE' ? 'LIVE (Real Bank Money)' : 'TEST (Sandbox)'}
                  </span>
                </div>
              </div>

              {/* Form to enter Key ID & Secret */}
              <form onSubmit={handleSaveGateway} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key ID */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      Razorpay Key ID (उदा. rzp_live_... या rzp_test_...)
                    </label>
                    <input
                      type="text"
                      value={rzpKeyId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setRzpKeyId(val);
                        if (val.startsWith('rzp_live')) {
                          setRzpProvider('RAZORPAY_LIVE');
                        } else if (val.startsWith('rzp_test')) {
                          setRzpProvider('RAZORPAY_TEST');
                        }
                      }}
                      placeholder="rzp_live_xxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Razorpay Dashboard ➔ Settings ➔ API Keys से कॉपी करें
                    </span>
                  </div>

                  {/* Key Secret */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        Razorpay Key Secret (सीक्रेट कुंजी)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowKeySecret(!showKeySecret)}
                        className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                      >
                        {showKeySecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showKeySecret ? 'Hide' : 'Show'}
                      </button>
                    </label>
                    <input
                      type={showKeySecret ? 'text' : 'password'}
                      value={rzpKeySecret}
                      onChange={(e) => setRzpKeySecret(e.target.value.trim())}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      सुरक्षा के लिए यह कभी सार्वजनिक नहीं दिखाया जाता
                    </span>
                  </div>
                </div>

                {/* Webhook Secret & Enable Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                      Webhook Secret (HMAC SHA-256 सिग्नेचर सीक्रेट)
                    </label>
                    <input
                      type="text"
                      value={rzpWebhookSec}
                      onChange={(e) => setRzpWebhookSec(e.target.value.trim())}
                      placeholder="atp_whsec_prod_994a821e90"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      यही सीक्रेट Razorpay Dashboard के Webhook Secret में डालें
                    </span>
                  </div>

                  <div className="flex flex-col justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rzpEnabled}
                        onChange={(e) => setRzpEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="font-bold text-white text-xs">
                        Enable Live Razorpay Gateway (छात्रों के लिए रेज़रपे चालू करें)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pl-6">
                      टिक करने पर मोबाइल कियोस्क पर असली पेमेंट गेटवे सक्रिय हो जाएगा।
                    </p>
                  </div>
                </div>

                {/* Test Result Message Banner */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                      testResult.success
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-700 text-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="font-bold block">
                        {testResult.success ? 'सत्यापन सफल (Connection Verified)' : 'कनेक्शन विफल (Connection Error)'}
                      </strong>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}

                {/* Webhook URL Copy Box */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Your Webhook Endpoint URL (इसे Razorpay Dashboard में पेस्ट करें):
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 font-mono text-[11px] text-slate-200">
                    <span className="truncate">{webhookUrl || `${window.location.origin}/api/payments/webhook`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = webhookUrl || `${window.location.origin}/api/payments/webhook`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhookUrl(true);
                        setTimeout(() => setCopiedWebhookUrl(false), 2000);
                      }}
                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedWebhookUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedWebhookUrl ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Razorpay Events to select: <strong>order.paid</strong>, <strong>payment.captured</strong>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={testingRzp || !rzpKeyId || !rzpKeySecret}
                    onClick={handleTestRazorpay}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingRzp ? 'animate-spin' : ''}`} />
                    {testingRzp ? 'Checking Connection...' : 'Test Connection (कनेक्शन चेक करें)'}
                  </button>

                  <button
                    type="submit"
                    disabled={savingRzp}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {savingRzp ? 'Saving...' : 'Save & Link Razorpay (गेटवे सक्रिय करें)'}
                  </button>
                </div>
              </form>
            </div>

            {/* Razorpay KYC Website Addition Guide */}
            <div className="bg-slate-900 border border-indigo-900/40 rounded-3xl p-6 space-y-4 text-xs shadow-xl">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <span>Razorpay में Website कैसे Add करें? (Step-by-Step Guide for KYC Approval)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                जब आप Razorpay पर <strong>Live API Keys</strong> एक्टिवेट करने के लिए अप्लाई करते हैं, तो Razorpay आपसे बिजनेस वेबसाइट पूछता है। आप नीचे दिए गए विवरण दर्ज करें:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 font-semibold block">1. Website URL (वेबसाइट लिंक)</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400">
                    <span className="truncate">{window.location.origin}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        alert('Website URL copied: ' + window.location.origin);
                      }}
                      className="px-2 py-1 bg-indigo-600/30 text-indigo-300 hover:text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Copy URL
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    यही URL Razorpay के "Website / App Details" फॉर्म में डालें।
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 font-semibold block">2. Business Category & Type</span>
                  <div className="space-y-1 text-slate-200 text-[11px]">
                    <div>• <strong>Business Category:</strong> Education ➔ Educational Services (या Services ➔ Printing & Publishing)</div>
                    <div>• <strong>Business Type:</strong> Individual / Proprietorship</div>
                    <div>• <strong>Description:</strong> Self-service automated print kiosk for college students (कॉलेज में छात्रों के लिए ऑटोमैटिक प्रिंटिंग सेवा)</div>
                  </div>
                </div>
              </div>

              {/* Policy Pages Status */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">
                    3. Razorpay Mandatory Policy Pages (4 अनिवार्य पेजेस जो Razorpay चेक करता है):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    ✓ All 4 Pages Live on your Website
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  आपकी वेबसाइट के फुटर में चारों कानूनी पेजेस लाइव जोड़ दिए गए हैं:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-indigo-300">
                    ✓ Contact Us
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-emerald-300">
                    ✓ Refund Policy
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-amber-300">
                    ✓ Privacy Policy
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-blue-300">
                    ✓ Terms of Service
                  </div>
                </div>
              </div>

              {/* Test Mode Note */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                💡 <strong>बिना वेबसाइट अप्रूवल के तुरंत Key कैसे लें (Instant Test Keys):</strong><br />
                यदि आप तुरंत सिस्टम चालू करके टेस्ट करना चाहते हैं, तो Razorpay Dashboard में ऊपर दाईं ओर <strong>"Test Mode"</strong> स्विच ऑन करें। Test Mode में बिना वेबसाइट रिव्यू के सीधे <strong>Settings ➔ API Keys ➔ Generate Key</strong> दबाने पर 1 सेकंड में <code className="bg-amber-900/50 px-1 py-0.5 rounded text-white font-mono">rzp_test_...</code> Key मिल जाती है!
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Active Webhook Secret</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {settings.paymentWebhookSecret}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Gateway Mode</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {settings.paymentGatewayProvider}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Event ID</th>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">HMAC Signature</th>
                      <th className="py-3 px-4">Idempotency</th>
                      <th className="py-3 px-4 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-300">{wh.id}</td>
                        <td className="py-3 px-4 font-mono text-indigo-400">{wh.paymentOrderId}</td>
                        <td className="py-3 px-4 font-mono text-slate-200">{wh.paymentId}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">₹{wh.amount}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              wh.isValidSignature
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {wh.isValidSignature ? 'HMAC-SHA256 VERIFIED' : 'INVALID SIGNATURE'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {wh.idempotentIgnored ? (
                            <span className="text-amber-400 text-[11px] font-semibold">
                              ✓ Ignored Duplicate (Protected)
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">Authorized</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {new Date(wh.receivedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                    {webhooks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          No webhook events recorded yet. Payments made will appear here with cryptographic signatures.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white">System Security & Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Immutable security logs of file uploads, authorizations, hardware completions, and privacy cleanup
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Machine / Job</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-4 text-indigo-400 font-bold">{log.eventType}</td>
                        <td className="py-2.5 px-4 text-amber-300 font-semibold">{log.actor}</td>
                        <td className="py-2.5 px-4 text-slate-300">
                          {log.jobId || log.machineId || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: 16-INCH TOUCH SCREEN MONITOR & DIGITAL SIGNAGE ADVERTISEMENTS */}
        {activeTab === 'ads' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with 16" Launch button & Add Ad button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-amber-400" />
                  16-Inch Touch Screen Monitor & Digital Ads (16" टच स्क्रीन एवं विज्ञापन)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  कियोस्क पर लगे 16 इंच मॉनिटर पर लाइव प्रिंटर स्टेटस, मोबाइल QR कोड और निष्क्रिय रहने पर फुलस्क्रीन विज्ञापन
                </p>
              </div>

              <div className="flex items-center gap-3">
                {onOpen16InchDisplay && (
                  <button
                    onClick={() => onOpen16InchDisplay(selectedMachine ? selectedMachine.id : 'ATP-XAV-001')}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch 16" Display (स्क्रीन चालू करें)</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNewAdModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Ad (नया विज्ञापन जोड़ें)</span>
                </button>
              </div>
            </div>

            {/* 16-Inch Hardware Setup & Screensaver Settings Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                    16"
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Kiosk Display & Idle Screensaver Configuration (स्क्रीन टाइमआउट सेटिंग्स)
                    </h3>
                    <p className="text-xs text-slate-400">
                      छात्रों द्वारा कार्य न करने पर विज्ञापन कितने सेकंड बाद शुरू होगा और क्या संदेश दिखेगा
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveKioskSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Timeout */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Screensaver Idle Timeout (निष्क्रिय समय सीमा)
                    </label>
                    <select
                      value={kioskSettings.screensaverIdleSeconds}
                      onChange={(e) =>
                        setKioskSettings({
                          ...kioskSettings,
                          screensaverIdleSeconds: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                    >
                      <option value={10}>10 Seconds (Very Fast - तुरंत विज्ञापन)</option>
                      <option value={15}>15 Seconds (Recommended)</option>
                      <option value={20}>20 Seconds (Standard)</option>
                      <option value={30}>30 Seconds</option>
                      <option value={60}>60 Seconds (1 Minute)</option>
                      <option value={120}>120 Seconds (2 Minutes)</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      इतनी देर स्क्रीन न छूने पर विज्ञापन चालू हो जाएगा।
                    </span>
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Ad Booking Helpline Phone (विज्ञापन बुकिंग नंबर)
                    </label>
                    <input
                      type="text"
                      value={kioskSettings.adBannerContactPhone}
                      onChange={(e) =>
                        setKioskSettings({
                          ...kioskSettings,
                          adBannerContactPhone: e.target.value,
                        })
                      }
                      placeholder="+91 99999 99999"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      स्क्रीन के निचले हिस्से में विज्ञापन देने हेतु यह नंबर दिखेगा
                    </span>
                  </div>

                  {/* Screensaver Enable Toggle */}
                  <div className="flex flex-col justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kioskSettings.screensaverEnabled}
                        onChange={(e) =>
                          setKioskSettings({
                            ...kioskSettings,
                            screensaverEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span className="font-bold text-white text-xs">
                        Enable Screensaver Ads (विज्ञापन सक्रिय रखें)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pl-6">
                      टिक रहने पर खाली समय में विज्ञापन स्लाइडशो अपने आप चलेगा।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Touch To Wake Prompt Message (स्क्रीन टच संदेश)
                    </label>
                    <input
                      type="text"
                      value={kioskSettings.touchToWakeMessage}
                      onChange={(e) =>
                        setKioskSettings({
                          ...kioskSettings,
                          touchToWakeMessage: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">
                      Ad Space Promotional Banner Line
                    </label>
                    <input
                      type="text"
                      value={kioskSettings.adBannerContactText}
                      onChange={(e) =>
                        setKioskSettings({
                          ...kioskSettings,
                          adBannerContactText: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingKioskSettings}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {savingKioskSettings ? 'Saving Settings...' : 'Save 16" Display Settings (सेव करें)'}
                  </button>
                </div>
              </form>
            </div>

            {/* Advertisements List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Active Advertisement Slides ({advertisements.filter((a) => a.isActive).length}/{advertisements.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    प्रत्येक विज्ञापन स्लाइड 8 सेकंड तक 16 इंच स्क्रीन पर फुलस्क्रीन डिस्प्ले होगी
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advertisements.map((ad, idx) => (
                  <div
                    key={ad.id}
                    className={`border rounded-3xl p-5 shadow-xl transition-all relative overflow-hidden bg-gradient-to-br ${ad.bgGradient || 'from-slate-900 to-indigo-950'} ${
                      ad.isActive ? 'border-indigo-500/40' : 'border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                        {ad.bannerBadge || 'SPONSOR'} • Slide #{idx + 1}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAdActive(ad.id, ad.isActive)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            ad.isActive
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {ad.isActive ? 'Active (चालू)' : 'Paused (रोका गया)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                          title="Delete Advertisement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white leading-snug">{ad.title}</h4>
                    <p className="text-xs text-slate-200 mt-1 line-clamp-2">{ad.tagline}</p>
                    {ad.description && (
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{ad.description}</p>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Advertiser / Shop:</span>
                        <span className="font-semibold text-white">{ad.advertiserName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Contact:</span>
                        <span className="font-mono text-emerald-300 font-bold">{ad.contactPhone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD NEW ADVERTISEMENT */}
      {showNewAdModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-white">Add New Advertisement Slide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAdModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Advertisement Headline (मुख्य शीर्षक) *
                </label>
                <input
                  type="text"
                  required
                  value={newAdTitle}
                  onChange={(e) => setNewAdTitle(e.target.value)}
                  placeholder="उदा: GATE & IES 2027 New Batch Admissions Open!"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Tagline / Special Offer (ऑफर या विवरण)
                </label>
                <input
                  type="text"
                  value={newAdTagline}
                  onChange={(e) => setNewAdTagline(e.target.value)}
                  placeholder="उदा: Special 25% College Discount • Daily Live Doubt Classes"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Advertiser / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdAdvertiser}
                    onChange={(e) => setNewAdAdvertiser(e.target.value)}
                    placeholder="उदा: Apex Academy / Ganesh Xerox"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newAdPhone}
                    onChange={(e) => setNewAdPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Badge Label</label>
                  <select
                    value={newAdBadge}
                    onChange={(e) => setNewAdBadge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SPONSOR PARTNER">SPONSOR PARTNER</option>
                    <option value="CAMPUS UTILITY">CAMPUS UTILITY</option>
                    <option value="STUDENT OFFER">STUDENT OFFER</option>
                    <option value="ADMISSIONS OPEN">ADMISSIONS OPEN</option>
                    <option value="ADVERTISE HERE">ADVERTISE HERE</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Color Theme</label>
                  <select
                    value={newAdGradient}
                    onChange={(e) => setNewAdGradient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="from-blue-950 via-slate-900 to-indigo-950">Electric Blue</option>
                    <option value="from-emerald-950 via-slate-900 to-teal-950">Emerald Green</option>
                    <option value="from-amber-950 via-slate-900 to-rose-950">Amber Gold</option>
                    <option value="from-purple-950 via-slate-900 to-fuchsia-950">Royal Purple</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAdModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAd}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {creatingAd ? 'Saving...' : 'Add to Kiosk Screen (जोड़ें)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Sticker Modal */}
      {stickerMachine && (
        <QrStickerModal machine={stickerMachine} onClose={() => setStickerMachine(null)} />
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Job Details: {selectedJob.jobId}</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">File Name:</span>
                <span className="font-semibold text-white truncate max-w-xs">
                  {selectedJob.originalFileName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Machine Kiosk:</span>
                <span className="font-mono text-indigo-400">{selectedJob.machineId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Page Selection:</span>
                <span className="text-slate-200">
                  {selectedJob.effectivePages} pages ({selectedJob.pageSelection})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Copies & Duplex:</span>
                <span className="text-slate-200">
                  {selectedJob.copies} copy • {selectedJob.duplexMode}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{selectedJob.calculatedAmount || selectedJob.amount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Payment Order ID:</span>
                <span className="font-mono text-slate-300">{selectedJob.paymentOrderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono text-emerald-400">{selectedJob.paymentId || 'None'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold text-indigo-400">{selectedJob.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOAD PAPER IN PRINTER */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Load Paper in Printer</h3>
                  <p className="text-xs text-slate-400">प्रिंटर ट्रे में नया कागज लोड करें और दर्ज करें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePaperRefill} className="space-y-4 text-xs">
              {/* Machine & Location Selector */}
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Select Printer Location (प्रिंटर लोकेशन चुनें)
                </label>
                <select
                  value={refillMachineId}
                  onChange={(e) => setRefillMachineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                  required
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} • {m.name} ({m.location})
                    </option>
                  ))}
                </select>
                {/* Current stock indicator */}
                {(() => {
                  const sel = machines.find((m) => m.id === refillMachineId);
                  return sel ? (
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span>
                        Current Balance:{' '}
                        <strong className="text-emerald-400 font-mono">
                          {sel.paperSheetsRemaining ?? sel.paperSheetsAvailable ?? 490} Sheets
                        </strong>
                      </span>
                      <span>
                        Capacity:{' '}
                        <span className="font-mono text-slate-300">
                          {sel.paperTrayCapacity || 500} Sheets
                        </span>
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Sheets Count & Quick Preset Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Sheets Added (डाले गए पन्नों की संख्या)
                  </label>
                  <span className="font-mono text-emerald-400 font-bold text-xs">
                    +{refillSheets} Sheets
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="2500"
                  value={refillSheets}
                  onChange={(e) => setRefillSheets(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-black text-lg"
                  required
                />
                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[
                    { label: '+100', count: 100 },
                    { label: '+250', count: 250 },
                    { label: '+500 (1 Ream)', count: 500 },
                    { label: '+1000 (2 Reams)', count: 1000 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setRefillSheets(chip.count)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        refillSheets === chip.count
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset or Add Mode */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="trayMode"
                    checked={refillResetTray}
                    onChange={() => setRefillResetTray(true)}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span className="font-semibold text-white">
                    Fresh Load in Empty Tray (खाली ट्रे में नया {refillSheets} लोड)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="trayMode"
                    checked={!refillResetTray}
                    onChange={() => setRefillResetTray(false)}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>
                    Add to Existing Balance (वर्तमान बचे स्टॉक में +{refillSheets} और जोड़ें)
                  </span>
                </label>
              </div>

              {/* Operator Name */}
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Operator / Staff Name (पेपर डालने वाले का नाम)
                </label>
                <input
                  type="text"
                  value={refillOperator}
                  onChange={(e) => setRefillOperator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Domendra Kumar"
                  required
                />
              </div>

              {/* Paper Brand & Details */}
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Paper Brand / Specs (कागज का ब्रांड)
                </label>
                <input
                  type="text"
                  value={refillBrand}
                  onChange={(e) => setRefillBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. JK Copier A4 75 GSM"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Notes / Remarks (रिमार्क)
                </label>
                <input
                  type="text"
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Full 500 Sheet Ream loaded in morning"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefillModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refilling}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {refilling ? 'Saving...' : 'Confirm & Log Refill (स्टॉक दर्ज करें)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
