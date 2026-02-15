/**
 * Rate Limiter - Token Bucket Algorithm
 *
 * In-memory rate limiting for API routes with per-IP tracking.
 * Uses token bucket algorithm: each bucket has a capacity and refills at a steady rate.
 * When a request arrives, a token is consumed. If no tokens remain, the request is rejected.
 *
 * Provides tiered rate limit presets:
 * - standard: General API routes (60 req/min)
 * - strict: Auth-sensitive or write-heavy routes (20 req/min)
 * - expensive: AI/LLM operations, batch execution (5 req/min)
 *
 * Usage:
 *   // As middleware wrapper (recommended):
 *   export const POST = withRateLimit(handlePost, '/api/goals', 'standard');
 *
 *   // Inline check:
 *   const limited = checkRateLimit(request, '/api/batch', 'expensive');
 *   if (limited) return limited;
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiErrorCode, createApiErrorResponse } from '@/lib/api-errors';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface RateLimitConfig {
  /** Maximum tokens (requests) in the bucket */
  capacity: number;
  /** Tokens added per second (refill rate) */
  refillRate: number;
  /** Window label for Retry-After header calculation */
  windowLabel: string;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/** Preset rate limit tiers */
export const RATE_LIMIT_PRESETS = {
  /** General API routes: 60 requests/minute */
  standard: {
    capacity: 60,
    refillRate: 1,          // 1 token/sec = 60/min
    windowLabel: '60/min',
  },
  /** Write-heavy or sensitive routes: 20 requests/minute */
  strict: {
    capacity: 20,
    refillRate: 0.333,      // ~20/min
    windowLabel: '20/min',
  },
  /** Expensive operations (AI, batch execution): 5 requests/minute */
  expensive: {
    capacity: 5,
    refillRate: 0.083,      // ~5/min
    windowLabel: '5/min',
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitTier = keyof typeof RATE_LIMIT_PRESETS;

// ============================================================================
// TOKEN BUCKET STORE (in-memory, per-process)
// ============================================================================

/**
 * Store structure: Map<compositeKey, TokenBucket>
 * compositeKey = `${tier}:${clientKey}` where clientKey is IP or identifier
 */
const buckets = new Map<string, TokenBucket>();

/** Cleanup interval: remove stale buckets every 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
/** Buckets idle for >10 minutes are considered stale */
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > STALE_THRESHOLD_MS) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent process exit
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ============================================================================
// CORE ALGORITHM
// ============================================================================

/**
 * Extract client identifier from request.
 * Uses X-Forwarded-For, X-Real-IP, or falls back to 'localhost'.
 */
function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'localhost';
}

/**
 * Attempt to consume a token from the bucket.
 * Returns { allowed, remaining, retryAfterSec } indicating whether the request should proceed.
 */
function consumeToken(
  bucketKey: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  ensureCleanupTimer();

  const now = Date.now();
  let bucket = buckets.get(bucketKey);

  if (!bucket) {
    // First request: create a full bucket, consume one token
    bucket = { tokens: config.capacity - 1, lastRefill: now };
    buckets.set(bucketKey, bucket);
    return { allowed: true, remaining: config.capacity - 1, retryAfterSec: 0 };
  }

  // Refill tokens based on elapsed time
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  const refilled = elapsedSec * config.refillRate;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + refilled);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
  }

  // No tokens available — calculate retry-after
  const deficit = 1 - bucket.tokens;
  const retryAfterSec = Math.ceil(deficit / config.refillRate);
  return { allowed: false, remaining: 0, retryAfterSec };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Inline rate limit check. Returns a 429 NextResponse if rate-limited, or null if allowed.
 *
 * @example
 *   const limited = checkRateLimit(request, '/api/batch', 'expensive');
 *   if (limited) return limited;
 */
export function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  tier: RateLimitTier | RateLimitConfig = 'standard'
): NextResponse | null {
  const config = typeof tier === 'string' ? RATE_LIMIT_PRESETS[tier] : tier;
  const clientKey = getClientKey(request);
  const bucketKey = `${typeof tier === 'string' ? tier : 'custom'}:${endpoint}:${clientKey}`;

  const result = consumeToken(bucketKey, config);

  if (result.allowed) {
    return null; // Request allowed
  }

  // Rate limited — return 429 with standard headers
  const response = createApiErrorResponse(
    ApiErrorCode.RATE_LIMITED,
    `Rate limit exceeded (${config.windowLabel}). Try again in ${result.retryAfterSec}s.`,
    {
      details: {
        retryAfter: result.retryAfterSec,
        limit: config.windowLabel,
        endpoint,
      },
      logError: false,
    }
  );

  response.headers.set('Retry-After', String(result.retryAfterSec));
  response.headers.set('X-RateLimit-Limit', String(config.capacity));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + result.retryAfterSec));

  return response;
}

/**
 * Rate limiting middleware wrapper.
 * Composes with withObservability — place it inside:
 *
 *   export const POST = withObservability(
 *     withRateLimit(handlePost, '/api/goals', 'standard'),
 *     '/api/goals'
 *   );
 *
 * Or compose with access control:
 *   export const POST = withObservability(
 *     withRateLimit(
 *       withAccessControl(handlePost, '/api/goals'),
 *       '/api/goals', 'strict'
 *     ),
 *     '/api/goals'
 *   );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRateLimit<T extends (request: NextRequest, ...args: any[]) => Promise<NextResponse<any>>>(
  handler: T,
  endpoint: string,
  tier: RateLimitTier = 'standard'
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (request: NextRequest, ...args: any[]) => {
    const limited = checkRateLimit(request, endpoint, tier);
    if (limited) return limited;

    // Add rate limit headers to successful responses too
    const config = RATE_LIMIT_PRESETS[tier];
    const clientKey = getClientKey(request);
    const bucketKey = `${tier}:${endpoint}:${clientKey}`;
    const bucket = buckets.get(bucketKey);

    const response = await handler(request, ...args);

    // Attach informational headers (non-blocking — if response is immutable, skip)
    try {
      response.headers.set('X-RateLimit-Limit', String(config.capacity));
      response.headers.set('X-RateLimit-Remaining', String(bucket ? Math.floor(bucket.tokens) : config.capacity));
    } catch {
      // Some responses may be immutable; silently skip
    }

    return response;
  }) as T;
}

/**
 * Get current bucket status for monitoring/debugging.
 */
export function getRateLimitStatus(): {
  totalBuckets: number;
  buckets: Array<{ key: string; tokens: number; lastRefill: number }>;
} {
  return {
    totalBuckets: buckets.size,
    buckets: Array.from(buckets.entries()).map(([key, b]) => ({
      key,
      tokens: Math.floor(b.tokens),
      lastRefill: b.lastRefill,
    })),
  };
}
