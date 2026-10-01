/**
 * Database & State Store for Any Time Print (ATP) System
 * Provides transactional state, strict idempotency, and audit trails.
 */

import fs from 'fs';
import path from 'path';

export interface College {
  id: string;
  name: string;
  code: string;
  campus: string;
  city: string;
  contactEmail: string;
  createdAt: string;
}

export interface PricingRule {
  id: string;
  collegeId: string;
  machineId?: string; // If specific to a machine, otherwise applies to college
  paperSize: 'A4' | 'A3' | 'Legal' | 'Letter';
  bwSingleSideRate: number; // ₹ per page
  bwDoubleSideRate: number; // ₹ per sheet (2 pages)
  colorSingleSideRate: number;
  colorDoubleSideRate: number;
  baseServiceFee: number;
  maxCopies: number;
  maxPages: number;
}

export interface Machine {
  id: string; // e.g. "ATP-XAV-001"
  collegeId: string;
  name: string;
  location: string;
  secretToken: string; // Token for Windows Agent authentication
  printerModel: string; // e.g. "HP LaserJet Pro MFP M126nw"
  printerConnection: 'USB' | 'LAN_WIFI' | 'SPOOLER';
  printerQueueName: string; // Windows Spooler name
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
  lastHeartbeat: string;
  paperLevelPercent: number;
  paperSheetsRemaining: number;
  paperTrayCapacity: number;
  lastPaperRefillDate?: string;
  totalSheetsPrintedLifetime: number;
  tonerLevelPercent: number;
  paperJam: boolean;
  outOfPaper: boolean;
  activeJobId: string | null;
  agentVersion: string;
  ipAddress: string;
}

export interface PaperRefillLog {
  id: string;
  timestamp: string;
  machineId: string;
  machineName: string;
  location: string;
  collegeId: string;
  sheetsAdded: number;
  previousSheets: number;
  newTotalSheets: number;
  operatorName: string;
  paperBrand: string;
  notes?: string;
}

export type JobStatus =
  | 'CREATED'
  | 'FILE_UPLOADED'
  | 'PRICE_CALCULATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFIED'
  | 'QUEUED'
  | 'PRINTING'
  | 'PRINTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export interface PrintJob {
  jobId: string;
  trackingToken: string;
  machineId: string;
  collegeId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileHash: string;
  filePath: string;
  pageCount: number;
  pageSelection: string; // "all" or e.g. "1-5, 8"
  effectivePages: number; // Total number of unique pages to print
  copies: number;
  paperSize: 'A4' | 'A3' | 'Legal' | 'Letter';
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
  calculatedAmount: number; // in INR
  status: JobStatus;
  progressPercent: number;
  currentPrintingPage: number;
  paymentOrderId: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentVerifiedAt?: string;
  queuedAt?: string;
  printingStartedAt?: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  refundId?: string;
  refundedAt?: string;
  clientIp?: string;
  createdAt: string;
}

export interface PaymentWebhookLog {
  id: string;
  receivedAt: string;
  event: string;
  paymentOrderId: string;
  paymentId: string;
  amount: number;
  signature: string;
  isValidSignature: boolean;
  processed: boolean;
  idempotentIgnored: boolean;
  rawPayload: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  machineId?: string;
  jobId?: string;
  details: string;
  ipAddress?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  tagline: string;
  description?: string;
  advertiserName: string;
  contactPhone: string;
  contactEmail?: string;
  bannerBadge?: string;
  imageUrl?: string;
  bgGradient: string;
  accentColor: 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  ctaText?: string;
  durationSeconds: number;
  isActive: boolean;
  order: number;
}

export interface KioskDisplaySettings {
  screensaverIdleSeconds: number;
  screensaverEnabled: boolean;
  showWorkingStatusAlways: boolean;
  monitorSizeName: string;
  touchToWakeMessage: string;
  adBannerContactPhone: string;
  adBannerContactText: string;
}

export interface SystemSettings {
  defaultFileRetentionMinutes: number;
  paymentWebhookSecret: string;
  paymentGatewayProvider: 'RAZORPAY_LIVE' | 'RAZORPAY_TEST' | 'RAZORPAY_SANDBOX' | 'CASHFREE' | 'MOCK_UPI';
  allowSimulatedPayments: boolean;
  adminPasswordHash: string;
  customDomain?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  razorpayEnabled?: boolean;
}

class Database {
  colleges: Map<string, College> = new Map();
  machines: Map<string, Machine> = new Map();
  pricingRules: Map<string, PricingRule> = new Map();
  printJobs: Map<string, PrintJob> = new Map();
  paymentWebhooks: PaymentWebhookLog[] = [];
  auditLogs: AuditLog[] = [];
  paperRefillLogs: PaperRefillLog[] = [];
  advertisements: Advertisement[] = [];
  kioskDisplaySettings: KioskDisplaySettings = {
    screensaverIdleSeconds: 20,
    screensaverEnabled: true,
    showWorkingStatusAlways: true,
    monitorSizeName: '16-Inch HD Multi-Touch Widescreen',
    touchToWakeMessage: '👆 स्क्रीन पर कहीं भी टच करें या मोबाइल से QR स्कैन करें',
    adBannerContactPhone: '+91 99999 99999',
    adBannerContactText: 'इस 16 इंच स्क्रीन पर अपना विज्ञापन दिखाने के लिए संपर्क करें',
  };
  settings: SystemSettings = {
    defaultFileRetentionMinutes: 30,
    paymentWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'atp_whsec_prod_994a821e90',
    paymentGatewayProvider: (process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'RAZORPAY_LIVE' : 'RAZORPAY_TEST') as any,
    allowSimulatedPayments: true,
    adminPasswordHash: 'admin123',
    customDomain: 'msprinter.in',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'atp_whsec_prod_994a821e90',
    razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Initial College
    const college1: College = {
      id: 'COL-XAV',
      name: "St. Xavier's College of Engineering & Technology",
      code: 'XAVIER-ENG',
      campus: 'North Campus',
      city: 'Mumbai',
      contactEmail: 'atp-admin@xaviers.edu.in',
      createdAt: new Date().toISOString(),
    };

    const college2: College = {
      id: 'COL-DMU',
      name: 'Delhi Metropolitan University',
      code: 'DMU-MAIN',
      campus: 'Central Campus',
      city: 'New Delhi',
      contactEmail: 'printing@dmu.ac.in',
      createdAt: new Date().toISOString(),
    };

    this.colleges.set(college1.id, college1);
    this.colleges.set(college2.id, college2);

    // 2. Initial Machines (Target printer: HP LaserJet Pro MFP M126nw)
    const machine1: Machine = {
      id: 'ATP-XAV-001',
      collegeId: 'COL-XAV',
      name: 'Library Central Kiosk #1',
      location: 'Ground Floor, Central Library, Circulation Desk',
      secretToken: 'atp_sec_xav_lib_01_98f4a',
      printerModel: 'HP LaserJet Pro MFP M126nw',
      printerConnection: 'USB',
      printerQueueName: 'HP LaserJet Pro MFP M126nw',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      paperTrayCapacity: 500,
      paperSheetsRemaining: 490, // Loaded 500 sheets, 10 printed -> 490 remaining
      totalSheetsPrintedLifetime: 10,
      lastPaperRefillDate: new Date(Date.now() - 3600000 * 4).toISOString(),
      paperLevelPercent: 98,
      tonerLevelPercent: 88,
      paperJam: false,
      outOfPaper: false,
      activeJobId: null,
      agentVersion: 'v1.4.2-win10',
      ipAddress: '192.168.1.105',
    };

    const machine2: Machine = {
      id: 'ATP-XAV-002',
      collegeId: 'COL-XAV',
      name: 'Computer Lab 3 Kiosk',
      location: 'B-Block 2nd Floor, IT Computer Center',
      secretToken: 'atp_sec_xav_cs_02_74c1b',
      printerModel: 'HP LaserJet Pro MFP M126nw',
      printerConnection: 'LAN_WIFI',
      printerQueueName: 'HP LaserJet Pro MFP M126nw (Network)',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      paperTrayCapacity: 500,
      paperSheetsRemaining: 325,
      totalSheetsPrintedLifetime: 175,
      lastPaperRefillDate: new Date(Date.now() - 3600000 * 24).toISOString(),
      paperLevelPercent: 65,
      tonerLevelPercent: 45,
      paperJam: false,
      outOfPaper: false,
      activeJobId: null,
      agentVersion: 'v1.4.2-win10',
      ipAddress: '192.168.1.144',
    };

    const machine3: Machine = {
      id: 'ATP-DMU-001',
      collegeId: 'COL-DMU',
      name: 'Student Center Any Time Print',
      location: 'Student Activity Center, Gate 2',
      secretToken: 'atp_sec_dmu_sac_01_33e8d',
      printerModel: 'HP LaserJet Pro MFP M126nw',
      printerConnection: 'USB',
      printerQueueName: 'HP LaserJet Pro MFP M126nw',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      paperTrayCapacity: 500,
      paperSheetsRemaining: 400,
      totalSheetsPrintedLifetime: 100,
      lastPaperRefillDate: new Date(Date.now() - 3600000 * 18).toISOString(),
      paperLevelPercent: 80,
      tonerLevelPercent: 70,
      paperJam: false,
      outOfPaper: false,
      activeJobId: null,
      agentVersion: 'v1.4.2-win10',
      ipAddress: '10.0.4.52',
    };

    this.machines.set(machine1.id, machine1);
    this.machines.set(machine2.id, machine2);
    this.machines.set(machine3.id, machine3);

    // Initial Paper Refill Logs (Paper Inventory Register)
    this.paperRefillLogs = [
      {
        id: 'REFILL-1001',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        machineId: 'ATP-XAV-001',
        machineName: 'Library Central Kiosk #1',
        location: 'Ground Floor, Central Library, Circulation Desk',
        collegeId: 'COL-XAV',
        sheetsAdded: 500,
        previousSheets: 0,
        newTotalSheets: 500,
        operatorName: 'Domendra Kumar (Kiosk Admin)',
        paperBrand: 'JK Copier A4 75 GSM (1 Full Ream)',
        notes: 'Initial Morning Refill in Empty Tray (500 Sheets loaded). 10 sheets printed, 490 remaining.',
      },
      {
        id: 'REFILL-1002',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        machineId: 'ATP-XAV-002',
        machineName: 'Computer Lab 3 Kiosk',
        location: 'B-Block 2nd Floor, IT Computer Center',
        collegeId: 'COL-XAV',
        sheetsAdded: 500,
        previousSheets: 0,
        newTotalSheets: 500,
        operatorName: 'Lab Assistant Sharma',
        paperBrand: 'Century Star A4 70 GSM',
        notes: 'Loaded 1 Ream for Computer Lab batch prints',
      },
      {
        id: 'REFILL-1003',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        machineId: 'ATP-DMU-001',
        machineName: 'Student Center Any Time Print',
        location: 'Student Activity Center, Gate 2',
        collegeId: 'COL-DMU',
        sheetsAdded: 500,
        previousSheets: 0,
        newTotalSheets: 500,
        operatorName: 'Campus Facility Desk',
        paperBrand: 'B2B Copier A4 75 GSM',
        notes: 'Regular replenishment for Student Activity Center',
      },
    ];

    // 3. Pricing Rules
    const price1: PricingRule = {
      id: 'PR-XAV-DEFAULT',
      collegeId: 'COL-XAV',
      paperSize: 'A4',
      bwSingleSideRate: 2.0, // ₹2 / page
      bwDoubleSideRate: 3.0, // ₹3 / sheet (both sides)
      colorSingleSideRate: 10.0,
      colorDoubleSideRate: 18.0,
      baseServiceFee: 0.0,
      maxCopies: 10,
      maxPages: 100,
    };

    const price2: PricingRule = {
      id: 'PR-DMU-DEFAULT',
      collegeId: 'COL-DMU',
      paperSize: 'A4',
      bwSingleSideRate: 2.0,
      bwDoubleSideRate: 3.0,
      colorSingleSideRate: 10.0,
      colorDoubleSideRate: 18.0,
      baseServiceFee: 0.0,
      maxCopies: 10,
      maxPages: 100,
    };

    this.pricingRules.set(price1.id, price1);
    this.pricingRules.set(price2.id, price2);

    // 4. Default Advertisement Slides for 16-Inch Kiosk Screen
    this.advertisements = [
      {
        id: 'AD-001',
        title: 'GATE & IES 2027 Foundation Batch Admissions Open!',
        tagline: 'Special 25% Flat College Concession • Daily 2-Hour Live Problem Solving',
        description: 'Join Central Campus\'s Top Engineering Coaching Institute. 150+ Selections last year in IITs & PSUs.',
        advertiserName: 'Apex Career & GATE Institute',
        contactPhone: '+91 98765 43210',
        contactEmail: 'admission@apexcareer.edu',
        bannerBadge: 'SPONSOR PARTNER',
        bgGradient: 'from-blue-950 via-slate-900 to-indigo-950',
        accentColor: 'blue',
        ctaText: 'Visit Center Opp. College Gate 1',
        durationSeconds: 8,
        isActive: true,
        order: 1,
      },
      {
        id: 'AD-002',
        title: 'Thesis Hard-Binding & Spiral Project Printing Hub',
        tagline: '15-Minute Express Golden Embossed Hardcover Binding for Final Year Projects!',
        description: 'Complete project documentation printing, glossy color charts, and university format verification.',
        advertiserName: 'Shree Ganesh Xerox & Project Hub (Campus Shop No. 4)',
        contactPhone: '+91 94250 12345',
        bannerBadge: 'CAMPUS UTILITY',
        bgGradient: 'from-emerald-950 via-slate-900 to-teal-950',
        accentColor: 'emerald',
        ctaText: 'Visit Shop #4 (Utility Complex)',
        durationSeconds: 8,
        isActive: true,
        order: 2,
      },
      {
        id: 'AD-003',
        title: 'Advertise Your Brand on this 16" Touch Kiosk!',
        tagline: 'Reach 5,000+ Engineering & Management Students Daily Right At The Printer!',
        description: 'High visibility banner spots for local food joints, book stores, coaching classes & events.',
        advertiserName: 'College Any Time Print (ATP) Media Network',
        contactPhone: '+91 99999 99999',
        contactEmail: 'domendrakumarmadhukar20@gmail.com',
        bannerBadge: 'ADVERTISE HERE',
        bgGradient: 'from-amber-950 via-slate-900 to-rose-950',
        accentColor: 'amber',
        ctaText: 'Contact Kiosk Admin Desk',
        durationSeconds: 8,
        isActive: true,
        order: 3,
      },
      {
        id: 'AD-004',
        title: 'Campus Cafeteria: Hot Coffee & Fresh Snacks!',
        tagline: 'Show your College Print Receipt & Get 15% OFF on Espresso & Sandwiches!',
        description: 'Relax, study and recharge with free high-speed campus WiFi and study tables.',
        advertiserName: 'The Hangout Cafe • Library Block Ground Floor',
        contactPhone: '+91 98111 22233',
        bannerBadge: 'STUDENT PERK',
        bgGradient: 'from-purple-950 via-slate-900 to-fuchsia-950',
        accentColor: 'purple',
        ctaText: 'Ground Floor, Library Wing',
        durationSeconds: 8,
        isActive: true,
        order: 4,
      },
    ];

    // Add initial audit log
    this.logAudit({
      eventType: 'SYSTEM_BOOT',
      actor: 'SYSTEM',
      details: 'ATP Print Cloud Server initialized with HP LaserJet Pro MFP M126nw profiles.',
    });
  }

  logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const entry: AuditLog = {
      id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.auditLogs.unshift(entry);
    // keep latest 500 logs
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  getPricingForMachine(machineId: string): PricingRule {
    const machine = this.machines.get(machineId);
    if (machine) {
      // Check for machine specific rule first
      for (const rule of this.pricingRules.values()) {
        if (rule.machineId === machineId) return rule;
      }
      // Check for college rule
      for (const rule of this.pricingRules.values()) {
        if (rule.collegeId === machine.collegeId) return rule;
      }
    }
    // Fallback default
    return {
      id: 'PR-FALLBACK',
      collegeId: 'DEFAULT',
      paperSize: 'A4',
      bwSingleSideRate: 2.0,
      bwDoubleSideRate: 3.0,
      colorSingleSideRate: 10.0,
      colorDoubleSideRate: 18.0,
      baseServiceFee: 0.0,
      maxCopies: 10,
      maxPages: 100,
    };
  }

  refillMachinePaper(params: {
    machineId: string;
    sheetsAdded: number;
    operatorName?: string;
    paperBrand?: string;
    notes?: string;
    resetTray?: boolean;
  }): { success: boolean; log?: PaperRefillLog; machine?: Machine; error?: string } {
    const machine = this.machines.get(params.machineId);
    if (!machine) return { success: false, error: 'Machine not found' };

    const prevSheets = machine.paperSheetsRemaining || 0;
    const added = Math.max(1, Number(params.sheetsAdded) || 1);
    const newTotal = params.resetTray ? added : prevSheets + added;

    machine.paperSheetsRemaining = newTotal;
    machine.paperTrayCapacity = Math.max(machine.paperTrayCapacity || 500, newTotal);
    machine.outOfPaper = false;
    machine.lastPaperRefillDate = new Date().toISOString();
    machine.paperLevelPercent = Math.min(
      100,
      Math.round((machine.paperSheetsRemaining / machine.paperTrayCapacity) * 100)
    );

    const logEntry: PaperRefillLog = {
      id: 'REFILL-' + Date.now(),
      timestamp: new Date().toISOString(),
      machineId: machine.id,
      machineName: machine.name,
      location: machine.location,
      collegeId: machine.collegeId,
      sheetsAdded: added,
      previousSheets: prevSheets,
      newTotalSheets: newTotal,
      operatorName: params.operatorName || 'Admin Operator',
      paperBrand: params.paperBrand || 'JK Copier A4 75 GSM',
      notes: params.notes || `Loaded ${added} sheets into tray.`,
    };

    this.paperRefillLogs.unshift(logEntry);

    this.logAudit({
      eventType: 'PAPER_REFILL',
      actor: params.operatorName || 'OPERATOR',
      machineId: machine.id,
      details: `Loaded ${added} sheets at "${machine.location}". Previous: ${prevSheets} ➔ New: ${newTotal} sheets.`,
    });

    return { success: true, log: logEntry, machine };
  }

  consumePaper(machineId: string, sheetsUsed: number) {
    const machine = this.machines.get(machineId);
    if (!machine) return;
    const used = Math.max(1, sheetsUsed);
    machine.paperSheetsRemaining = Math.max(0, (machine.paperSheetsRemaining || 0) - used);
    machine.totalSheetsPrintedLifetime = (machine.totalSheetsPrintedLifetime || 0) + used;
    if (machine.paperSheetsRemaining <= 0) {
      machine.outOfPaper = true;
      machine.paperLevelPercent = 0;
    } else {
      machine.paperLevelPercent = Math.min(
        100,
        Math.round((machine.paperSheetsRemaining / Math.max(1, machine.paperTrayCapacity || 500)) * 100)
      );
    }
  }

  getAdvertisements(onlyActive = true): Advertisement[] {
    const list = onlyActive ? this.advertisements.filter((a) => a.isActive) : [...this.advertisements];
    return list.sort((a, b) => a.order - b.order);
  }

  addAdvertisement(ad: Omit<Advertisement, 'id'>): Advertisement {
    const newAd: Advertisement = {
      ...ad,
      id: 'AD-' + Date.now().toString(36).toUpperCase(),
    };
    this.advertisements.push(newAd);
    this.logAudit({
      eventType: 'AD_CREATED',
      actor: 'ADMIN',
      details: `Created advertisement: "${newAd.title}" (${newAd.advertiserName})`,
    });
    return newAd;
  }

  updateAdvertisement(id: string, updates: Partial<Advertisement>): Advertisement | null {
    const idx = this.advertisements.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.advertisements[idx] = { ...this.advertisements[idx], ...updates };
    this.logAudit({
      eventType: 'AD_UPDATED',
      actor: 'ADMIN',
      details: `Updated advertisement "${this.advertisements[idx].title}"`,
    });
    return this.advertisements[idx];
  }

  deleteAdvertisement(id: string): boolean {
    const idx = this.advertisements.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    const removed = this.advertisements.splice(idx, 1)[0];
    this.logAudit({
      eventType: 'AD_DELETED',
      actor: 'ADMIN',
      details: `Deleted advertisement "${removed.title}"`,
    });
    return true;
  }

  getKioskDisplaySettings(): KioskDisplaySettings {
    return { ...this.kioskDisplaySettings };
  }

  updateKioskDisplaySettings(updates: Partial<KioskDisplaySettings>): KioskDisplaySettings {
    this.kioskDisplaySettings = { ...this.kioskDisplaySettings, ...updates };
    this.logAudit({
      eventType: 'KIOSK_SETTINGS_UPDATED',
      actor: 'ADMIN',
      details: `Updated 16" Kiosk Display settings. Screensaver timeout: ${this.kioskDisplaySettings.screensaverIdleSeconds}s`,
    });
    return this.kioskDisplaySettings;
  }
}

export const db = new Database();
