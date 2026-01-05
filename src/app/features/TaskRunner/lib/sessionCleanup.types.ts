/**
 * Session Cleanup Types
 * Used for detecting and cleaning up orphaned Claude Code sessions
 */

export type OrphanReason =
  | 'no_heartbeat'      // Running session with no heartbeat for > 30 minutes
  | 'stale_running'     // Running for too long without progress
  | 'stale_paused'      // Paused for > 48 hours
  | 'stale_pending'     // Pending and never started for > 2 hours
  | 'no_polling';       // Running but not being polled (client disconnected)

export interface OrphanedSession {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'pending';
  lastActivity: Date;
  reason: OrphanReason;
  taskCount: number;
  completedCount: number;
  failedCount: number;
  projectId: string;
  projectPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CleanupStats {
  orphanedCount: number;
  cleanedCount: number;
  lastCleanup: Date | null;
  lastScan: Date | null;
}

export interface SessionHealthCheck {
  sessionId: string;
  isHealthy: boolean;
  lastHeartbeat: Date | null;
  pollingActive: boolean;
  status: string;
}

/**
 * Thresholds for orphan detection (relaxed settings)
 */
export const ORPHAN_THRESHOLDS = {
  /** Running session with no heartbeat for more than this (in minutes) */
  RUNNING_NO_HEARTBEAT_MINUTES: 30,

  /** Paused session for more than this (in hours) */
  PAUSED_STALE_HOURS: 48,

  /** Pending session never started for more than this (in hours) */
  PENDING_STALE_HOURS: 2,

  /** Scan interval for detecting orphans (in minutes) */
  SCAN_INTERVAL_MINUTES: 5,
} as const;

/**
 * API request/response types for cleanup endpoints
 */
export interface DetectOrphansRequest {
  projectId?: string;
}

export interface DetectOrphansResponse {
  orphans: OrphanedSession[];
  stats: CleanupStats;
}

export interface CleanupSessionsRequest {
  action: 'cleanup' | 'cleanup-all';
  sessionIds?: string[];
  projectId?: string;
}

export interface CleanupSessionsResponse {
  success: boolean;
  cleanedCount: number;
  errors?: string[];
}

export interface HeartbeatRequest {
  sessionId: string;
}

export interface HeartbeatResponse {
  success: boolean;
  updatedAt: Date;
}
