import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  Pause,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  Download,
  Shield,
  Layers,
  Cpu,
} from 'lucide-react';
import { Machine } from '../types';

interface VirtualAgentTerminalProps {
  machine: Machine;
  onRefreshMachine?: () => void;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'PRINT';
  message: string;
}

export const VirtualAgentTerminal: React.FC<VirtualAgentTerminalProps> = ({
  machine,
  onRefreshMachine,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      type: 'INFO',
      message: `[Windows 10 Spooler] Connected to USB Port USB001 -> ${machine.printerModel}`,
    },
    {
      id: 'init-2',
      time: new Date().toLocaleTimeString(),
      type: 'INFO',
      message: `[ATP-Agent v1.4.2] Machine authenticated with ID ${machine.id}`,
    },
    {
      id: 'init-3',
      time: new Date().toLocaleTimeString(),
      type: 'SUCCESS',
      message: `[Daemon] Polling cloud queue every 3.0s. HP M126nw status: READY`,
    },
  ]);

  const [paperLevel, setPaperLevel] = useState<number>(machine.paperLevelPercent || 90);
  const [tonerLevel, setTonerLevel] = useState<number>(machine.tonerLevelPercent || 85);
  const [simulatePaperJam, setSimulatePaperJam] = useState<boolean>(false);
  const [simulateOutOfPaper, setSimulateOutOfPaper] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<any>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev.slice(-80),
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        type,
        message,
      },
    ]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Main Background Agent Loop (Simulates Python Windows Agent on the actual backend endpoints!)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      // 1. Send Heartbeat to actual backend /api/agent/heartbeat
      try {
        const secretToken = machine.secretToken || 'atp_sec_xav_lib_01_98f4a';
        const status = simulatePaperJam || simulateOutOfPaper ? 'ERROR' : 'ONLINE';

        await fetch('/api/agent/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Machine-Id': machine.id,
            'X-Machine-Token': secretToken,
          },
          body: JSON.stringify({
            status,
            paperLevelPercent: simulateOutOfPaper ? 0 : paperLevel,
            tonerLevelPercent: tonerLevel,
            paperJam: simulatePaperJam,
            outOfPaper: simulateOutOfPaper,
            agentVersion: 'v1.4.2-win10-live',
          }),
        });
      } catch (err: any) {
        addLog('WARN', `Heartbeat ping error: ${err.message}`);
      }

      // If printer is jammed or out of paper, don't pick up jobs!
      if (simulatePaperJam) {
        addLog('ERROR', `[HARDWARE ERROR] Paper Jam in HP LaserJet Pro MFP M126nw pickup roller!`);
        return;
      }
      if (simulateOutOfPaper) {
        addLog('WARN', `[HARDWARE WARNING] HP LaserJet Tray 1 is out of paper. Refill A4 sheets.`);
        return;
      }

      // 2. Poll for queued verified jobs from real backend
      try {
        const secretToken = machine.secretToken || 'atp_sec_xav_lib_01_98f4a';
        const res = await fetch('/api/agent/jobs', {
          headers: {
            'X-Machine-Id': machine.id,
            'X-Machine-Token': secretToken,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.jobs && data.jobs.length > 0 && !activeJob) {
            const nextJob = data.jobs[0];
            setActiveJob(nextJob);
            addLog(
              'INFO',
              `[JOB DETECTED] Fetching verified Job ${nextJob.jobId} ("${nextJob.fileName}", ${nextJob.effectivePages} pages, ${nextJob.copies} copy)`
            );

            // Execute print job workflow
            executePrintJob(nextJob, secretToken);
          }
        }
      } catch (err: any) {
        addLog('WARN', `Job fetch warning: ${err.message}`);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning, machine, paperLevel, tonerLevel, simulatePaperJam, simulateOutOfPaper, activeJob]);

  const executePrintJob = async (job: any, secretToken: string) => {
    try {
      addLog('PRINT', `[SPOOLER] Downloading PDF to Windows %TEMP%\\atp_spool\\...`);
      await new Promise((r) => setTimeout(r, 1200));

      addLog('PRINT', `[WIN32PRINT] Sending to Windows Spooler -> "${machine.printerModel}"`);
      await new Promise((r) => setTimeout(r, 1000));

      // Report PRINTING status
      await fetch(`/api/agent/jobs/${job.jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Machine-Id': machine.id,
          'X-Machine-Token': secretToken,
        },
        body: JSON.stringify({
          status: 'PRINTING',
          currentPrintingPage: 1,
        }),
      });

      // Simulate multi-page printing with step-by-step telemetry
      const totalPages = (job.effectivePages || 1) * (job.copies || 1);
      for (let p = 1; p <= totalPages; p++) {
        await new Promise((r) => setTimeout(r, 1500));
        addLog(
          'PRINT',
          `[HP M126nw Motor] Feeding Sheet ${p}/${totalPages} (${job.duplexMode === 'DOUBLE' ? 'Duplex Roll' : 'Simplex'})`
        );

        // Deduct paper and toner
        setPaperLevel((prev) => Math.max(0, prev - 1));
        setTonerLevel((prev) => Math.max(0, prev - 0.5));

        await fetch(`/api/agent/jobs/${job.jobId}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Machine-Id': machine.id,
            'X-Machine-Token': secretToken,
          },
          body: JSON.stringify({
            status: 'PRINTING',
            currentPrintingPage: p,
          }),
        });
      }

      // Mark COMPLETED
      await fetch(`/api/agent/jobs/${job.jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Machine-Id': machine.id,
          'X-Machine-Token': secretToken,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          currentPrintingPage: totalPages,
        }),
      });

      addLog('SUCCESS', `[PRINT COMPLETED] Job ${job.jobId} finished! Output bin delivery verified.`);
      addLog('INFO', `[PRIVACY CLEANUP] Shredded temp spool file for ${job.jobId}.`);

      setActiveJob(null);
      if (onRefreshMachine) onRefreshMachine();
    } catch (err: any) {
      addLog('ERROR', `Print execution failed: ${err.message}`);
      setActiveJob(null);
    }
  };

  const handleTestPrint = async () => {
    try {
      addLog('INFO', `[MANUAL TRIGGER] Requesting Diagnostic Test Page from server...`);
      const res = await fetch('/api/printer/test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId: machine.id }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog('SUCCESS', `Diagnostic Test Print created (${data.jobId}). Queued for HP M126nw!`);
      } else {
        addLog('ERROR', `Test print error: ${data.error}`);
      }
    } catch (err: any) {
      addLog('ERROR', `Test print request error: ${err.message}`);
    }
  };

  const handleDirectHardwarePrint = () => {
    addLog('PRINT', `[DIRECT SPOOL] Opening Windows Print Spooler for "${machine.printerModel}"...`);
    window.print();
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 text-slate-100 overflow-hidden shadow-2xl">
      {/* Top Windows 10 Host Bar */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white">Windows 10 Pro Kiosk Host</span>
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-700/50">
                ATP-Agent v1.4.2
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Connected: <strong className="text-slate-200">{machine.printerModel}</strong> (Port: USB001)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause Daemon' : 'Start Daemon'}
          </button>

          <button
            onClick={handleTestPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Printer className="w-3.5 h-3.5" />
            Send Test Page
          </button>

          <a
            href="/api/printer/printable-test-page"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              addLog('PRINT', `[DIRECT SPOOL] Opening Standalone A4 Print Window for "${machine.printerModel}"...`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30"
            title="Open printable test sheet in separate tab to print on HP LaserJet Pro MFP M126nw"
          >
            <Printer className="w-3.5 h-3.5" />
            🖨️ Direct Hardware Print (सीधा प्रिंट)
          </a>
        </div>
      </div>

      {/* Hardware Telemetry Bar */}
      <div className="bg-slate-900/90 px-6 py-3 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block mb-1">Paper Tray 1 (A4 Sheets)</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${paperLevel < 20 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${simulateOutOfPaper ? 0 : paperLevel}%` }}
              />
            </div>
            <span className="font-mono text-emerald-400 font-bold text-[11px] whitespace-nowrap">
              {simulateOutOfPaper ? '0 Sheets' : `${Math.round((paperLevel / 100) * (machine.paperTrayCapacity || 500))} / ${machine.paperTrayCapacity || 500} Sheets`}
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Laser Toner (HP 88A)</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${tonerLevel < 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${tonerLevel}%` }}
              />
            </div>
            <span className="font-mono text-slate-300">{tonerLevel}%</span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Hardware Sensor Simulation</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={simulatePaperJam}
                onChange={(e) => setSimulatePaperJam(e.target.checked)}
                className="rounded border-slate-700 text-red-600 focus:ring-0"
              />
              <span className={simulatePaperJam ? 'text-red-400 font-bold' : ''}>Paper Jam</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white ml-2">
              <input
                type="checkbox"
                checked={simulateOutOfPaper}
                onChange={(e) => setSimulateOutOfPaper(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className={simulateOutOfPaper ? 'text-amber-400 font-bold' : ''}>Tray Empty</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setPaperLevel(100);
              setTonerLevel(95);
              setSimulatePaperJam(false);
              setSimulateOutOfPaper(false);
              addLog('SUCCESS', `[MAINTENANCE] Refilled Paper Tray (${machine.paperTrayCapacity || 500} Sheets) and Toner (95%). All faults cleared.`);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            Refill Paper ({machine.paperTrayCapacity || 500} Sheets) & Clear Faults
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="p-4 md:p-6 font-mono text-xs bg-slate-950 h-72 overflow-y-auto space-y-1.5 select-text">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
            {log.type === 'INFO' && <span className="text-blue-400 shrink-0 font-semibold">[INFO]</span>}
            {log.type === 'SUCCESS' && <span className="text-emerald-400 shrink-0 font-semibold">[SUCCESS]</span>}
            {log.type === 'WARN' && <span className="text-amber-400 shrink-0 font-semibold">[WARN]</span>}
            {log.type === 'ERROR' && <span className="text-rose-400 shrink-0 font-semibold">[ERROR]</span>}
            {log.type === 'PRINT' && <span className="text-cyan-300 shrink-0 font-semibold">[SPOOL]</span>}
            <span
              className={
                log.type === 'ERROR'
                  ? 'text-rose-300'
                  : log.type === 'SUCCESS'
                  ? 'text-emerald-200'
                  : log.type === 'PRINT'
                  ? 'text-cyan-100 font-medium'
                  : log.type === 'WARN'
                  ? 'text-amber-200'
                  : 'text-slate-300'
              }
            >
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950/80 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Agent Loop Active • Machine Token Verified • Spooler: Online</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-500">Target: HP LaserJet Pro MFP M126nw</span>
        </div>
      </div>
    </div>
  );
};
