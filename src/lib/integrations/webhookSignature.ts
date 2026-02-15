/**
 * Webhook Signature Verification
 * Provider-specific HMAC signature validation for inbound webhooks.
 * Prevents spoofed webhook events from being processed.
 */

import * as crypto from 'crypto';

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a GitHub webhook signature (x-hub-signature-256 header).
 * Uses HMAC-SHA256 with timing-safe comparison.
 */
export function verifyGitHubSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing x-hub-signature-256 header' };
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (signatureHeader.length !== expected.length) {
    return { valid: false, error: 'Invalid signature' };
  }

  if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Verify a Slack webhook signature (x-slack-signature header).
 * Slack uses v0=HMAC-SHA256(signing_secret, "v0:timestamp:body").
 * Also validates request timestamp to prevent replay attacks (5 min window).
 */
export function verifySlackSignature(
  payload: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing x-slack-signature header' };
  }
  if (!timestampHeader) {
    return { valid: false, error: 'Missing x-slack-request-timestamp header' };
  }

  // Prevent replay attacks — reject requests older than 5 minutes
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return { valid: false, error: 'Request timestamp too old (possible replay attack)' };
  }

  const sigBaseString = `v0:${timestampHeader}:${payload}`;
  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(sigBaseString).digest('hex');

  if (signatureHeader.length !== expected.length) {
    return { valid: false, error: 'Invalid signature' };
  }

  if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Verify a generic HMAC-SHA256 webhook signature.
 * Supports both "sha256=<hex>" prefixed and raw hex formats.
 * Used for custom webhooks and providers without specialized verification.
 */
export function verifyGenericHmacSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  headerName: string = 'signature'
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { valid: false, error: `Missing ${headerName} header` };
  }

  const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Support both "sha256=<hex>" and raw "<hex>" formats
  const rawSignature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  if (rawSignature.length !== digest.length) {
    return { valid: false, error: 'Invalid signature' };
  }

  if (!crypto.timingSafeEqual(Buffer.from(rawSignature, 'hex'), Buffer.from(digest, 'hex'))) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Provider-specific signature verification dispatch.
 * Returns the appropriate verification result based on provider type.
 */
export function verifyWebhookSignature(
  provider: string,
  payload: string,
  headers: Record<string, string | null>,
  secret: string
): SignatureVerificationResult {
  switch (provider) {
    case 'github':
      return verifyGitHubSignature(
        payload,
        headers['x-hub-signature-256'],
        secret
      );

    case 'slack':
      return verifySlackSignature(
        payload,
        headers['x-slack-signature'],
        headers['x-slack-request-timestamp'],
        secret
      );

    default:
      // Generic: try common signature headers
      const sig =
        headers['x-hub-signature-256'] ||
        headers['x-signature'] ||
        headers['x-webhook-signature'];
      return verifyGenericHmacSignature(payload, sig, secret);
  }
}
