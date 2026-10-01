/**
 * Pricing & Page Selection Logic for ATP System
 * Handles strict server-side calculation, range parsing, and duplex formula.
 */

import { PricingRule } from './db.js';

export interface PageSelectionResult {
  valid: boolean;
  selectedPagesList: number[];
  effectivePageCount: number;
  error?: string;
}

/**
 * Parses user page range input such as "all", "1-5", "1, 3, 5-7", "2"
 * Returns list of 1-indexed pages and total count
 */
export function parsePageSelection(selection: string, totalDocumentPages: number): PageSelectionResult {
  const clean = (selection || 'all').trim().toLowerCase();

  if (clean === 'all' || clean === '') {
    const pages = Array.from({ length: totalDocumentPages }, (_, i) => i + 1);
    return {
      valid: true,
      selectedPagesList: pages,
      effectivePageCount: totalDocumentPages,
    };
  }

  const parts = clean.split(',');
  const pageSet = new Set<number>();

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return {
          valid: false,
          selectedPagesList: [],
          effectivePageCount: 0,
          error: `Invalid range format: "${part}". Must be e.g. "1-5".`,
        };
      }

      if (start > totalDocumentPages) {
        return {
          valid: false,
          selectedPagesList: [],
          effectivePageCount: 0,
          error: `Start page ${start} exceeds document page count (${totalDocumentPages}).`,
        };
      }

      const cappedEnd = Math.min(end, totalDocumentPages);
      for (let p = start; p <= cappedEnd; p++) {
        pageSet.add(p);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return {
          valid: false,
          selectedPagesList: [],
          effectivePageCount: 0,
          error: `Invalid page number: "${part}".`,
        };
      }
      if (pageNum > totalDocumentPages) {
        return {
          valid: false,
          selectedPagesList: [],
          effectivePageCount: 0,
          error: `Page number ${pageNum} exceeds document page count (${totalDocumentPages}).`,
        };
      }
      pageSet.add(pageNum);
    }
  }

  const sortedPages = Array.from(pageSet).sort((a, b) => a - b);
  if (sortedPages.length === 0) {
    return {
      valid: false,
      selectedPagesList: [],
      effectivePageCount: 0,
      error: 'No valid pages selected.',
    };
  }

  return {
    valid: true,
    selectedPagesList: sortedPages,
    effectivePageCount: sortedPages.length,
  };
}

export interface PriceCalculationParams {
  rule: PricingRule;
  effectivePages: number;
  copies: number;
  paperSize: 'A4' | 'A3' | 'Legal' | 'Letter';
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
}

export interface PriceCalculationBreakdown {
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

/**
 * Calculates print job cost server-side based on college/machine pricing rule
 */
export function calculatePrintPrice(params: PriceCalculationParams): PriceCalculationBreakdown {
  const { rule, effectivePages, copies, colorMode, duplexMode, paperSize } = params;

  let sheetsPerCopy = effectivePages;
  let basePrintCost = 0;
  let rateDescription = '';

  if (duplexMode === 'DOUBLE') {
    // 2 pages per 1 sheet
    sheetsPerCopy = Math.ceil(effectivePages / 2);
    const ratePerSheet = colorMode === 'COLOR' ? rule.colorDoubleSideRate : rule.bwDoubleSideRate;
    basePrintCost = sheetsPerCopy * copies * ratePerSheet;
    rateDescription = `₹${ratePerSheet.toFixed(2)}/sheet (Double sided ${colorMode})`;
  } else {
    // Single sided = 1 sheet per page
    sheetsPerCopy = effectivePages;
    const ratePerPage = colorMode === 'COLOR' ? rule.colorSingleSideRate : rule.bwSingleSideRate;
    basePrintCost = sheetsPerCopy * copies * ratePerPage;
    rateDescription = `₹${ratePerPage.toFixed(2)}/page (Single sided ${colorMode})`;
  }

  const serviceFee = rule.baseServiceFee || 0;
  const totalAmount = Math.max(1, Math.round((basePrintCost + serviceFee) * 100) / 100);

  return {
    effectivePages,
    copies,
    colorMode,
    duplexMode,
    paperSize,
    sheetsPerCopy,
    totalSheets: sheetsPerCopy * copies,
    rateDescription,
    basePrintCost,
    serviceFee,
    totalAmount,
  };
}
