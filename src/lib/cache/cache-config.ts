/**
 * Centralized cache configuration for React Query
 *
 * Inspired by Goat project's unified-cache.ts.
 * Single source of truth for stale times, GC times, and retry logic.
 */

// ── Cache TTL tiers ──────────────────────────────────────────────────────────

export const CACHE_TTL = {
  /** Real-time data: live sessions, active polls */
  EPHEMERAL: 30 * 1000,       // 30s
  /** User-scoped data: selections, preferences */
  SHORT: 60 * 1000,           // 1m
  /** Default for most data: lists, entries, stats */
  STANDARD: 5 * 60 * 1000,    // 5m
  /** Reference/slow-changing data: configs, domains */
  LONG: 15 * 60 * 1000,       // 15m
  /** Static/rarely changing: metadata */
  STATIC: 60 * 60 * 1000,     // 1h
} as const;

// ── Garbage collection times (when to evict unused cache entries) ────────────

export const GC_TIME = {
  EPHEMERAL: 60 * 1000,       // 1m
  SHORT: 2 * 60 * 1000,       // 2m
  STANDARD: 10 * 60 * 1000,   // 10m
  LONG: 30 * 60 * 1000,       // 30m
  STATIC: 2 * 60 * 60 * 1000, // 2h
} as const;

// ── Cache presets ────────────────────────────────────────────────────────────

export type CachePreset = keyof typeof CACHE_PRESETS;

export const CACHE_PRESETS = {
  /** Brain signals, heatmaps, correlations — moderate freshness needed */
  brainData: { staleTime: CACHE_TTL.STANDARD, gcTime: GC_TIME.STANDARD },
  /** Insights, predictions — can be slightly stale */
  brainInsights: { staleTime: CACHE_TTL.STANDARD, gcTime: GC_TIME.STANDARD },
  /** Reflection history — rarely changes */
  reflectionHistory: { staleTime: CACHE_TTL.LONG, gcTime: GC_TIME.LONG },
  /** Knowledge base entries — moderate */
  knowledge: { staleTime: CACHE_TTL.STANDARD, gcTime: GC_TIME.STANDARD },
  /** Active sessions, running tasks — needs freshness */
  sessions: { staleTime: CACHE_TTL.EPHEMERAL, gcTime: GC_TIME.EPHEMERAL },
  /** Ideas, goals — standard */
  ideas: { staleTime: CACHE_TTL.STANDARD, gcTime: GC_TIME.STANDARD },
  /** Project config, metadata — slow-changing */
  config: { staleTime: CACHE_TTL.LONG, gcTime: GC_TIME.LONG },
  /** Context files, groups — standard */
  contexts: { staleTime: CACHE_TTL.STANDARD, gcTime: GC_TIME.STANDARD },
} as const;

// ── Smart retry ──────────────────────────────────────────────────────────────

/** Skip retries for client errors (4xx) — only retry server/network errors */
export function createSmartRetry(maxRetries = 3) {
  return (failureCount: number, error: Error) => {
    if (failureCount >= maxRetries) return false;
    // Don't retry 4xx client errors
    if ('status' in error && typeof (error as { status: number }).status === 'number') {
      const status = (error as { status: number }).status;
      if (status >= 400 && status < 500) return false;
    }
    return true;
  };
}

/** Exponential backoff retry delay */
export function createRetryDelay(baseMs = 1000, maxMs = 30000) {
  return (attemptIndex: number) => Math.min(baseMs * 2 ** attemptIndex, maxMs);
}
