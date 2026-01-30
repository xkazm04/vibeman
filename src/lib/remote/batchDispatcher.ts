/**
 * Batch Dispatcher
 * Dispatches commands to multiple devices in the mesh network
 */

import type { RemoteDevice } from './deviceTypes';

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
 * Command to dispatch to a device
 */
export interface FleetCommand {
  commandType: FleetCommandType;
  payload?: Record<string, unknown>;
}

/**
 * Result of dispatching a command to a single device
 */
export interface DispatchResult {
  deviceId: string;
  deviceName: string;
  success: boolean;
  commandId?: string;
  error?: string;
  timestamp: string;
  latencyMs?: number;
}

/**
 * Batch dispatch result
 */
export interface BatchDispatchResult {
  totalDevices: number;
  successful: number;
  failed: number;
  results: DispatchResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

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
 * Filter devices based on criteria
 */
export function filterDevices(
  devices: RemoteDevice[],
  filter: DeviceFilter
): RemoteDevice[] {
  return devices.filter((device) => {
    // Status filter
    if (filter.status && !filter.status.includes(device.status)) {
      return false;
    }

    // Device type filter
    if (filter.deviceType && !filter.deviceType.includes(device.device_type)) {
      return false;
    }

    // Min available slots
    if (filter.minAvailableSlots !== undefined) {
      const availableSlots = (device.capabilities?.session_slots || 4) - device.active_sessions;
      if (availableSlots < filter.minAvailableSlots) {
        return false;
      }
    }

    // Exclude specific devices
    if (filter.excludeDeviceIds?.includes(device.device_id)) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate health score for a device
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

/**
 * Check if an alert threshold is breached
 */
export function checkAlertThreshold(
  threshold: AlertThreshold,
  metrics: DeviceHealthMetrics
): boolean {
  let value: number;

  switch (threshold.metric) {
    case 'latency':
      value = metrics.latencyMs ?? 0;
      break;
    case 'sessions':
      value = metrics.activeSessions;
      break;
    case 'health_score':
      value = metrics.healthScore;
      break;
    default:
      return false;
  }

  switch (threshold.operator) {
    case 'gt':
      return value > threshold.value;
    case 'lt':
      return value < threshold.value;
    case 'eq':
      return value === threshold.value;
    case 'gte':
      return value >= threshold.value;
    case 'lte':
      return value <= threshold.value;
    default:
      return false;
  }
}

/**
 * Batch Dispatcher class for managing fleet command dispatch
 */
export class BatchDispatcher {
  private pendingCommands: Map<string, { deviceId: string; commandId: string; sentAt: number }> = new Map();
  private dispatchHistory: BatchDispatchResult[] = [];

  /**
   * Dispatch a command to a single device
   */
  async dispatchToDevice(
    device: RemoteDevice,
    command: FleetCommand,
    sourceDeviceId: string,
    sourceDeviceName: string
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: command.commandType,
          target_device_id: device.device_id,
          source_device_id: sourceDeviceId,
          source_device_name: sourceDeviceName,
          payload: command.payload,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.text();
        return {
          deviceId: device.device_id,
          deviceName: device.device_name,
          success: false,
          error: error || 'Failed to dispatch command',
          timestamp,
          latencyMs,
        };
      }

      const data = await response.json();

      if (data.success && data.command_id) {
        this.pendingCommands.set(data.command_id, {
          deviceId: device.device_id,
          commandId: data.command_id,
          sentAt: startTime,
        });
      }

      return {
        deviceId: device.device_id,
        deviceName: device.device_name,
        success: data.success,
        commandId: data.command_id,
        error: data.error,
        timestamp,
        latencyMs,
      };
    } catch (error) {
      return {
        deviceId: device.device_id,
        deviceName: device.device_name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Dispatch a command to multiple devices
   */
  async dispatchToDevices(
    devices: RemoteDevice[],
    command: FleetCommand,
    sourceDeviceId: string,
    sourceDeviceName: string,
    options?: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<BatchDispatchResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const results: DispatchResult[] = [];
    const concurrency = options?.concurrency ?? 5;

    // Process in batches for controlled concurrency
    for (let i = 0; i < devices.length; i += concurrency) {
      const batch = devices.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((device) =>
          this.dispatchToDevice(device, command, sourceDeviceId, sourceDeviceName)
        )
      );
      results.push(...batchResults);
      options?.onProgress?.(results.length, devices.length);
    }

    const completedAt = new Date().toISOString();
    const successful = results.filter((r) => r.success).length;

    const batchResult: BatchDispatchResult = {
      totalDevices: devices.length,
      successful,
      failed: devices.length - successful,
      results,
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
    };

    // Store in history (keep last 50)
    this.dispatchHistory.unshift(batchResult);
    if (this.dispatchHistory.length > 50) {
      this.dispatchHistory.pop();
    }

    return batchResult;
  }

  /**
   * Dispatch to devices matching a filter
   */
  async dispatchToFiltered(
    allDevices: RemoteDevice[],
    filter: DeviceFilter,
    command: FleetCommand,
    sourceDeviceId: string,
    sourceDeviceName: string,
    options?: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<BatchDispatchResult> {
    const filteredDevices = filterDevices(allDevices, filter);
    return this.dispatchToDevices(filteredDevices, command, sourceDeviceId, sourceDeviceName, options);
  }

  /**
   * Dispatch to a device group
   */
  async dispatchToGroup(
    group: DeviceGroup,
    allDevices: RemoteDevice[],
    command: FleetCommand,
    sourceDeviceId: string,
    sourceDeviceName: string,
    options?: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<BatchDispatchResult> {
    let targetDevices: RemoteDevice[];

    if (group.deviceIds && group.deviceIds.length > 0) {
      // Use explicit device IDs
      targetDevices = allDevices.filter((d) => group.deviceIds!.includes(d.device_id));
    } else if (group.filter) {
      // Use filter
      targetDevices = filterDevices(allDevices, group.filter);
    } else {
      // No filter or IDs - use all
      targetDevices = allDevices;
    }

    return this.dispatchToDevices(targetDevices, command, sourceDeviceId, sourceDeviceName, options);
  }

  /**
   * Get dispatch history
   */
  getHistory(): BatchDispatchResult[] {
    return [...this.dispatchHistory];
  }

  /**
   * Clear pending commands
   */
  clearPending(): void {
    this.pendingCommands.clear();
  }

  /**
   * Get pending command count
   */
  getPendingCount(): number {
    return this.pendingCommands.size;
  }
}

/**
 * Singleton batch dispatcher instance
 */
let dispatcherInstance: BatchDispatcher | null = null;

export function getBatchDispatcher(): BatchDispatcher {
  if (!dispatcherInstance) {
    dispatcherInstance = new BatchDispatcher();
  }
  return dispatcherInstance;
}

/**
 * Quick dispatch to all online devices
 */
export async function dispatchToAllOnline(
  devices: RemoteDevice[],
  command: FleetCommand,
  sourceDeviceId: string,
  sourceDeviceName: string
): Promise<BatchDispatchResult> {
  const dispatcher = getBatchDispatcher();
  return dispatcher.dispatchToFiltered(
    devices,
    { status: ['online', 'idle'] },
    command,
    sourceDeviceId,
    sourceDeviceName
  );
}

/**
 * Quick health check of all devices
 */
export async function healthCheckAllDevices(
  devices: RemoteDevice[],
  sourceDeviceId: string,
  sourceDeviceName: string
): Promise<BatchDispatchResult> {
  return dispatchToAllOnline(
    devices,
    { commandType: 'healthcheck' },
    sourceDeviceId,
    sourceDeviceName
  );
}
