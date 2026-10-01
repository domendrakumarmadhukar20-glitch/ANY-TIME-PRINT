export interface College {
  id: string;
  name: string;
  code: string;
  campus: string;
  city: string;
  contactEmail: string;
}

export interface PricingRule {
  id: string;
  collegeId: string;
  machineId?: string;
  paperSize: 'A4' | 'A3' | 'Legal' | 'Letter';
  bwSingleSideRate: number;
  bwDoubleSideRate: number;
  colorSingleSideRate: number;
  colorDoubleSideRate: number;
  baseServiceFee: number;
  maxCopies: number;
  maxPages: number;
}

export interface Machine {
  id: string;
  collegeId: string;
  collegeName?: string;
  name: string;
  location: string;
  secretToken?: string;
  printerModel: string;
  printerConnection?: 'USB' | 'LAN_WIFI' | 'SPOOLER';
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
  lastHeartbeat: string;
  paperLevelPercent: number;
  paperTrayCapacity?: number;
  paperSheetsAvailable?: number;
  paperSheetsRemaining?: number;
  totalSheetsPrintedLifetime?: number;
  lastPaperRefillDate?: string;
  tonerLevelPercent: number;
  paperJam: boolean;
  outOfPaper: boolean;
  pricing?: PricingRule;
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
  machineName?: string;
  printerModel?: string;
  printerStatus?: string;
  collegeId?: string;
  fileName?: string;
  originalFileName: string;
  fileSize: number;
  fileHash?: string;
  pageCount: number;
  pageSelection: string;
  effectivePages: number;
  copies: number;
  paperSize: 'A4' | 'A3' | 'Legal' | 'Letter';
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
  amount: number;
  calculatedAmount?: number;
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
  createdAt: string;
}

export interface PriceBreakdown {
  effectivePages: number;
  copies: number;
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
  paperSize: string;
  sheetsPerCopy: number;
  totalSheets: number;
  rateDescription: string;
  basePrintCost: number;
  serviceFee: number;
  totalAmount: number;
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

