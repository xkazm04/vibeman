/**
 * Fleet Health & Types
 * Pure functions and type definitions for fleet device health monitoring
 */

/**
 * Command types that can be dispatched to fleet devices
 */
export type FleetCommandType =
  | 'healthcheck'
  | 'ping'
  | 'status_request'
  | 'batch_start'
  | 'batch_stop'
  | 'sync_config'
  | 'restart_session';

/**
 * Device filter criteria
 */
export interface DeviceFilter {
  status?: Array<'online' | 'offline' | 'busy' | 'idle'>;
  deviceType?: Array<'desktop' | 'emulator'>;
  tags?: string[];
  minAvailableSlots?: number;
  excludeDeviceIds?: string[];
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: 'latency' | 'sessions' | 'health_score';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Device group for batch operations
 */
export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  filter?: DeviceFilter;
  deviceIds?: string[];
  alertThresholds?: AlertThreshold[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Health metrics for a device
 */
export interface DeviceHealthMetrics {
  deviceId: string;
  timestamp: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  activeSessions: number;
  maxSessions: number;
  latencyMs: number | null;
  healthScore: number; // 0-100
  cpuUsage?: number;
  memoryUsage?: number;
  lastCommandAt?: string;
  consecutiveFailures: number;
}

/**
 * Health history entry
 */
export interface HealthHistoryEntry {
  timestamp: string;
  healthScore: number;
  status: string;
  latencyMs: number | null;
  activeSessions: number;
}

/**
 * Calculate health score for a device (pure function)
 */
export function calculateHealthScore(metrics: {
  status: string;
  latencyMs: number | null;
  activeSessions: number;
  maxSessions: number;
  consecutiveFailures: number;
}): number {
  let score = 100;

  // Deduct for status
  if (metrics.status === 'offline') {
    score -= 50;
  } else if (metrics.status === 'busy') {
    score -= 10;
  }

  // Deduct for latency
  if (metrics.latencyMs !== null) {
    if (metrics.latencyMs > 500) score -= 30;
    else if (metrics.latencyMs > 200) score -= 20;
    else if (metrics.latencyMs > 100) score -= 10;
  }

  // Deduct for session utilization (too high)
  const utilization = metrics.activeSessions / metrics.maxSessions;
  if (utilization >= 1) score -= 20;
  else if (utilization >= 0.75) score -= 10;

  // Deduct for consecutive failures
  score -= Math.min(40, metrics.consecutiveFailures * 10);

  return Math.max(0, Math.min(100, score));
}
