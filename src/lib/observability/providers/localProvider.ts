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

    const toFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Send batch to API
      const response = await fetch('/api/observability/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: this.config.projectId,
          batch: toFlush
        })
      });

      if (!response.ok) {
        // Put items back in buffer for retry
        this.buffer = [...toFlush, ...this.buffer];
        console.error('[Observability] Failed to flush:', response.statusText);
      }
    } catch (error) {
      // Put items back in buffer for retry
      this.buffer = [...toFlush, ...this.buffer];
      console.error('[Observability] Flush error:', error);
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
