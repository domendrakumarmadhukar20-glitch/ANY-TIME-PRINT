/**
 * Payment Verification & Webhook Engine
 * Enforces server-side signature verification (HMAC SHA-256) and strict duplication protection.
 */

import crypto from 'crypto';
import { db, PrintJob } from './db.js';

export interface VerifyWebhookResult {
  valid: boolean;
  job?: PrintJob;
  idempotentIgnored?: boolean;
  error?: string;
}

export function generatePaymentOrderId(jobId: string): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString('hex');
  return `order_atp_${ts}_${rand}`;
}

export function generateSignature(orderId: string, paymentId: string, secret: string): string {
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
  rawPayload?: any
): boolean {
  if (!signature || !secret) return false;

  // 1. Check standard Razorpay Checkout signature: HMAC(order_id|payment_id)
  if (orderId && paymentId) {
    const expected = generateSignature(orderId, paymentId, secret);
    try {
      if (crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) {
        return true;
      }
    } catch {
      // continue
    }
  }

  // 2. Check Razorpay Webhook Raw Body HMAC signature if payload is provided
  if (rawPayload) {
    try {
      const bodyStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
      const bodyExpected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(bodyExpected, 'utf8'))) {
        return true;
      }
    } catch {
      // continue
    }
  }

  return false;
}

/**
 * Creates an authentic Razorpay Order via Razorpay REST API
 */
export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receiptId: string;
  notes?: Record<string, string>;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const { razorpayKeyId, razorpayKeySecret, razorpayEnabled } = db.settings;
  if (!razorpayEnabled || !razorpayKeyId || !razorpayKeySecret) {
    return { success: false, error: 'Razorpay keys not configured' };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const amountInPaise = Math.round(params.amountInRupees * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: params.receiptId,
        notes: params.notes || {},
      }),
    });

    if (!response.ok) {
      const errData: any = await response.json();
      return { success: false, error: errData.error?.description || 'Razorpay order creation failed' };
    }

    const data: any = await response.json();
    return { success: true, orderId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Razorpay API network error' };
  }
}

/**
 * Validates Razorpay credentials by testing API connectivity
 */
export async function testRazorpayConnection(
  keyId: string,
  keySecret: string
): Promise<{ success: boolean; message: string; isLive?: boolean }> {
  if (!keyId || !keySecret) {
    return { success: false, message: 'Key ID और Key Secret दोनों दर्ज करना आवश्यक है।' };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: { 'Authorization': authHeader },
    });

    const isLive = keyId.startsWith('rzp_live');

    if (res.ok) {
      return {
        success: true,
        isLive,
        message: `सफलतापूर्वक कनेक्ट हो गया! आपका ${isLive ? 'LIVE (असली मर्चेंट)' : 'TEST (सैंडबॉक्स)'} Razorpay खाता सत्यापित है।`,
      };
    } else {
      const err: any = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error?.description || 'गलत API Keys या प्रमाणीकरण विफल। कृपया Razorpay Dashboard से सही Keys चेक करें।',
      };
    }
  } catch (e: any) {
    return { success: false, message: 'Razorpay सर्वर से कनेक्ट नहीं हो सका: ' + e.message };
  }
}

/**
 * Handles incoming payment webhook or verified gateway callback.
 * Guaranteed idempotent: Duplicate calls will NOT double-queue or duplicate print.
 */
export function processVerifiedPayment(params: {
  paymentOrderId: string;
  paymentId: string;
  amount: number;
  signature: string;
  method?: string;
  rawPayload?: any;
  clientIp?: string;
}): VerifyWebhookResult {
  const { paymentOrderId, paymentId, amount, signature, method, rawPayload, clientIp } = params;

  // 1. Verify HMAC SHA-256 signature against system webhook secret
  const secret = db.settings.paymentWebhookSecret;
  const isValidSignature = verifyWebhookSignature(paymentOrderId, paymentId, signature, secret);

  // Find job associated with this payment order ID
  let targetJob: PrintJob | undefined;
  for (const job of db.printJobs.values()) {
    if (job.paymentOrderId === paymentOrderId) {
      targetJob = job;
      break;
    }
  }

  // 2. Log webhook receipt
  const webhookLogId = 'WH-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex');
  
  if (!isValidSignature) {
    db.paymentWebhooks.unshift({
      id: webhookLogId,
      receivedAt: new Date().toISOString(),
      event: 'payment.failed_signature',
      paymentOrderId,
      paymentId,
      amount,
      signature,
      isValidSignature: false,
      processed: false,
      idempotentIgnored: false,
      rawPayload,
    });

    db.logAudit({
      eventType: 'PAYMENT_SECURITY_ALERT',
      actor: 'WEBHOOK_GATEWAY',
      jobId: targetJob?.jobId,
      machineId: targetJob?.machineId,
      details: `REJECTED invalid payment webhook signature for order ${paymentOrderId}`,
      ipAddress: clientIp,
    });

    return {
      valid: false,
      error: 'Invalid webhook HMAC SHA-256 signature. Payment authorization rejected.',
    };
  }

  if (!targetJob) {
    db.paymentWebhooks.unshift({
      id: webhookLogId,
      receivedAt: new Date().toISOString(),
      event: 'payment.order_not_found',
      paymentOrderId,
      paymentId,
      amount,
      signature,
      isValidSignature: true,
      processed: false,
      idempotentIgnored: false,
      rawPayload,
    });

    return {
      valid: false,
      error: `Print job with order ID ${paymentOrderId} not found in database.`,
    };
  }

  // 3. IDEMPOTENCY CHECK (Rule #13: Duplicate Webhook Protection)
  // If this payment has already been verified or job is already queued/printed, safely ignore
  if (
    targetJob.status === 'PAYMENT_VERIFIED' ||
    targetJob.status === 'QUEUED' ||
    targetJob.status === 'PRINTING' ||
    targetJob.status === 'PRINTED' ||
    targetJob.status === 'COMPLETED'
  ) {
    db.paymentWebhooks.unshift({
      id: webhookLogId,
      receivedAt: new Date().toISOString(),
      event: 'payment.duplicate_ignored',
      paymentOrderId,
      paymentId,
      amount,
      signature,
      isValidSignature: true,
      processed: true,
      idempotentIgnored: true,
      rawPayload,
    });

    db.logAudit({
      eventType: 'PAYMENT_IDEMPOTENT_IGNORED',
      actor: 'WEBHOOK_GATEWAY',
      jobId: targetJob.jobId,
      machineId: targetJob.machineId,
      details: `Idempotent duplicate webhook ignored for job ${targetJob.jobId}. Status already ${targetJob.status}.`,
      ipAddress: clientIp,
    });

    return {
      valid: true,
      job: targetJob,
      idempotentIgnored: true,
    };
  }

  // 4. Authorize print job! Transition PAYMENT_PENDING -> PAYMENT_VERIFIED -> QUEUED
  targetJob.paymentId = paymentId;
  targetJob.paymentMethod = method || 'UPI_GATEWAY';
  targetJob.paymentVerifiedAt = new Date().toISOString();
  targetJob.status = 'QUEUED';
  targetJob.queuedAt = new Date().toISOString();

  db.paymentWebhooks.unshift({
    id: webhookLogId,
    receivedAt: new Date().toISOString(),
    event: 'payment.authorized',
    paymentOrderId,
    paymentId,
    amount,
    signature,
    isValidSignature: true,
    processed: true,
    idempotentIgnored: false,
    rawPayload,
  });

  db.logAudit({
    eventType: 'PAYMENT_VERIFIED_PRINT_QUEUED',
    actor: 'PAYMENT_GATEWAY',
    jobId: targetJob.jobId,
    machineId: targetJob.machineId,
    details: `Payment of ₹${amount} verified via webhook for Job ${targetJob.jobId}. Authorized & queued for HP LaserJet Pro MFP M126nw.`,
    ipAddress: clientIp,
  });

  return {
    valid: true,
    job: targetJob,
    idempotentIgnored: false,
  };
}
