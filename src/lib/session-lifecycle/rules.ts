/**
 * Staleness Rule Presets
 *
 * Common staleness detection rules that subsystems can compose.
 */

import type { BaseSession, StalenessRule } from './types';

/**
 * Session is stale if it's been in a specific status longer than threshold.
 */
export function statusTimeout<T extends BaseSession>(
  name: string,
  status: string,
  thresholdMs: number,
  /** Use createdAt instead of updatedAt for the comparison */
  useCreatedAt = false
): StalenessRule<T> {
  return {
    name,
    isStale: (session, now) => {
      if (session.status !== status) return false;
      const timestamp = useCreatedAt ? session.createdAt : session.updatedAt;
      return now - timestamp > thresholdMs;
    },
  };
}

/**
 * Session is stale if it hasn't received a heartbeat within threshold.
 * Applies to any session in one of the specified statuses.
 */
export function noHeartbeat<T extends BaseSession>(
  name: string,
  statuses: string[],
  thresholdMs: number
): StalenessRule<T> {
  return {
    name,
    isStale: (session, now) => {
      if (!statuses.includes(session.status)) return false;
      return now - session.updatedAt > thresholdMs;
    },
  };
}

/**
 * Session is stale if it exceeds a maximum age, regardless of status.
 * Excludes sessions in the given active statuses.
 */
export function maxAge<T extends BaseSession>(
  name: string,
  maxAgeMs: number,
  excludeStatuses: string[] = []
): StalenessRule<T> {
  return {
    name,
    isStale: (session, now) => {
      if (excludeStatuses.includes(session.status)) return false;
      return now - session.updatedAt > maxAgeMs;
    },
  };
}

// ============================================================================
// TIME HELPERS
// ============================================================================

export const MINUTES = (n: number) => n * 60 * 1000;
export const HOURS = (n: number) => n * 60 * 60 * 1000;
export const DAYS = (n: number) => n * 24 * 60 * 60 * 1000;
