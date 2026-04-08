/**
 * Local SQLite Observability Provider
 * Stores API call data in the local Vibeman database
 */

import { ObservabilityProvider, ApiCallData, ErrorData, ProviderConfig } from './types';

export class LocalProvider implements ObservabilityProvider {
  readonly name = 'local';
  private config: ProviderConfig;
  private buffer: ApiCallData[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly MAX_BUFFER_SIZE = 1000;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush().catch(console.error);
    }, this.FLUSH_INTERVAL_MS);
  }

  async logApiCall(data: ApiCallData): Promise<void> {
    if (!this.config.enabled) return;

    // Apply sampling
    if (this.config.sampleRate < 1.0 && Math.random() > this.config.sampleRate) {
      return;
    }

    // Check endpoint filter
    if (this.config.endpointsToTrack) {
      const shouldTrack = this.config.endpointsToTrack.some(pattern => {
        if (pattern.endsWith('*')) {
          return data.endpoint.startsWith(pattern.slice(0, -1));
        }
        return data.endpoint === pattern;
      });
      if (!shouldTrack) return;
    }

    // Drop oldest entries if buffer is at max capacity
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-Math.floor(this.MAX_BUFFER_SIZE / 2));
    }

    // Add to buffer
    this.buffer.push({
      ...data,
      called_at: data.called_at || new Date().toISOString()
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  async logError(data: ErrorData): Promise<void> {
    if (!this.config.enabled) return;

    // For local provider, errors are logged as failed API calls
    // or we could add a separate error table later
    console.error(`[Observability] Error in ${data.endpoint || 'unknown'}:`, data.error_message);
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Skip flush if too many consecutive failures (back off)
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.consecutiveFailures = 0;
      this.buffer = [];
      console.warn('[Observability] Too many consecutive flush failures, dropping buffer');
      return;
    }

    const toFlush = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch('/api/observability/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: this.config.projectId,
          batch: toFlush
        })
      });

      if (!response.ok) {
        this.consecutiveFailures++;
        console.error('[Observability] Failed to flush:', response.statusText);
        // Re-queue only up to max buffer cap
        const combined = [...toFlush, ...this.buffer];
        this.buffer = combined.slice(-this.MAX_BUFFER_SIZE);
      } else {
        this.consecutiveFailures = 0;
      }
    } catch (error) {
      this.consecutiveFailures++;
      console.error('[Observability] Flush error:', error);
      // Re-queue only up to max buffer cap
      const combined = [...toFlush, ...this.buffer];
      this.buffer = combined.slice(-this.MAX_BUFFER_SIZE);
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}
