/**
 * TaskRunner Configuration
 *
 * Single source of truth for all tunable constants in the TaskRunner pipeline.
 * Each value reads from a NEXT_PUBLIC_ environment variable with a sensible default,
 * so operators can customize concurrency, polling frequency, and timeouts without
 * forking the codebase.
 *
 * Environment variables (all optional):
 *   NEXT_PUBLIC_TR_SESSION_COUNT           - Number of concurrent CLI sessions (default: 4)
 *   NEXT_PUBLIC_TR_BATCH_POLL_INTERVAL_MS  - Remote batch poll interval ms (default: 10000)
 *   NEXT_PUBLIC_TR_SSE_FALLBACK_INTERVAL_MS - SSE fallback poll interval ms (default: 30000)
 *   NEXT_PUBLIC_TR_DEFAULT_POLL_INTERVAL_MS - Default polling interval ms (default: 10000)
 */

import type { CLISessionId } from '@/components/cli/store/cliSessionStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envInt(key: string, defaultVal: number): number {
  if (typeof process === 'undefined') return defaultVal;
  const val = process.env[key];
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SESSION_COUNT = envInt('NEXT_PUBLIC_TR_SESSION_COUNT', 4);

/** Ordered list of CLI session IDs used for task distribution. */
export const SESSION_IDS: CLISessionId[] = Array.from(
  { length: SESSION_COUNT },
  (_, i) => `cliSession${i + 1}` as CLISessionId,
);

/** Remote batch polling interval (used by useRemoteTaskRunner). */
export const BATCH_POLL_INTERVAL_MS = envInt('NEXT_PUBLIC_TR_BATCH_POLL_INTERVAL_MS', 10_000);

/** Fallback polling interval when the SSE connection drops. */
export const SSE_FALLBACK_INTERVAL_MS = envInt('NEXT_PUBLIC_TR_SSE_FALLBACK_INTERVAL_MS', 30_000);

/** Default polling interval for task status checks. */
export const DEFAULT_POLL_INTERVAL_MS = envInt('NEXT_PUBLIC_TR_DEFAULT_POLL_INTERVAL_MS', 10_000);

/** Aggregated config object — convenient for passing to hooks or components. */
export interface TaskRunnerConfig {
  sessionIds: CLISessionId[];
  batchPollIntervalMs: number;
  sseFallbackIntervalMs: number;
  defaultPollIntervalMs: number;
}

export const TASK_RUNNER_CONFIG: TaskRunnerConfig = {
  sessionIds: SESSION_IDS,
  batchPollIntervalMs: BATCH_POLL_INTERVAL_MS,
  sseFallbackIntervalMs: SSE_FALLBACK_INTERVAL_MS,
  defaultPollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
};
