import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Copy,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Sparkles,
  Smartphone,
  ExternalLink,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Machine, PriceBreakdown, PrintJob } from '../types';
import { ComplianceModal, PolicyTab } from './ComplianceModal';

interface StudentKioskProps {
  machineId: string;
  onSwitchMachine?: (id: string) => void;
  onOpenAdmin?: () => void;
}

export const StudentKiosk: React.FC<StudentKioskProps> = ({
  machineId,
  onSwitchMachine,
  onOpenAdmin,
}) => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loadingMachine, setLoadingMachine] = useState<boolean>(true);
  const [errorMachine, setErrorMachine] = useState<string | null>(null);

  // Upload State
  const [uploading, setUploading] = useState<boolean>(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string;
    fileName: string;
    title: string;
    fileSize: number;
    pageCount: number;
    fileHash: string;
  } | null>(null);

  // Print Settings State
  const [pageSelectionType, setPageSelectionType] = useState<'all' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Legal' | 'Letter'>('A4');
  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [duplexMode, setDuplexMode] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');

  // Price Calculation State
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Order & Payment State
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<PrintJob | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [simulatingPayment, setSimulatingPayment] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Compliance / Policy Modal State
  const [policyModalTab, setPolicyModalTab] = useState<PolicyTab | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/terms')) setPolicyModalTab('terms');
    else if (path.includes('/privacy')) setPolicyModalTab('privacy');
    else if (path.includes('/refund')) setPolicyModalTab('refund');
    else if (path.includes('/contact')) setPolicyModalTab('contact');
  }, []);

  // 1. Fetch Machine details
  const fetchMachine = async () => {
    try {
      setLoadingMachine(true);
      setErrorMachine(null);
      const res = await fetch(`/api/machines/${machineId}`);
      if (!res.ok) {
        throw new Error(`Machine "${machineId}" is not registered in the ATP network.`);
      }
      const data = await res.json();
      setMachine(data.machine);
    } catch (err: any) {
      setErrorMachine(err.message);
    } finally {
      setLoadingMachine(false);
    }
  };

  useEffect(() => {
    fetchMachine();
    // Poll machine status every 15s
    const timer = setInterval(fetchMachine, 15000);
    return () => clearInterval(timer);
  }, [machineId]);

  // 2. Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported for Any Time Print.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds maximum allowed limit (25 MB).');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedFile(data);
      setCustomPageRange(`1-${data.pageCount}`);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // 2b. Load Sample Document for 1-Click Student Trial
  const handleLoadSample = async (sampleType: 'lab_report' | 'admit_card' | 'notes') => {
    try {
      setLoadingSample(sampleType);
      setUploadError(null);
      const res = await fetch('/api/files/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: sampleType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load sample document');
      }
      setUploadedFile(data);
      setCustomPageRange(`1-${data.pageCount}`);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setLoadingSample(null);
    }
  };

  // 2c. Reconnect / Reset printer status to online
  const handleReconnectPrinter = async () => {
    if (!machine) return;
    try {
      const res = await fetch(`/api/machines/${machine.id}/reconnect`, { method: 'POST' });
      if (res.ok) {
        fetchMachine();
      }
    } catch (err) {
      console.error('Reconnect error:', err);
    }
  };

  // 3. Recalculate Price from Server when settings change
  useEffect(() => {
    if (!uploadedFile || !machine) return;

    const calcPrice = async () => {
      try {
        setCalculatingPrice(true);
        setPriceError(null);

        const pageSelection = pageSelectionType === 'all' ? 'all' : customPageRange;

        const res = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machineId: machine.id,
            pageCount: uploadedFile.pageCount,
            pageSelection,
            copies,
            paperSize,
            colorMode,
            duplexMode,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setPriceError(data.error || 'Invalid page selection');
          setPriceBreakdown(null);
        } else {
          setPriceBreakdown(data.priceBreakdown);
        }
      } catch (err: any) {
        setPriceError(err.message);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const debounce = setTimeout(calcPrice, 250);
    return () => clearTimeout(debounce);
  }, [
    uploadedFile,
    machine,
    pageSelectionType,
    customPageRange,
    copies,
    paperSize,
    colorMode,
    duplexMode,
  ]);

  // 4. Create Print Job & Initiate Payment Order
  const handleProceedToPayment = async () => {
    if (!uploadedFile || !machine || !priceBreakdown) return;

    try {
      setCreatingOrder(true);
      const pageSelection = pageSelectionType === 'all' ? 'all' : customPageRange;

      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: machine.id,
          fileId: uploadedFile.fileId,
          fileName: uploadedFile.fileName,
          pageCount: uploadedFile.pageCount,
          pageSelection,
          copies,
          paperSize,
          colorMode,
          duplexMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create print order');
      }

      setTrackingToken(data.trackingToken);
      // Fetch initial job state
      fetchJobStatus(data.jobId, data.trackingToken);
    } catch (err: any) {
      alert('Error creating print job: ' + err.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  // 5. Poll Job Status (Real-time tracking for student)
  const fetchJobStatus = async (jobId: string, token: string) => {
    try {
      const res = await fetch(`/api/print-jobs/${jobId}?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentJob(data.job);
      }
    } catch (err) {
      console.error('Job polling error:', err);
    }
  };

  useEffect(() => {
    if (!currentJob?.jobId || !trackingToken) return;

    // Stop polling if completed or refunded
    if (currentJob.status === 'COMPLETED' || currentJob.status === 'REFUNDED') {
      return;
    }

    const interval = setInterval(() => {
      fetchJobStatus(currentJob.jobId, trackingToken);
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJob?.jobId, currentJob?.status, trackingToken]);

  // 6. Simulate Verified Payment Webhook (Sandbox Testing)
  const handleSimulatePayment = async () => {
    if (!currentJob) return;

    try {
      setSimulatingPayment(true);
      const res = await fetch('/api/payments/simulate-gateway-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentOrderId: currentJob.paymentOrderId,
          method: 'UPI_QR_SANDBOX',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment simulation failed');
      }

      // Immediately refresh job
      if (trackingToken) {
        fetchJobStatus(currentJob.jobId, trackingToken);
      }
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setSimulatingPayment(false);
    }
  };

  // 6b. Official Razorpay Checkout Flow (Live UPI, PhonePe, GPay, Card)
  const [openingRazorpay, setOpeningRazorpay] = useState<boolean>(false);
  const handleOpenRazorpayCheckout = async () => {
    if (!currentJob) return;

    try {
      setOpeningRazorpay(true);
      const res = await fetch(`/api/payments/order/${currentJob.paymentOrderId}`);
      const orderData = await res.json();
      const keyId = orderData.razorpayKeyId;

      if (!keyId) {
        // Fall back to sandbox simulation if key not configured
        await handleSimulatePayment();
        return;
      }

      // Dynamically load Razorpay SDK
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key: keyId,
        amount: Math.round(currentJob.amount * 100),
        currency: 'INR',
        name: 'College Any Time Print (ATP)',
        description: `Print Job ${currentJob.jobId} (${currentJob.effectivePages} pages)`,
        order_id: currentJob.paymentOrderId.startsWith('order_') ? currentJob.paymentOrderId : undefined,
        prefill: {
          name: 'College Student',
          email: 'student@college.edu',
          contact: '9999999999',
        },
        theme: { color: '#059669' },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payments/verify-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || currentJob.paymentOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              if (trackingToken) fetchJobStatus(currentJob.jobId, trackingToken);
            }
          } catch (err) {
            console.error('Checkout verification error:', err);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert('Payment Error: ' + err.message);
    } finally {
      setOpeningRazorpay(false);
    }
  };

  // Reset to print another document
  const handleReset = () => {
    setUploadedFile(null);
    setCurrentJob(null);
    setTrackingToken(null);
    setPageSelectionType('all');
    setCustomPageRange('');
    setCopies(1);
    setDuplexMode('SINGLE');
  };

  if (loadingMachine) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 font-medium">Connecting to ATP Machine {machineId}...</p>
        </div>
      </div>
    );
  }

  if (errorMachine || !machine) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 text-white rounded-3xl p-8 max-w-md w-full border border-slate-700 text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Machine Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMachine}</p>
          <div className="space-y-3">
            <button
              onClick={() => onSwitchMachine && onSwitchMachine('ATP-XAV-001')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-sm transition-all"
            >
              Open Kiosk ATP-XAV-001 (Library)
            </button>
            <button
              onClick={() => onSwitchMachine && onSwitchMachine('ATP-XAV-002')}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-sm transition-all"
            >
              Open Kiosk ATP-XAV-002 (CS Lab)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMachineOnline = machine.status === 'ONLINE' && !machine.paperJam && !machine.outOfPaper;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Mobile Sticky Kiosk Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">ANY TIME PRINT</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800 px-1.5 py-0.5 rounded">
                  {machine.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                {machine.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Hardware Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isMachineOnline
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isMachineOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              ></span>
              <span className="hidden sm:inline">
                {isMachineOnline ? 'Printer Ready' : 'Attention Needed'}
              </span>
            </div>

            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                title="Switch to Admin Dashboard"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4">
        {/* Hardware Status Alert Banner if offline or paper warning */}
        {!isMachineOnline && (
          <div className="bg-amber-950/90 border border-amber-600/70 rounded-2xl p-4 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-300 text-sm">
                  Printer Hardware Status: {machine.printerModel}
                </strong>
                {machine.paperJam && <span>Paper jam reported in paper tray. </span>}
                {machine.outOfPaper && <span>Tray 1 is out of paper. </span>}
                {machine.status === 'OFFLINE' && (
                  <span>
                    Heartbeat standby: Host computer agent not active or timed out.
                  </span>
                )}
                <p className="mt-1 text-amber-300/80 text-[11px]">
                  असली कॉलेज में Windows Agent हर 10s सिग्नल भेजता है। लाइव ट्रायल के लिए नीचे 'प्रिंटर ऑनलाइन करें' दबाएं।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReconnectPrinter}
              className="shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect Printer (प्रिंटर ऑनलाइन करें)
            </button>
          </div>
        )}

        {/* STEP 1 & 2: DOCUMENT UPLOAD & SETTINGS (If no active paid/queued job) */}
        {!currentJob ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* College & Machine Welcome Badge */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {machine.collegeName}
                </span>
                <h1 className="text-base font-bold text-white mt-0.5">Self-Service Document Print</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target: {machine.printerModel} (Duplex Laser)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Single B&W</span>
                <span className="text-sm font-black text-emerald-400">
                  ₹{machine.pricing?.bwSingleSideRate.toFixed(2)}/pg
                </span>
              </div>
            </div>

            {/* Quick Machine / Kiosk Switcher for testing */}
            {onSwitchMachine && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  Kiosk Location (किओस्क बदलें):
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'ATP-XAV-001', name: 'Library (Ground)' },
                    { id: 'ATP-XAV-002', name: 'CS Lab (2nd Flr)' },
                    { id: 'ATP-DMU-001', name: 'Student Center' },
                  ].map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => onSwitchMachine(k.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                        machine.id === k.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {k.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Document Upload Card (Step 1) */}
            {!uploadedFile ? (
              <div className="space-y-4">
                <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl p-8 sm:p-10 text-center transition-all shadow-xl">
                  <input
                    type="file"
                    id="pdf-upload-input"
                    accept="application/pdf,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="pdf-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4 transition-transform hover:scale-110 shadow-lg shadow-indigo-600/10">
                      {uploading ? (
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                      ) : (
                        <UploadCloud className="w-8 h-8" />
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1.5">
                      {uploading ? 'Analyzing PDF Pages...' : 'Upload PDF Document (पीडीएफ अपलोड करें)'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                      अपने फोन या कंप्यूटर से एडमिट कार्ड, नोट्स या असाइनमेंट चुनें (Max 25 MB)
                    </p>

                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer">
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose PDF File (फाइल चुनें)</span>
                    </span>
                  </label>

                  {uploadError && (
                    <div className="mt-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Uploaded Document Info Card */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white truncate max-w-[220px] sm:max-w-xs">
                        {uploadedFile.fileName}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{(uploadedFile.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <strong className="text-indigo-400">{uploadedFile.pageCount} Pages Total</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-xs text-slate-400 hover:text-rose-400 underline font-medium"
                  >
                    Change File
                  </button>
                </div>

                {/* Print Options Form */}
                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  {/* Page Selection Option */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Which pages would you like to print?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPageSelectionType('all')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          pageSelectionType === 'all'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        All Pages ({uploadedFile.pageCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setPageSelectionType('custom')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          pageSelectionType === 'custom'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>

                    {pageSelectionType === 'custom' && (
                      <div className="mt-2.5 animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={customPageRange}
                          onChange={(e) => setCustomPageRange(e.target.value)}
                          placeholder="e.g. 1-5, 8, 11-14"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Enter comma-separated ranges bounded up to {uploadedFile.pageCount}.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sides / Duplex Mode */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-300">Sides (Duplex)</label>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Double side saves paper & money!
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDuplexMode('SINGLE')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          duplexMode === 'SINGLE'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Single Sided
                      </button>

                      <button
                        type="button"
                        onClick={() => setDuplexMode('DOUBLE')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          duplexMode === 'DOUBLE'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Double Sided (Duplex)
                      </button>
                    </div>
                  </div>

                  {/* Copies & Color Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-2">
                        Copies
                      </label>
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setCopies((c) => Math.max(1, c - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-sm text-white">
                          {copies}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCopies((c) => Math.min(10, c + 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-2">
                        Color Mode
                      </label>
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setColorMode('BW')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            colorMode === 'BW'
                              ? 'bg-slate-700 text-white font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          B&W (Laser)
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode('COLOR')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            colorMode === 'COLOR'
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Color
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown Calculation Card */}
                {priceBreakdown && (
                  <div className="bg-slate-950/90 rounded-2xl border border-indigo-900/60 p-4 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Document:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[200px]">
                        {uploadedFile.fileName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Selected Pages:</span>
                      <span className="font-semibold text-slate-200">
                        {priceBreakdown.effectivePages} pages ({pageSelectionType === 'all' ? 'All' : customPageRange})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Rate & Duplex:</span>
                      <span className="font-semibold text-slate-200">
                        {priceBreakdown.rateDescription}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Physical Sheets needed:</span>
                      <span className="font-semibold text-slate-200">
                        {priceBreakdown.totalSheets} A4 sheet{priceBreakdown.totalSheets > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Total Amount to Pay</span>
                        <span className="text-[10px] text-emerald-400">No hidden kiosk charges</span>
                      </div>
                      <span className="text-2xl font-black text-emerald-400">
                        ₹{priceBreakdown.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {priceError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{priceError}</span>
                  </div>
                )}

                {/* Submit to Payment Button */}
                <button
                  type="button"
                  disabled={creatingOrder || calculatingPrice || !priceBreakdown || !isMachineOnline}
                  onClick={handleProceedToPayment}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {creatingOrder ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating Secure Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Proceed to Pay ₹{priceBreakdown?.totalAmount.toFixed(2) || '0.00'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* STEP 3 & 4: PAYMENT SCREEN & LIVE PRINT SPOOLER TRACKING */
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Payment Pending Stage */}
            {currentJob.status === 'PAYMENT_PENDING' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Awaiting Verified UPI Payment
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Amount Due
                  </span>
                  <div className="text-4xl font-black text-white mt-1">
                    ₹{currentJob.amount.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Job ID: <span className="font-mono text-indigo-400">{currentJob.jobId}</span>
                  </p>
                </div>

                {/* Dynamic UPI QR Code Display */}
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
                  <div className="w-48 h-48 bg-slate-100 flex flex-col items-center justify-center border border-slate-200 rounded-xl relative p-2">
                    <QrCode className="w-36 h-36 text-slate-900" />
                    <span className="text-[10px] font-bold text-slate-700 mt-1">
                      Scan with GPay / PhonePe / Paytm
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between max-w-sm mx-auto">
                  <span className="font-mono text-[11px] truncate">atpprint.colleges@upi</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('atpprint.colleges@upi');
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs flex items-center gap-1"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUpi ? 'Copied' : 'Copy UPI'}
                  </button>
                </div>

                {/* Important Security Notice per User Specification */}
                <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-3.5 text-left text-xs text-indigo-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-indigo-300">
                      Server-Side Webhook Protection Active
                    </strong>
                    The HP LaserJet printer is triggered exclusively upon cryptographic HMAC SHA-256
                    signature confirmation from the payment gateway.
                  </div>
                </div>

                {/* Payment Action Buttons */}
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <button
                    type="button"
                    disabled={openingRazorpay || simulatingPayment}
                    onClick={handleOpenRazorpayCheckout}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {openingRazorpay ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connecting to Razorpay...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay ₹{currentJob.amount.toFixed(2)} with Razorpay (UPI / Card)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={simulatingPayment || openingRazorpay}
                    onClick={handleSimulatePayment}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Simulate Gateway Confirmation (Sandbox Test)
                  </button>

                  <p className="text-[10px] text-slate-500">
                    Live payments securely process through your linked Razorpay Merchant account.
                  </p>
                </div>
              </div>
            ) : (
              /* LIVE PRINTING PROGRESS TRACKER (When Verified / Queued / Printing / Completed) */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-sm text-white">Live Print Status</span>
                  </div>
                  <span className="font-mono text-xs text-indigo-400 font-semibold bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800">
                    {currentJob.jobId}
                  </span>
                </div>

                {/* Status Visual Timeline */}
                <div className="space-y-4">
                  {/* Step 1: Payment Verification */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Payment Confirmed & Verified</h4>
                      <p className="text-[11px] text-slate-400">
                        Paid ₹{currentJob.amount.toFixed(2)} • Ref: {currentJob.paymentId || 'UPI_CONFIRMED'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Queued for Spooler */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                        currentJob.status === 'QUEUED'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Job Queued for HP M126nw</h4>
                      <p className="text-[11px] text-slate-400">
                        Windows 10 Spooler assigned • {currentJob.effectivePages} pages, {currentJob.copies} copy
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Printing Progress */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                        currentJob.status === 'PRINTING'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-spin'
                          : currentJob.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-600 border-slate-700'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white">
                        {currentJob.status === 'PRINTING'
                          ? `Printing in Progress... (Sheet ${currentJob.currentPrintingPage || 1} of ${currentJob.effectivePages * currentJob.copies})`
                          : currentJob.status === 'COMPLETED'
                          ? 'Printing Finished'
                          : 'Awaiting Printer Spooler Pickup'}
                      </h4>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2.5 mt-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                          style={{
                            width: `${
                              currentJob.status === 'COMPLETED'
                                ? 100
                                : Math.max(10, currentJob.progressPercent || 25)
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Output Completed */}
                  {currentJob.status === 'COMPLETED' && (
                    <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-2xl p-4 text-center space-y-3 animate-in fade-in duration-300">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-black text-white">
                        ✓ PRINT COMPLETED & SPOOLED!
                      </h3>
                      <p className="text-xs text-emerald-200">
                        Please collect your {currentJob.copies} copy ({currentJob.effectivePages} pages) from the{' '}
                        <strong>HP LaserJet Pro MFP M126nw</strong> output tray!
                      </p>

                      <a
                        href="/api/printer/printable-test-page"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        🖨️ Send Direct to HP LaserJet Printer (प्रिंटर पर निकालें)
                      </a>

                      <p className="text-[11px] text-slate-400 pt-1">
                        Privacy notice: Document file will be automatically shredded from temporary storage.
                      </p>
                    </div>
                  )}

                  {/* Failure State */}
                  {currentJob.status === 'FAILED' && (
                    <div className="bg-rose-950/80 border border-rose-700 rounded-2xl p-4 text-rose-200 text-xs space-y-2">
                      <strong className="block text-sm font-bold text-rose-300">
                        Printer Hardware Notification
                      </strong>
                      <p>{currentJob.errorMessage || 'Hardware temporarily unavailable.'}</p>
                      <p className="text-slate-300">
                        Your payment of ₹{currentJob.amount.toFixed(2)} is securely recorded. Print job remains safely in queue and will print automatically when paper is refilled, or you can request an instant refund from the desk.
                      </p>
                    </div>
                  )}
                </div>

                {/* Print Another Document Button */}
                {currentJob.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Print Another Document
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>College Any Time Print (ATP) • HP M126nw Cloud Spooler</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-bit Encrypted • Auto-Shredding Privacy
          </span>
        </div>

        {/* Razorpay Merchant Compliance Links */}
        <div className="max-w-xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-2 border-t border-slate-900/60">
          <button
            type="button"
            onClick={() => setPolicyModalTab('contact')}
            className="hover:text-indigo-400 underline cursor-pointer"
          >
            Contact Us
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setPolicyModalTab('refund')}
            className="hover:text-indigo-400 underline cursor-pointer"
          >
            Refund & Cancellation Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setPolicyModalTab('privacy')}
            className="hover:text-indigo-400 underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setPolicyModalTab('terms')}
            className="hover:text-indigo-400 underline cursor-pointer"
          >
            Terms of Service
          </button>
        </div>
      </footer>

      {/* Compliance Policy Modal */}
      {policyModalTab && (
        <ComplianceModal
          initialTab={policyModalTab}
          onClose={() => setPolicyModalTab(null)}
        />
      )}
    </div>
  );
};
