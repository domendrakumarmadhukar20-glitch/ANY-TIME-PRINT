import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Sparkles, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { Machine } from '../types';

interface QrStickerModalProps {
  machine: Machine | null;
  onClose: () => void;
}

export const QrStickerModal: React.FC<QrStickerModalProps> = ({ machine, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    fetch(`/api/machines/${machine.id}/qr`)
      .then((res) => res.json())
      .then((data) => {
        setQrDataUrl(data.qrDataUrl);
        setTargetUrl(data.targetUrl);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load QR code:', err);
        setLoading(false);
      });
  }, [machine]);

  if (!machine) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">ATP Machine QR Sticker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Sticker Preview Container */}
        <div className="p-6 md:p-8 bg-slate-50 flex flex-col items-center">
          <div
            id="printable-kiosk-sticker"
            className="bg-white p-7 rounded-2xl border-4 border-indigo-600 shadow-xl max-w-md w-full text-center relative overflow-hidden"
          >
            {/* Top Accent Ribbon */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-2 px-4 -mx-7 -mt-7 mb-5 shadow-sm">
              <span className="text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                COLLEGE ANY TIME PRINT (ATP) KIOSK
              </span>
            </div>

            {/* College Name & Location */}
            <div className="mb-4">
              <h4 className="text-xl font-black text-slate-900 leading-tight">
                {machine.collegeName || "College Campus"}
              </h4>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mt-0.5">
                {machine.name} • {machine.location}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 inline-block shadow-inner my-2">
              {loading ? (
                <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${machine.id}`}
                  className="w-64 h-64 object-contain mx-auto"
                />
              )}
            </div>

            {/* Machine ID Tag */}
            <div className="mt-3">
              <span className="inline-block bg-slate-900 text-amber-400 font-mono font-bold text-sm px-4 py-1.5 rounded-full shadow-sm">
                MACHINE ID: {machine.id}
              </span>
            </div>

            {/* Step by Step Instructions */}
            <div className="mt-5 grid grid-cols-4 gap-1.5 text-left bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-[11px]">
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-1">1</span>
                <span className="font-semibold text-slate-800">Scan QR</span>
                <span className="text-slate-500 text-[9px]">Mobile Browser</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-1">2</span>
                <span className="font-semibold text-slate-800">Upload PDF</span>
                <span className="text-slate-500 text-[9px]">Select Pages</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-1">3</span>
                <span className="font-semibold text-slate-800">Pay Online</span>
                <span className="text-slate-500 text-[9px]">UPI / Cards</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-1">4</span>
                <span className="font-semibold text-slate-800">Auto Print!</span>
                <span className="text-slate-500 text-[9px]">Collect Below</span>
              </div>
            </div>

            {/* Hardware badge footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                {machine.printerModel}
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Cloud Spooler
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Scan Destination: <span className="font-mono text-indigo-600 font-semibold">{targetUrl}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`ATP_QR_Sticker_${machine.id}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Save Image
              </a>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              Print Sticker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
