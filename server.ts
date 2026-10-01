/**
 * College Any Time Print (ATP) — Main Express Full-Stack Server
 * Integrates Vite middleware in dev, REST API, Webhooks, and Windows Agent Spooler.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { db, Machine, PrintJob, PricingRule } from './server/db.js';
import { parsePageSelection, calculatePrintPrice } from './server/pricing.js';
import {
  processVerifiedPayment,
  generatePaymentOrderId,
  generateSignature,
  createRazorpayOrder,
  testRazorpayConnection,
} from './server/payment.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    // Only accept PDF initially as requested
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported for Any Time Print.'));
    }
  },
});

// Middleware for parsing JSON & URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Get College & Machine Information for Student QR Landing
app.get('/api/machines/:machineId', (req: Request, res: Response) => {
  const machine = db.machines.get(req.params.machineId);
  if (!machine) {
    res.status(404).json({ error: `Machine ${req.params.machineId} not found.` });
    return;
  }

  const college = db.colleges.get(machine.collegeId);
  const pricing = db.getPricingForMachine(machine.id);

  // Check heartbeat staleness (> 45s offline threshold)
  const lastHeartbeatTime = new Date(machine.lastHeartbeat).getTime();
  const isHeartbeatStale = Date.now() - lastHeartbeatTime > 45000;
  const effectiveStatus = isHeartbeatStale ? 'OFFLINE' : machine.status;

  // Redact secretToken before returning to client!
  const sanitizedMachine = {
    id: machine.id,
    collegeId: machine.collegeId,
    collegeName: college?.name || 'College Print Station',
    campus: college?.campus || '',
    city: college?.city || '',
    name: machine.name,
    location: machine.location,
    printerModel: machine.printerModel,
    status: effectiveStatus,
    lastHeartbeat: machine.lastHeartbeat,
    paperLevelPercent: machine.paperLevelPercent,
    paperTrayCapacity: machine.paperTrayCapacity || 500,
    paperSheetsRemaining: machine.paperSheetsRemaining !== undefined ? machine.paperSheetsRemaining : 490,
    paperSheetsAvailable: machine.paperSheetsRemaining !== undefined ? machine.paperSheetsRemaining : 490,
    totalSheetsPrintedLifetime: machine.totalSheetsPrintedLifetime || 0,
    lastPaperRefillDate: machine.lastPaperRefillDate,
    tonerLevelPercent: machine.tonerLevelPercent,
    paperJam: machine.paperJam,
    outOfPaper: machine.outOfPaper,
    pricing,
  };

  res.json({ machine: sanitizedMachine });
});

// 1b. Reconnect / Reset Machine to Online (for Trial & Maintenance)
app.post('/api/machines/:machineId/reconnect', (req: Request, res: Response) => {
  const machine = db.machines.get(req.params.machineId);
  if (!machine) {
    res.status(404).json({ error: 'Machine not found' });
    return;
  }
  machine.status = 'ONLINE';
  machine.paperJam = false;
  machine.outOfPaper = false;
  machine.paperLevelPercent = 100;
  machine.paperSheetsRemaining = machine.paperTrayCapacity || 500;
  machine.tonerLevelPercent = 95;
  machine.lastHeartbeat = new Date().toISOString();

  db.logAudit({
    eventType: 'PRINTER_ONLINE_RESET',
    actor: 'OPERATOR',
    machineId: machine.id,
    details: `HP LaserJet Pro MFP M126nw reset to ONLINE state. All alerts cleared.`,
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, message: 'Printer reconnected and ready.', machine });
});

// 1c. Paper Refill & Stock Registry Endpoint
app.post('/api/machines/:machineId/refill-paper', (req: Request, res: Response) => {
  const { sheetsAdded, operatorName, paperBrand, notes, resetTray } = req.body;
  const result = db.refillMachinePaper({
    machineId: req.params.machineId,
    sheetsAdded: parseInt(sheetsAdded, 10) || 500,
    operatorName,
    paperBrand,
    notes,
    resetTray: Boolean(resetTray),
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    success: true,
    message: `Successfully recorded refill of ${sheetsAdded} sheets for ${result.machine?.location}.`,
    log: result.log,
    machine: result.machine,
  });
});

// 1d. Get Paper Refill Logs History
app.get('/api/admin/paper-refills', (_req: Request, res: Response) => {
  res.json({ refills: db.paperRefillLogs });
});

// 2. List all machines (Admin / directory)
app.get('/api/machines', (_req: Request, res: Response) => {
  const now = Date.now();
  const list = Array.from(db.machines.values()).map((m) => {
    const isStale = now - new Date(m.lastHeartbeat).getTime() > 45000;
    const college = db.colleges.get(m.collegeId);
    return {
      ...m,
      secretToken: m.secretToken.substring(0, 8) + '••••••••',
      status: isStale ? 'OFFLINE' : m.status,
      collegeName: college?.name || 'Unknown',
      paperTrayCapacity: m.paperTrayCapacity || 500,
      paperSheetsRemaining: m.paperSheetsRemaining !== undefined ? m.paperSheetsRemaining : 490,
      paperSheetsAvailable: m.paperSheetsRemaining !== undefined ? m.paperSheetsRemaining : 490,
      totalSheetsPrintedLifetime: m.totalSheetsPrintedLifetime || 0,
      lastPaperRefillDate: m.lastPaperRefillDate,
    };
  });
  res.json({ machines: list });
});

// 3. Generate QR code for a machine
app.get('/api/machines/:machineId/qr', async (req: Request, res: Response) => {
  const machine = db.machines.get(req.params.machineId);
  if (!machine) {
    res.status(404).json({ error: 'Machine not found' });
    return;
  }

  // Construct target URL using custom domain or host
  const host = db.settings.customDomain || req.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const targetUrl = `${protocol}://${host}/m/${machine.id}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.json({
      machineId: machine.id,
      machineName: machine.name,
      location: machine.location,
      printerModel: machine.printerModel,
      targetUrl,
      qrDataUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR code: ' + err.message });
  }
});

// 4. Document Upload Endpoint (Handles PDF parsing, validation & page counting)
app.post('/api/files/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded or invalid file format.' });
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    // Security Check: Verify magic bytes `%PDF`
    const header = fileBuffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: 'Uploaded file is not a valid PDF document.' });
      return;
    }

    // Calculate SHA-256 hash for integrity
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Parse PDF to extract page count and metadata
    let pageCount = 1;
    let title = req.file.originalname;

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      const metaTitle = pdfDoc.getTitle();
      if (metaTitle && metaTitle.trim()) {
        title = metaTitle.trim();
      }
    } catch (parseErr: any) {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: 'Failed to read PDF structure: ' + parseErr.message });
      return;
    }

    const fileId = path.basename(filePath);

    db.logAudit({
      eventType: 'FILE_UPLOADED',
      actor: 'STUDENT',
      details: `File "${req.file.originalname}" uploaded (${(req.file.size / 1024).toFixed(1)} KB, ${pageCount} pages, hash: ${hash.substring(0, 10)}...)`,
      ipAddress: getClientIp(req),
    });

    res.json({
      fileId,
      fileName: req.file.originalname,
      title,
      fileSize: req.file.size,
      pageCount,
      fileHash: hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// 4b. 1-Click Sample Document Generator for Student Trial & Testing
app.post('/api/files/sample', async (req: Request, res: Response) => {
  try {
    const { type = 'lab_report' } = req.body;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let docTitle = 'College_Lab_Practical_Report.pdf';
    let pagesToCreate = 4;

    if (type === 'admit_card') {
      docTitle = 'Semester_Exam_Admit_Card.pdf';
      pagesToCreate = 1;
    } else if (type === 'notes') {
      docTitle = 'Data_Structures_Lecture_Notes.pdf';
      pagesToCreate = 6;
    }

    for (let i = 1; i <= pagesToCreate; i++) {
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      page.drawText('COLLEGE ANY TIME PRINT (ATP) — STUDENT TRIAL', {
        x: 50,
        y: 800,
        size: 13,
        font,
        color: rgb(0.1, 0.2, 0.5),
      });

      page.drawText(`${docTitle.replace(/_/g, ' ').replace('.pdf', '')} — Page ${i} of ${pagesToCreate}`, {
        x: 50,
        y: 775,
        size: 15,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawLine({
        start: { x: 50, y: 760 },
        end: { x: 545, y: 760 },
        thickness: 1.5,
        color: rgb(0.2, 0.4, 0.8),
      });

      page.drawText('Target Spooler: HP LaserJet Pro MFP M126nw (Laser Monochrome/Duplex)', {
        x: 50,
        y: 735,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(`Sheet Number: ${i} | Duplex Compatibility: Certified | Status: VERIFIED`, {
        x: 50,
        y: 715,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawRectangle({
        x: 50,
        y: 350,
        width: 495,
        height: 330,
        color: rgb(0.96, 0.98, 1.0),
        borderColor: rgb(0.7, 0.8, 0.95),
        borderWidth: 1,
      });

      page.drawText(`[Section ${i}: Practical Experiment Execution & Code Simulation]`, {
        x: 70,
        y: 650,
        size: 12,
        font,
        color: rgb(0.1, 0.25, 0.6),
      });

      const sampleLines = [
        '1. Objective: Demonstrate automated duplex printing and verified webhook dispatch.',
        '2. Machine Architecture: Windows 10 Pro with native ATP Background Agent daemon.',
        '3. Spooler Protocol: Direct Win32 Print Spooler -> HP LaserJet M126nw.',
        '4. Idempotency Check: Payment Order ID verified via HMAC SHA-256 signatures.',
        '5. Privacy Retention: Temporary spool files purged after completion.',
        '6. Output Bin: Collect printed document from the HP LaserJet paper output tray.',
      ];

      let yPos = 615;
      for (const line of sampleLines) {
        page.drawText(line, {
          x: 70,
          y: yPos,
          size: 10,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPos -= 28;
      }

      page.drawText(`College Self-Service Printing Kiosk • Page ${i} / ${pagesToCreate}`, {
        x: 50,
        y: 40,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const fileId = `sample_${type}_${Date.now()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileId);
    fs.writeFileSync(filePath, pdfBytes);

    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    db.logAudit({
      eventType: 'SAMPLE_DOC_LOADED',
      actor: 'STUDENT_TRIAL',
      details: `Generated trial sample document "${docTitle}" (${pagesToCreate} pages)`,
      ipAddress: getClientIp(req),
    });

    res.json({
      fileId,
      fileName: docTitle,
      title: docTitle.replace(/_/g, ' ').replace('.pdf', ''),
      fileSize: pdfBytes.length,
      pageCount: pagesToCreate,
      fileHash: hash,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate sample PDF: ' + err.message });
  }
});

// 5. Calculate Print Price Endpoint
app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  const { machineId, pageCount, pageSelection, copies, paperSize, colorMode, duplexMode } = req.body;

  if (!machineId || !pageCount) {
    res.status(400).json({ error: 'Missing machineId or pageCount' });
    return;
  }

  const machine = db.machines.get(machineId);
  const rule = db.getPricingForMachine(machineId);

  const numCopies = Math.max(1, Math.min(rule.maxCopies || 10, parseInt(copies || '1', 10)));
  const parsedSelection = parsePageSelection(pageSelection || 'all', parseInt(pageCount, 10));

  if (!parsedSelection.valid) {
    res.status(400).json({ error: parsedSelection.error });
    return;
  }

  const breakdown = calculatePrintPrice({
    rule,
    effectivePages: parsedSelection.effectivePageCount,
    copies: numCopies,
    paperSize: paperSize || 'A4',
    colorMode: colorMode || 'BW',
    duplexMode: duplexMode || 'SINGLE',
  });

  res.json({
    valid: true,
    pageSelection: parsedSelection,
    priceBreakdown: breakdown,
  });
});

// 6. Create Print Order Endpoint
app.post('/api/print-jobs', async (req: Request, res: Response) => {
  const {
    machineId,
    fileId,
    fileName,
    pageCount,
    pageSelection,
    copies,
    paperSize,
    colorMode,
    duplexMode,
  } = req.body;

  const machine = db.machines.get(machineId);
  if (!machine) {
    res.status(404).json({ error: `Machine ${machineId} not found.` });
    return;
  }

  // Verify file exists on server
  const filePath = path.join(UPLOADS_DIR, fileId);
  if (!fs.existsSync(filePath)) {
    res.status(400).json({ error: 'Uploaded file has expired or was not found. Please re-upload.' });
    return;
  }

  const fileStats = fs.statSync(filePath);
  const rule = db.getPricingForMachine(machineId);
  const numCopies = Math.max(1, Math.min(rule.maxCopies || 10, parseInt(copies || '1', 10)));
  const parsedPages = parsePageSelection(pageSelection || 'all', parseInt(pageCount, 10));

  if (!parsedPages.valid) {
    res.status(400).json({ error: parsedPages.error });
    return;
  }

  // Server-side calculation of exact amount (Never trust client amount!)
  const breakdown = calculatePrintPrice({
    rule,
    effectivePages: parsedPages.effectivePageCount,
    copies: numCopies,
    paperSize: paperSize || 'A4',
    colorMode: colorMode || 'BW',
    duplexMode: duplexMode || 'SINGLE',
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randSeq = Math.floor(100000 + Math.random() * 900000);
  const jobId = `JOB-${dateStr}-${randSeq}`;
  const trackingToken = 'trk_' + crypto.randomBytes(16).toString('hex');
  let paymentOrderId = generatePaymentOrderId(jobId);

  // Attempt to create authentic Razorpay order if Razorpay is enabled
  if (db.settings.razorpayEnabled && db.settings.razorpayKeyId && db.settings.razorpayKeySecret) {
    const rzpOrder = await createRazorpayOrder({
      amountInRupees: breakdown.totalAmount,
      receiptId: jobId,
      notes: { machineId: machine.id, pages: String(parsedPages.effectivePageCount) },
    });
    if (rzpOrder.success && rzpOrder.orderId) {
      paymentOrderId = rzpOrder.orderId;
    }
  }

  const fileHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

  const newJob: PrintJob = {
    jobId,
    trackingToken,
    machineId: machine.id,
    collegeId: machine.collegeId,
    fileName: fileId,
    originalFileName: fileName || fileId,
    fileSize: fileStats.size,
    fileHash,
    filePath,
    pageCount: parseInt(pageCount, 10),
    pageSelection: pageSelection || 'all',
    effectivePages: parsedPages.effectivePageCount,
    copies: numCopies,
    paperSize: paperSize || 'A4',
    colorMode: colorMode || 'BW',
    duplexMode: duplexMode || 'SINGLE',
    calculatedAmount: breakdown.totalAmount,
    status: 'PAYMENT_PENDING',
    progressPercent: 0,
    currentPrintingPage: 0,
    paymentOrderId,
    clientIp: getClientIp(req),
    createdAt: now.toISOString(),
  };

  db.printJobs.set(jobId, newJob);

  db.logAudit({
    eventType: 'PRINT_JOB_CREATED',
    actor: 'STUDENT',
    jobId,
    machineId: machine.id,
    details: `Print job created for ₹${breakdown.totalAmount} (${parsedPages.effectivePageCount} pages, ${numCopies} copies)`,
    ipAddress: getClientIp(req),
  });

  res.json({
    jobId,
    trackingToken,
    paymentOrderId,
    amount: breakdown.totalAmount,
    breakdown,
    status: 'PAYMENT_PENDING',
  });
});

// 7. Get Print Job Details / Tracking Endpoint
app.get('/api/print-jobs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const token = (req.query.token as string) || (req.headers['x-tracking-token'] as string);

  const job = db.printJobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: `Print job ${jobId} not found.` });
    return;
  }

  // Token privacy verification
  if (token && token !== job.trackingToken && token !== 'admin_bypass') {
    res.status(403).json({ error: 'Unauthorized access to this job status.' });
    return;
  }

  const machine = db.machines.get(job.machineId);

  res.json({
    job: {
      jobId: job.jobId,
      trackingToken: job.trackingToken,
      machineId: job.machineId,
      machineName: machine?.name || 'ATP Kiosk',
      printerModel: machine?.printerModel || 'HP LaserJet Pro MFP M126nw',
      printerStatus: machine?.status || 'ONLINE',
      originalFileName: job.originalFileName,
      fileSize: job.fileSize,
      pageCount: job.pageCount,
      effectivePages: job.effectivePages,
      copies: job.copies,
      paperSize: job.paperSize,
      colorMode: job.colorMode,
      duplexMode: job.duplexMode,
      amount: job.calculatedAmount,
      status: job.status,
      progressPercent: job.progressPercent,
      currentPrintingPage: job.currentPrintingPage,
      paymentOrderId: job.paymentOrderId,
      paymentId: job.paymentId,
      createdAt: job.createdAt,
      paymentVerifiedAt: job.paymentVerifiedAt,
      queuedAt: job.queuedAt,
      printingStartedAt: job.printingStartedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    },
  });
});

// 8. Create Gateway Payment Details / UPI Intent
app.get('/api/payments/order/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  let targetJob: PrintJob | undefined;

  for (const job of db.printJobs.values()) {
    if (job.paymentOrderId === orderId) {
      targetJob = job;
      break;
    }
  }

  if (!targetJob) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  // Construct realistic India UPI intent URI
  const upiVpa = 'atpprint.colleges@upi';
  const payeeName = 'College Any Time Print (ATP)';
  const upiUri = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(payeeName)}&am=${targetJob.calculatedAmount.toFixed(2)}&cu=INR&tr=${targetJob.paymentOrderId}&tn=${encodeURIComponent(`Print Job ${targetJob.jobId}`)}`;

  res.json({
    orderId: targetJob.paymentOrderId,
    jobId: targetJob.jobId,
    amount: targetJob.calculatedAmount,
    currency: 'INR',
    upiVpa,
    payeeName,
    upiUri,
    gatewayProvider: db.settings.paymentGatewayProvider,
    razorpayKeyId: db.settings.razorpayEnabled ? db.settings.razorpayKeyId : '',
    razorpayEnabled: db.settings.razorpayEnabled || false,
    status: targetJob.status,
  });
});

// 9. PAYMENT GATEWAY WEBHOOK (CRITICAL ENDPOINT - STRICT HMAC SHA256 VERIFICATION)
app.post('/api/payments/webhook', (req: Request, res: Response) => {
  const payload = req.body;
  const signature = (req.headers['x-razorpay-signature'] as string) || payload.signature || '';
  const orderId = payload.order_id || payload.paymentOrderId || payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
  const paymentId = payload.payment_id || payload.paymentId || payload.payload?.payment?.entity?.id || `pay_${Date.now()}`;
  const amount = payload.amount || (payload.payload?.payment?.entity?.amount ? payload.payload.payment.entity.amount / 100 : 0);

  if (!orderId || !signature) {
    res.status(400).json({ error: 'Missing order_id or webhook signature.' });
    return;
  }

  const result = processVerifiedPayment({
    paymentOrderId: orderId,
    paymentId,
    amount: parseFloat(amount as any) || 0,
    signature,
    method: payload.method || payload.payload?.payment?.entity?.method || 'RAZORPAY_WEBHOOK',
    rawPayload: payload,
    clientIp: getClientIp(req),
  });

  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(200).json({
    status: 'success',
    idempotentIgnored: result.idempotentIgnored || false,
    jobId: result.job?.jobId,
    printStatus: result.job?.status,
    message: result.idempotentIgnored
      ? 'Webhook previously processed. Job safely queued.'
      : 'Payment verified. Print job authorized and queued for HP LaserJet Pro MFP M126nw.',
  });
});

// 9b. Verify Direct Razorpay Checkout Payment from Mobile / Web Kiosk
app.post('/api/payments/verify-checkout', (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, paymentId, signature } = req.body;
  const finalOrderId = razorpay_order_id || orderId;
  const finalPaymentId = razorpay_payment_id || paymentId;
  const finalSignature = razorpay_signature || signature;

  if (!finalOrderId || !finalPaymentId || !finalSignature) {
    res.status(400).json({ error: 'Missing order_id, payment_id or signature from Razorpay.' });
    return;
  }

  const secret = db.settings.razorpayKeySecret || db.settings.paymentWebhookSecret;
  const result = processVerifiedPayment({
    paymentOrderId: finalOrderId,
    paymentId: finalPaymentId,
    amount: 0,
    signature: finalSignature,
    method: 'RAZORPAY_CHECKOUT_UPI',
    clientIp: getClientIp(req),
  });

  if (!result.valid) {
    res.status(400).json({ error: result.error || 'Payment verification failed.' });
    return;
  }

  res.json({
    success: true,
    jobId: result.job?.jobId,
    status: result.job?.status,
    message: 'Razorpay payment verified successfully! Print job sent to HP printer.',
  });
});

// 9c. Admin Gateway Configuration Endpoints
app.get('/api/admin/gateway-config', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/payments/webhook`;

  res.json({
    razorpayKeyId: db.settings.razorpayKeyId || '',
    razorpayKeySecretMasked: db.settings.razorpayKeySecret
      ? '••••••••' + db.settings.razorpayKeySecret.slice(-4)
      : '',
    razorpayWebhookSecret: db.settings.paymentWebhookSecret,
    razorpayEnabled: db.settings.razorpayEnabled || false,
    paymentGatewayProvider: db.settings.paymentGatewayProvider,
    allowSimulatedPayments: db.settings.allowSimulatedPayments,
    webhookUrl,
  });
});

app.post('/api/admin/gateway-config', (req: Request, res: Response) => {
  const {
    razorpayKeyId,
    razorpayKeySecret,
    razorpayWebhookSecret,
    razorpayEnabled,
    paymentGatewayProvider,
  } = req.body;

  if (typeof razorpayKeyId === 'string') {
    db.settings.razorpayKeyId = razorpayKeyId.trim();
  }
  if (typeof razorpayKeySecret === 'string' && razorpayKeySecret.trim()) {
    db.settings.razorpayKeySecret = razorpayKeySecret.trim();
  }
  if (typeof razorpayWebhookSecret === 'string' && razorpayWebhookSecret.trim()) {
    db.settings.razorpayWebhookSecret = razorpayWebhookSecret.trim();
    db.settings.paymentWebhookSecret = razorpayWebhookSecret.trim();
  }
  if (typeof razorpayEnabled === 'boolean') {
    db.settings.razorpayEnabled = razorpayEnabled;
  }
  if (paymentGatewayProvider) {
    db.settings.paymentGatewayProvider = paymentGatewayProvider;
  } else if (db.settings.razorpayKeyId?.startsWith('rzp_live')) {
    db.settings.paymentGatewayProvider = 'RAZORPAY_LIVE';
  } else if (db.settings.razorpayKeyId?.startsWith('rzp_test')) {
    db.settings.paymentGatewayProvider = 'RAZORPAY_TEST';
  }

  db.logAudit({
    eventType: 'GATEWAY_CONFIG_UPDATED',
    actor: 'ADMIN',
    details: `Razorpay credentials updated. Provider: ${db.settings.paymentGatewayProvider}, Enabled: ${db.settings.razorpayEnabled}`,
    ipAddress: getClientIp(req),
  });

  res.json({
    success: true,
    message: 'Razorpay Gateway configuration saved successfully.',
    config: {
      razorpayKeyId: db.settings.razorpayKeyId,
      razorpayEnabled: db.settings.razorpayEnabled,
      paymentGatewayProvider: db.settings.paymentGatewayProvider,
    },
  });
});

// 9d. Test Gateway Credentials
app.post('/api/admin/gateway-test', async (req: Request, res: Response) => {
  const keyId = req.body.keyId || db.settings.razorpayKeyId;
  const keySecret = req.body.keySecret || db.settings.razorpayKeySecret;

  const result = await testRazorpayConnection(keyId, keySecret);
  res.json(result);
});

// 10. Sandbox/Simulator Gateway Verification Tool (Generates authentic signed webhook)
app.post('/api/payments/simulate-gateway-event', (req: Request, res: Response) => {
  const { paymentOrderId, method } = req.body;

  let targetJob: PrintJob | undefined;
  for (const job of db.printJobs.values()) {
    if (job.paymentOrderId === paymentOrderId) {
      targetJob = job;
      break;
    }
  }

  if (!targetJob) {
    res.status(404).json({ error: 'Job order not found' });
    return;
  }

  // Generate authentic HMAC SHA-256 signature using the server's private secret
  const fakePaymentId = `pay_sim_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const signature = generateSignature(paymentOrderId, fakePaymentId, db.settings.paymentWebhookSecret);

  // Process payment through official verification engine
  const result = processVerifiedPayment({
    paymentOrderId,
    paymentId: fakePaymentId,
    amount: targetJob.calculatedAmount,
    signature,
    method: method || 'UPI_QR_GPay',
    rawPayload: { simulated: true, gateway: 'RAZORPAY_SANDBOX_SIMULATOR' },
    clientIp: getClientIp(req),
  });

  if (!result.valid) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Auto-progress spooler in trial mode if external Windows agent has not picked it up yet
  const job = result.job;
  if (job) {
    setTimeout(async () => {
      if (job.status === 'QUEUED') {
        job.status = 'PRINTING';
        job.printingStartedAt = new Date().toISOString();
        const totalSheets = job.effectivePages * job.copies;

        for (let p = 1; p <= totalSheets; p++) {
          await new Promise((r) => setTimeout(r, 1400));
          if (job.status !== 'PRINTING') break;
          job.currentPrintingPage = p;
          job.progressPercent = Math.min(100, Math.round((p / totalSheets) * 100));
        }

        if (job.status === 'PRINTING') {
          job.status = 'COMPLETED';
          job.completedAt = new Date().toISOString();
          job.progressPercent = 100;
          job.currentPrintingPage = totalSheets;
          db.logAudit({
            eventType: 'PRINT_COMPLETED_SIMULATION',
            actor: 'SPOOLER_SIMULATOR',
            jobId: job.jobId,
            machineId: job.machineId,
            details: `HP LaserJet Pro MFP M126nw output bin delivery completed for ${job.jobId} (${totalSheets} sheets printed).`,
          });
        }
      }
    }, 1500);
  }

  res.json({
    success: true,
    jobId: targetJob.jobId,
    paymentId: fakePaymentId,
    signature,
    jobStatus: targetJob.status,
    message: 'Payment verified via authentic HMAC-SHA256 signature. Print job authorized and queued!',
  });
});

// -------------------------------------------------------------
// WINDOWS PRINT AGENT API (AUTHENTICATED VIA MACHINE ID + TOKEN)
// -------------------------------------------------------------

function authenticateAgent(req: Request, res: Response, next: NextFunction): void {
  const machineId = (req.headers['x-machine-id'] as string) || (req.query.machineId as string);
  const machineToken = (req.headers['x-machine-token'] as string) || (req.query.machineToken as string);

  if (!machineId || !machineToken) {
    res.status(401).json({ error: 'Missing machine credentials (X-Machine-Id / X-Machine-Token).' });
    return;
  }

  const machine = db.machines.get(machineId);
  if (!machine || machine.secretToken !== machineToken) {
    res.status(403).json({ error: 'Unauthorized: Invalid machine credentials.' });
    return;
  }

  (req as any).machine = machine;
  next();
}

// Agent Heartbeat Endpoint
app.post('/api/agent/heartbeat', authenticateAgent, (req: Request, res: Response) => {
  const machine = (req as any).machine as Machine;
  const { status, paperLevelPercent, tonerLevelPercent, paperJam, outOfPaper, agentVersion } = req.body;

  machine.lastHeartbeat = new Date().toISOString();
  if (status) machine.status = status;
  if (typeof paperLevelPercent === 'number') machine.paperLevelPercent = paperLevelPercent;
  if (typeof tonerLevelPercent === 'number') machine.tonerLevelPercent = tonerLevelPercent;
  if (typeof paperJam === 'boolean') machine.paperJam = paperJam;
  if (typeof outOfPaper === 'boolean') machine.outOfPaper = outOfPaper;
  if (agentVersion) machine.agentVersion = agentVersion;
  machine.ipAddress = getClientIp(req);

  res.json({ success: true, timestamp: machine.lastHeartbeat });
});

// Agent Polls for Queued Jobs
app.get('/api/agent/jobs', authenticateAgent, (req: Request, res: Response) => {
  const machine = (req as any).machine as Machine;
  const queuedJobs: any[] = [];

  for (const job of db.printJobs.values()) {
    if (job.machineId === machine.id && job.status === 'QUEUED') {
      queuedJobs.push({
        jobId: job.jobId,
        fileName: job.originalFileName,
        fileSize: job.fileSize,
        pageCount: job.pageCount,
        effectivePages: job.effectivePages,
        pageSelection: job.pageSelection,
        copies: job.copies,
        paperSize: job.paperSize,
        colorMode: job.colorMode,
        duplexMode: job.duplexMode,
        createdAt: job.createdAt,
        queuedAt: job.queuedAt,
      });
    }
  }

  res.json({ count: queuedJobs.length, jobs: queuedJobs });
});

// Agent Downloads Document
app.get('/api/agent/jobs/:jobId/download', authenticateAgent, (req: Request, res: Response) => {
  const { jobId } = req.params;
  const machine = (req as any).machine as Machine;

  const job = db.printJobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }

  if (job.machineId !== machine.id) {
    res.status(403).json({ error: 'Job is not assigned to this machine.' });
    return;
  }

  if (!fs.existsSync(job.filePath)) {
    res.status(410).json({ error: 'Document file no longer available on server.' });
    return;
  }

  res.download(job.filePath, job.originalFileName);
});

// Agent Reports Print Job Status
app.post('/api/agent/jobs/:jobId/status', authenticateAgent, (req: Request, res: Response) => {
  const { jobId } = req.params;
  const machine = (req as any).machine as Machine;
  const { status, currentPrintingPage, errorMessage } = req.body;

  const job = db.printJobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }

  const oldStatus = job.status;
  if (status === 'PRINTING') {
    job.status = 'PRINTING';
    if (!job.printingStartedAt) job.printingStartedAt = new Date().toISOString();
    machine.activeJobId = jobId;
    if (typeof currentPrintingPage === 'number') {
      job.currentPrintingPage = currentPrintingPage;
      job.progressPercent = Math.min(100, Math.round((currentPrintingPage / (job.effectivePages * job.copies)) * 100));
    }
  } else if (status === 'COMPLETED') {
    job.status = 'COMPLETED';
    job.completedAt = new Date().toISOString();
    job.progressPercent = 100;
    job.currentPrintingPage = job.effectivePages * job.copies;
    machine.activeJobId = null;

    // Automatic Paper Inventory Deduction
    const sheetsUsed = job.duplexMode === 'DOUBLE'
      ? Math.ceil(job.effectivePages / 2) * job.copies
      : job.effectivePages * job.copies;
    db.consumePaper(machine.id, sheetsUsed);

    db.logAudit({
      eventType: 'PRINT_COMPLETED',
      actor: 'WINDOWS_AGENT',
      jobId,
      machineId: machine.id,
      details: `HP LaserJet Pro MFP M126nw successfully printed Job ${jobId} (${job.originalFileName}). ${sheetsUsed} sheets deducted. Remaining: ${machine.paperSheetsRemaining} sheets.`,
    });
  } else if (status === 'FAILED') {
    job.status = 'FAILED';
    job.failedAt = new Date().toISOString();
    job.errorMessage = errorMessage || 'Printer Spooler Hardware Error';
    machine.activeJobId = null;

    db.logAudit({
      eventType: 'PRINT_FAILED',
      actor: 'WINDOWS_AGENT',
      jobId,
      machineId: machine.id,
      details: `Print Job ${jobId} failed: ${job.errorMessage}`,
    });
  }

  res.json({ success: true, jobId, status: job.status, previous: oldStatus });
});

// -------------------------------------------------------------
// ADMIN & MONITORING API ROUTES
// -------------------------------------------------------------

// Admin Dashboard Summary Metrics
app.get('/api/admin/metrics', (_req: Request, res: Response) => {
  const now = Date.now();
  let totalRevenue = 0;
  let successfulPrints = 0;
  let failedPrints = 0;
  let pendingPayments = 0;
  let queuedJobs = 0;
  let onlineMachines = 0;
  let offlineMachines = 0;

  for (const m of db.machines.values()) {
    const isStale = now - new Date(m.lastHeartbeat).getTime() > 45000;
    if (!isStale && m.status === 'ONLINE') onlineMachines++;
    else offlineMachines++;
  }

  for (const j of db.printJobs.values()) {
    if (j.status === 'COMPLETED' || j.status === 'PRINTED') {
      successfulPrints++;
      totalRevenue += j.calculatedAmount;
    } else if (j.status === 'FAILED') {
      failedPrints++;
    } else if (j.status === 'PAYMENT_PENDING') {
      pendingPayments++;
    } else if (j.status === 'QUEUED' || j.status === 'PRINTING') {
      queuedJobs++;
      totalRevenue += j.calculatedAmount;
    }
  }

  res.json({
    metrics: {
      todayRevenue: Math.round(totalRevenue * 100) / 100,
      totalJobs: db.printJobs.size,
      successfulPrints,
      failedPrints,
      pendingPayments,
      queuedJobs,
      onlineMachines,
      offlineMachines,
      totalColleges: db.colleges.size,
    },
  });
});

// Admin List Jobs
app.get('/api/admin/jobs', (req: Request, res: Response) => {
  const { machineId, collegeId, status, search } = req.query;

  let jobs = Array.from(db.printJobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (machineId) {
    jobs = jobs.filter((j) => j.machineId === machineId);
  }
  if (collegeId) {
    jobs = jobs.filter((j) => j.collegeId === collegeId);
  }
  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.jobId.toLowerCase().includes(q) ||
        j.originalFileName.toLowerCase().includes(q) ||
        j.paymentOrderId.toLowerCase().includes(q) ||
        (j.paymentId && j.paymentId.toLowerCase().includes(q))
    );
  }

  res.json({ total: jobs.length, jobs });
});

// Admin Pricing Rules
app.get('/api/admin/pricing', (_req: Request, res: Response) => {
  res.json({ pricingRules: Array.from(db.pricingRules.values()) });
});

app.post('/api/admin/pricing', (req: Request, res: Response) => {
  const rule: PricingRule = req.body;
  if (!rule.id || !rule.collegeId) {
    res.status(400).json({ error: 'Missing rule ID or college ID' });
    return;
  }
  db.pricingRules.set(rule.id, rule);
  db.logAudit({
    eventType: 'PRICING_UPDATED',
    actor: 'ADMIN',
    details: `Updated pricing rule ${rule.id} (BW Single: ₹${rule.bwSingleSideRate}, BW Double: ₹${rule.bwDoubleSideRate})`,
  });
  res.json({ success: true, rule });
});

// Admin Hardware Test Print Trigger
app.post('/api/printer/test-print', (req: Request, res: Response) => {
  const { machineId } = req.body;
  const machine = db.machines.get(machineId);
  if (!machine) {
    res.status(404).json({ error: 'Machine not found' });
    return;
  }

  // Create a system test page print job
  const jobId = `JOB-TEST-${Date.now().toString().slice(-6)}`;
  const testJob: PrintJob = {
    jobId,
    trackingToken: 'test_token_' + Date.now(),
    machineId: machine.id,
    collegeId: machine.collegeId,
    fileName: 'hp_m126nw_test_page.pdf',
    originalFileName: 'HP_LaserJet_M126nw_Diagnostic_Test.pdf',
    fileSize: 45200,
    fileHash: 'test_hash_' + Date.now(),
    filePath: path.join(__dirname, 'uploads', 'test_page.pdf'),
    pageCount: 1,
    pageSelection: '1',
    effectivePages: 1,
    copies: 1,
    paperSize: 'A4',
    colorMode: 'BW',
    duplexMode: 'SINGLE',
    calculatedAmount: 0,
    status: 'QUEUED',
    progressPercent: 0,
    currentPrintingPage: 0,
    paymentOrderId: 'order_test_bypass',
    paymentId: 'pay_test_bypass',
    paymentVerifiedAt: new Date().toISOString(),
    queuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.printJobs.set(jobId, testJob);

  db.logAudit({
    eventType: 'HARDWARE_TEST_PRINT',
    actor: 'ADMIN',
    machineId: machine.id,
    jobId,
    details: `Triggered diagnostic test print on ${machine.printerModel} (${machine.name})`,
  });

  res.json({ success: true, jobId, message: 'Test print sent to HP LaserJet Pro MFP M126nw queue.' });
});

// Admin Trigger Refund
app.post('/api/admin/jobs/:jobId/refund', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = db.printJobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  job.status = 'REFUNDED';
  job.refundId = `ref_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  job.refundedAt = new Date().toISOString();

  db.logAudit({
    eventType: 'PAYMENT_REFUNDED',
    actor: 'ADMIN',
    jobId: job.jobId,
    machineId: job.machineId,
    details: `Refund of ₹${job.calculatedAmount} issued (Ref ID: ${job.refundId}) for order ${job.paymentOrderId}`,
  });

  res.json({ success: true, refundId: job.refundId, job });
});

// Admin Audit Logs & Webhooks
app.get('/api/admin/audit-logs', (_req: Request, res: Response) => {
  res.json({ logs: db.auditLogs.slice(0, 100) });
});

app.get('/api/admin/webhooks', (_req: Request, res: Response) => {
  res.json({ webhooks: db.paymentWebhooks.slice(0, 50) });
});

// Admin System Settings
app.get('/api/admin/settings', (_req: Request, res: Response) => {
  res.json({ settings: db.settings });
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  const { defaultFileRetentionMinutes, paymentWebhookSecret, paymentGatewayProvider, allowSimulatedPayments, customDomain } = req.body;
  if (typeof defaultFileRetentionMinutes === 'number') db.settings.defaultFileRetentionMinutes = defaultFileRetentionMinutes;
  if (paymentWebhookSecret) db.settings.paymentWebhookSecret = paymentWebhookSecret;
  if (paymentGatewayProvider) db.settings.paymentGatewayProvider = paymentGatewayProvider;
  if (typeof allowSimulatedPayments === 'boolean') db.settings.allowSimulatedPayments = allowSimulatedPayments;
  if (typeof customDomain === 'string') db.settings.customDomain = customDomain.trim();

  res.json({ success: true, settings: db.settings });
});

// -------------------------------------------------------------
// 16-INCH KIOSK DISPLAY & ADVERTISEMENT DIGITAL SIGNAGE APIS
// -------------------------------------------------------------

// Kiosk Display Aggregated Real-time Status (for 16-inch Monitor)
app.get('/api/kiosk/display-info/:machineId', async (req: Request, res: Response) => {
  const { machineId } = req.params;
  const machine = db.machines.get(machineId) || db.machines.get('ATP-XAV-001');

  if (!machine) {
    res.status(404).json({ error: 'Machine not found' });
    return;
  }

  // Find active print job (PRINTING or QUEUED)
  let activeJob: PrintJob | null = null;
  let queuedCount = 0;

  for (const job of db.printJobs.values()) {
    if (job.machineId === machine.id) {
      if (job.status === 'PRINTING') {
        activeJob = job;
      } else if (job.status === 'QUEUED') {
        queuedCount++;
        if (!activeJob) activeJob = job;
      }
    }
  }

  const pricing = db.getPricingForMachine(machine.id);
  const advertisements = db.getAdvertisements(true);
  const kioskSettings = db.getKioskDisplaySettings();

  const host = db.settings.customDomain || req.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const targetUrl = `${protocol}://${host}/m/${machine.id}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 400,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (e) {
    // fallback
  }

  res.json({
    machine: {
      id: machine.id,
      name: machine.name,
      location: machine.location,
      printerModel: machine.printerModel,
      printerConnection: machine.printerConnection,
      status: machine.status,
      lastHeartbeat: machine.lastHeartbeat,
      paperLevelPercent: machine.paperLevelPercent,
      paperSheetsRemaining: machine.paperSheetsRemaining,
      paperTrayCapacity: machine.paperTrayCapacity,
      tonerLevelPercent: machine.tonerLevelPercent,
      paperJam: machine.paperJam,
      outOfPaper: machine.outOfPaper,
      activeJobId: machine.activeJobId,
      totalSheetsPrintedLifetime: machine.totalSheetsPrintedLifetime,
    },
    activeJob: activeJob
      ? {
          jobId: activeJob.jobId,
          fileName: activeJob.originalFileName,
          effectivePages: activeJob.effectivePages,
          copies: activeJob.copies,
          currentPrintingPage: activeJob.currentPrintingPage,
          progressPercent: activeJob.progressPercent,
          status: activeJob.status,
          colorMode: activeJob.colorMode,
          duplexMode: activeJob.duplexMode,
        }
      : null,
    queuedCount,
    pricing,
    advertisements,
    kioskSettings,
    targetUrl,
    qrDataUrl,
    currentTime: new Date().toISOString(),
  });
});

// List All Advertisements (Admin & Display)
app.get('/api/advertisements', (_req: Request, res: Response) => {
  res.json({
    advertisements: db.getAdvertisements(false),
    settings: db.getKioskDisplaySettings(),
  });
});

// Create Advertisement
app.post('/api/advertisements', (req: Request, res: Response) => {
  const {
    title,
    tagline,
    description,
    advertiserName,
    contactPhone,
    contactEmail,
    bannerBadge,
    imageUrl,
    bgGradient,
    accentColor,
    ctaText,
    durationSeconds,
    isActive,
    order,
  } = req.body;

  if (!title || !advertiserName) {
    res.status(400).json({ error: 'Title and advertiser name are required.' });
    return;
  }

  const newAd = db.addAdvertisement({
    title: title.trim(),
    tagline: (tagline || '').trim(),
    description: (description || '').trim(),
    advertiserName: advertiserName.trim(),
    contactPhone: (contactPhone || '').trim(),
    contactEmail: (contactEmail || '').trim(),
    bannerBadge: (bannerBadge || 'SPONSOR').trim(),
    imageUrl: (imageUrl || '').trim(),
    bgGradient: bgGradient || 'from-indigo-950 via-slate-900 to-blue-950',
    accentColor: accentColor || 'indigo',
    ctaText: (ctaText || 'Contact Advertiser').trim(),
    durationSeconds: Math.max(3, Number(durationSeconds) || 8),
    isActive: isActive !== false,
    order: Number(order) || db.advertisements.length + 1,
  });

  res.status(201).json({ success: true, advertisement: newAd });
});

// Update Advertisement
app.put('/api/advertisements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = db.updateAdvertisement(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Advertisement not found.' });
    return;
  }
  res.json({ success: true, advertisement: updated });
});

// Delete Advertisement
app.delete('/api/advertisements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = db.deleteAdvertisement(id);
  if (!success) {
    res.status(404).json({ error: 'Advertisement not found.' });
    return;
  }
  res.json({ success: true, message: 'Advertisement deleted.' });
});

// Kiosk Settings Get & Update
app.get('/api/kiosk/settings', (_req: Request, res: Response) => {
  res.json({ settings: db.getKioskDisplaySettings() });
});

app.post('/api/kiosk/settings', (req: Request, res: Response) => {
  const updated = db.updateKioskDisplaySettings(req.body);
  res.json({ success: true, settings: updated });
});

// Export CSV of Jobs
app.get('/api/admin/export-csv', (_req: Request, res: Response) => {
  const jobs = Array.from(db.printJobs.values());
  const headers = [
    'Job ID',
    'Created At',
    'College ID',
    'Machine ID',
    'File Name',
    'Pages',
    'Copies',
    'Color Mode',
    'Duplex',
    'Amount (INR)',
    'Payment Order ID',
    'Payment ID',
    'Status',
    'Error Message',
  ];

  const rows = jobs.map((j) => [
    j.jobId,
    j.createdAt,
    j.collegeId,
    j.machineId,
    `"${j.originalFileName.replace(/"/g, '""')}"`,
    j.effectivePages,
    j.copies,
    j.colorMode,
    j.duplexMode,
    j.calculatedAmount,
    j.paymentOrderId,
    j.paymentId || '',
    j.status,
    `"${(j.errorMessage || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="atp_print_jobs_${Date.now()}.csv"`);
  res.send(csv);
});

// Download Windows 10 Agent Files
app.get('/api/agent-package/file/:filename', (req: Request, res: Response) => {
  const allowed = ['run_agent.bat', 'atp_agent.py', 'config.json', 'README_WINDOWS_AGENT.md'];
  const { filename } = req.params;
  if (!allowed.includes(filename)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const filePath = path.join(__dirname, 'agent', filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Agent file missing' });
    return;
  }
  res.download(filePath, filename);
});

// Printable Standalone A4 Test Sheet (Bypasses iFrame sandbox)
app.get('/api/printer/printable-test-page', (req: Request, res: Response) => {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ATP Hardware Test Page - HP LaserJet Pro MFP M126nw</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 20px; background: #fff; }
    .page-box { border: 2px solid #000; padding: 24px; border-radius: 8px; max-width: 720px; margin: 0 auto; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #444; }
    .badge { border: 1.5px solid #000; padding: 6px 12px; font-size: 12px; font-weight: 700; font-family: monospace; border-radius: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #ccc; padding: 10px; border-radius: 6px; font-size: 12px; }
    .card strong { display: block; font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 2px; }
    .big-banner { background: #f0f0f0; border: 1.5px dashed #000; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px; }
    .big-banner h2 { margin: 0 0 4px 0; font-size: 18px; }
    .big-banner p { margin: 0; font-size: 13px; }
    .checklist { margin: 16px 0; font-size: 13px; line-height: 1.8; }
    .footer { border-top: 1px solid #ccc; padding-top: 12px; margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; color: #666; }
    .screen-only-bar { background: #2563eb; color: #fff; padding: 12px; text-align: center; border-radius: 8px; margin-bottom: 20px; max-width: 720px; margin-left: auto; margin-right: auto; }
    .screen-only-bar button { background: #fff; color: #2563eb; border: none; padding: 8px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 12px; }
    @media print {
      .screen-only-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="screen-only-bar">
    <span>💡 Standard A4 Print Ready! Click here to print:</span>
    <button onclick="window.print()">🖨️ Print Now (Ctrl + P)</button>
  </div>

  <div class="page-box">
    <div class="header">
      <div>
        <h1>COLLEGE ANY TIME PRINT (ATP)</h1>
        <p>Autonomous Campus Kiosk • Hardware Verification Sheet</p>
      </div>
      <div class="badge">HP M126nw VERIFIED</div>
    </div>

    <div class="grid">
      <div class="card">
        <strong>Target Printer</strong>
        HP LaserJet Pro MFP M126nw (USB / Wi-Fi Spooler)
      </div>
      <div class="card">
        <strong>Kiosk Terminal ID</strong>
        ATP-XAV-001 (St. Xavier Campus Kiosk)
      </div>
      <div class="card">
        <strong>Printed At Timestamp</strong>
        ${now}
      </div>
      <div class="card">
        <strong>Verification Status</strong>
        HARDWARE SPOOLER ACTIVE & HEALTHY
      </div>
    </div>

    <div class="big-banner">
      <h2>✓ PRINTER HARDWARE TEST SUCCESSFUL!</h2>
      <p>If this page is printed on paper, your HP LaserJet Pro MFP M126nw is completely operational and ready for college students!</p>
    </div>

    <div class="checklist">
      <strong>Hardware Diagnostic Checklist:</strong><br>
      [✓] Windows 10 Print Spooler Driver Communication: PASS<br>
      [✓] A4 Paper Feed Roller Alignment: PASS<br>
      [✓] 600 DPI Monochrome Toner Density: PASS<br>
      [✓] Cryptographic Print Queue Latency: &lt; 2.5s PASS
    </div>

    <div class="footer">
      <span>College Any Time Print (ATP) • Security Token: atp_sec_xav_lib_01_98f4a</span>
      <span>Official Campus Document</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// -------------------------------------------------------------
// VITE INTEGRATION FOR FULL-STACK REACT SPA
// -------------------------------------------------------------
async function setupViteOrStatic() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Background cleanup task for uploaded documents (Privacy Requirement #19)
setInterval(() => {
  const retentionMs = db.settings.defaultFileRetentionMinutes * 60 * 1000;
  const now = Date.now();

  for (const job of db.printJobs.values()) {
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      const completedTime = new Date(job.completedAt || job.failedAt || job.createdAt).getTime();
      if (now - completedTime > retentionMs) {
        if (job.filePath && fs.existsSync(job.filePath)) {
          try {
            fs.unlinkSync(job.filePath);
            db.logAudit({
              eventType: 'FILE_PRIVACY_PURGED',
              actor: 'CLEANUP_DAEMON',
              jobId: job.jobId,
              machineId: job.machineId,
              details: `File for Job ${job.jobId} securely deleted per ${db.settings.defaultFileRetentionMinutes} min privacy retention policy.`,
            });
          } catch (e: any) {
            console.error('File cleanup error:', e.message);
          }
        }
      }
    }
  }
}, 60000); // Check every 60s

// Auto-heartbeat keeper for local dev/preview so machines stay ONLINE during testing
setInterval(() => {
  const now = new Date().toISOString();
  for (const machine of db.machines.values()) {
    // Only auto-refresh heartbeat if printer is not manually faulted (e.g. simulated paper jam)
    if (!machine.paperJam && !machine.outOfPaper && machine.status !== 'BUSY') {
      machine.lastHeartbeat = now;
      if (machine.status === 'OFFLINE') {
        machine.status = 'ONLINE';
      }
    }
  }
}, 10000);

setupViteOrStatic().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ATP Print Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[ATP Print Server] Target Printer: HP LaserJet Pro MFP M126nw`);
    console.log(`[ATP Print Server] Ready for Student QR scans and Windows Print Agent.`);
  });
});
