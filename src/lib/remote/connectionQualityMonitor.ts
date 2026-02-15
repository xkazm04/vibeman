/**
 * Connection Quality Monitor
 * Tracks latency and connection quality between devices in the mesh network
 */

import type { ConnectionQuality } from './topologyBuilder';
import { latencyToQuality } from './topologyBuilder';

/**
 * Connection metrics for a single device
 */
export interface ConnectionMetrics {
  deviceId: string;
  latencyMs: number | null;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  jitterMs: number | null;
  packetLoss: number;
  quality: ConnectionQuality;
  lastPingAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  pingHistory: PingResult[];
}

/**
 * Single ping result
 */
export interface PingResult {
  timestamp: string;
  latencyMs: number | null;
  success: boolean;
  error?: string;
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  pingIntervalMs: number;
  historySize: number;
  timeoutMs: number;
  failureThreshold: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
  pingIntervalMs: 5000,
  historySize: 20,
  timeoutMs: 3000,
  failureThreshold: 3,
};

/**
 * Connection Quality Monitor
 * Maintains a map of device IDs to their connection metrics
 */
export class ConnectionQualityMonitor {
  private metrics: Map<string, ConnectionMetrics> = new Map();
  private config: MonitorConfig;
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private onQualityChange?: (deviceId: string, quality: ConnectionQuality) => void;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set callback for quality changes
   */
  setQualityChangeCallback(callback: (deviceId: string, quality: ConnectionQuality) => void) {
    this.onQualityChange = callback;
  }

  /**
   * Start monitoring a device
   */
  startMonitoring(deviceId: string, pingFn: () => Promise<number | null>) {
    // Initialize metrics
    if (!this.metrics.has(deviceId)) {
      this.metrics.set(deviceId, this.createEmptyMetrics(deviceId));
    }

    // Clear existing interval if any
    this.stopMonitoring(deviceId);

    // Start ping interval with overlap guard
    let isPinging = false;
    const interval = setInterval(async () => {
      if (isPinging) return;
      isPinging = true;
      try {
        await this.ping(deviceId, pingFn);
      } finally {
        isPinging = false;
      }
    }, this.config.pingIntervalMs);

    this.pingIntervals.set(deviceId, interval);

    // Perform initial ping
    this.ping(deviceId, pingFn);
  }

  /**
   * Stop monitoring a device
   */
  stopMonitoring(deviceId: string) {
    const interval = this.pingIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(deviceId);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAll() {
    this.pingIntervals.forEach((interval) => clearInterval(interval));
    this.pingIntervals.clear();
  }

  /**
   * Perform a single ping and update metrics
   */
  async ping(deviceId: string, pingFn: () => Promise<number | null>): Promise<PingResult> {
    const metrics = this.metrics.get(deviceId) ?? this.createEmptyMetrics(deviceId);
    const timestamp = new Date().toISOString();

    let result: PingResult;

    try {
      const startTime = Date.now();
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), this.config.timeoutMs)
      );

      const latencyMs = await Promise.race([pingFn(), timeoutPromise]);

      result = {
        timestamp,
        latencyMs,
        success: latencyMs !== null,
        error: latencyMs === null ? 'No response' : undefined,
      };
    } catch (error) {
      result = {
        timestamp,
        latencyMs: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Update metrics
    this.updateMetrics(deviceId, metrics, result);

    return result;
  }

  /**
   * Record a manual ping result
   */
  recordPing(deviceId: string, latencyMs: number | null, error?: string) {
    const metrics = this.metrics.get(deviceId) ?? this.createEmptyMetrics(deviceId);
    const result: PingResult = {
      timestamp: new Date().toISOString(),
      latencyMs,
      success: latencyMs !== null && !error,
      error,
    };
    this.updateMetrics(deviceId, metrics, result);
  }

  /**
   * Get metrics for a device
   */
  getMetrics(deviceId: string): ConnectionMetrics | null {
    return this.metrics.get(deviceId) ?? null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ConnectionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get metrics as a simple map for topology builder
   */
  getMetricsForTopology(): Map<string, { latencyMs: number; lastPing: string }> {
    const result = new Map<string, { latencyMs: number; lastPing: string }>();

    this.metrics.forEach((metrics, deviceId) => {
      if (metrics.latencyMs !== null && metrics.lastPingAt) {
        result.set(deviceId, {
          latencyMs: metrics.latencyMs,
          lastPing: metrics.lastPingAt,
        });
      }
    });

    return result;
  }

  /**
   * Check if a device is considered healthy
   */
  isHealthy(deviceId: string): boolean {
    const metrics = this.metrics.get(deviceId);
    if (!metrics) return false;

    return (
      metrics.consecutiveFailures < this.config.failureThreshold &&
      metrics.quality !== 'critical'
    );
  }

  /**
   * Get summary of all connection health
   */
  getHealthSummary(): {
    healthy: number;
    degraded: number;
    critical: number;
    unknown: number;
  } {
    let healthy = 0;
    let degraded = 0;
    let critical = 0;
    let unknown = 0;

    this.metrics.forEach((metrics) => {
      switch (metrics.quality) {
        case 'excellent':
        case 'good':
          healthy++;
          break;
        case 'fair':
        case 'poor':
          degraded++;
          break;
        case 'critical':
          critical++;
          break;
        default:
          unknown++;
      }
    });

    return { healthy, degraded, critical, unknown };
  }

  /**
   * Create empty metrics for a device
   */
  private createEmptyMetrics(deviceId: string): ConnectionMetrics {
    return {
      deviceId,
      latencyMs: null,
      avgLatencyMs: null,
      minLatencyMs: null,
      maxLatencyMs: null,
      jitterMs: null,
      packetLoss: 0,
      quality: 'unknown',
      lastPingAt: null,
      lastSuccessAt: null,
      consecutiveFailures: 0,
      pingHistory: [],
    };
  }

  /**
   * Update metrics with a new ping result
   */
  private updateMetrics(
    deviceId: string,
    metrics: ConnectionMetrics,
    result: PingResult
  ) {
    // Add to history
    metrics.pingHistory.push(result);
    if (metrics.pingHistory.length > this.config.historySize) {
      metrics.pingHistory.shift();
    }

    // Update timestamps
    metrics.lastPingAt = result.timestamp;
    if (result.success) {
      metrics.lastSuccessAt = result.timestamp;
      metrics.consecutiveFailures = 0;
    } else {
      metrics.consecutiveFailures++;
    }

    // Calculate stats from history
    const successfulPings = metrics.pingHistory.filter(
      (p) => p.success && p.latencyMs !== null
    );
    const latencies = successfulPings.map((p) => p.latencyMs as number);

    if (latencies.length > 0) {
      metrics.latencyMs = result.latencyMs;
      metrics.avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      metrics.minLatencyMs = Math.min(...latencies);
      metrics.maxLatencyMs = Math.max(...latencies);

      // Calculate jitter (average deviation from mean)
      if (latencies.length > 1) {
        const avg = metrics.avgLatencyMs;
        metrics.jitterMs =
          latencies.reduce((sum, l) => sum + Math.abs(l - avg), 0) / latencies.length;
      }
    }

    // Calculate packet loss
    const totalPings = metrics.pingHistory.length;
    const failedPings = metrics.pingHistory.filter((p) => !p.success).length;
    metrics.packetLoss = totalPings > 0 ? (failedPings / totalPings) * 100 : 0;

    // Determine quality
    const previousQuality = metrics.quality;

    if (metrics.consecutiveFailures >= this.config.failureThreshold) {
      metrics.quality = 'critical';
    } else if (metrics.avgLatencyMs !== null) {
      // Factor in packet loss
      let baseQuality = latencyToQuality(metrics.avgLatencyMs);

      // Degrade quality if packet loss is high
      if (metrics.packetLoss > 20) {
        baseQuality = this.degradeQuality(baseQuality, 2);
      } else if (metrics.packetLoss > 10) {
        baseQuality = this.degradeQuality(baseQuality, 1);
      }

      // Degrade quality if jitter is high
      if (metrics.jitterMs !== null && metrics.jitterMs > 50) {
        baseQuality = this.degradeQuality(baseQuality, 1);
      }

      metrics.quality = baseQuality;
    }

    // Store updated metrics
    this.metrics.set(deviceId, metrics);

    // Notify on quality change
    if (previousQuality !== metrics.quality && this.onQualityChange) {
      this.onQualityChange(deviceId, metrics.quality);
    }
  }

  /**
   * Degrade quality by N levels
   */
  private degradeQuality(quality: ConnectionQuality, levels: number): ConnectionQuality {
    const qualityLevels: ConnectionQuality[] = [
      'excellent',
      'good',
      'fair',
      'poor',
      'critical',
    ];

    const currentIndex = qualityLevels.indexOf(quality);
    if (currentIndex === -1) return quality;

    const newIndex = Math.min(currentIndex + levels, qualityLevels.length - 1);
    return qualityLevels[newIndex];
  }
}

/**
 * Create a ping function for a device via the mesh API
 */
export function createMeshPingFn(
  targetDeviceId: string,
  sourceDeviceId: string
): () => Promise<number | null> {
  return async () => {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/remote/mesh/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: 'ping',
          target_device_id: targetDeviceId,
          source_device_id: sourceDeviceId,
          payload: { timestamp: startTime },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const endTime = Date.now();
      return endTime - startTime;
    } catch {
      return null;
    }
  };
}

/**
 * Singleton instance for global use
 */
let globalMonitor: ConnectionQualityMonitor | null = null;

export function getConnectionMonitor(): ConnectionQualityMonitor {
  if (!globalMonitor) {
    globalMonitor = new ConnectionQualityMonitor();
  }
  return globalMonitor;
}
