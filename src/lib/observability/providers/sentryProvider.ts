/**
 * Sentry Observability Provider
 * Sends API observability data to Sentry for production monitoring
 */

import { ObservabilityProvider, ApiCallData, ErrorData, ProviderConfig } from './types';

interface SentryConfig extends ProviderConfig {
  dsn: string;
}

// Note: In a real implementation, you would import the Sentry SDK:
// import * as Sentry from '@sentry/nextjs';

export class SentryProvider implements ObservabilityProvider {
  readonly name = 'sentry';
  private config: SentryConfig;
  private initialized = false;

  constructor(config: SentryConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    if (!this.config.dsn) {
      throw new Error('Sentry DSN is required');
    }

    // In a real implementation:
    // Sentry.init({
    //   dsn: this.config.dsn,
    //   tracesSampleRate: this.config.sampleRate,
    //   environment: process.env.NODE_ENV,
    // });

    this.initialized = true;
    console.log('[Observability] Sentry provider initialized');
  }

  async logApiCall(data: ApiCallData): Promise<void> {
    if (!this.config.enabled || !this.initialized) return;

    // Apply sampling
    if (this.config.sampleRate < 1.0 && Math.random() > this.config.sampleRate) {
      return;
    }

    // In a real implementation:
    // const transaction = Sentry.startTransaction({
    //   name: data.endpoint,
    //   op: 'http.server',
    // });
    //
    // transaction.setData('method', data.method);
    // transaction.setData('status_code', data.status_code);
    // transaction.setData('response_time_ms', data.response_time_ms);
    // transaction.setHttpStatus(data.status_code);
    //
    // if (data.error_message) {
    //   transaction.setTag('error', true);
    // }
    //
    // transaction.finish();

    // For now, just log
    if (data.status_code >= 400) {
      console.warn(`[Sentry] Error: ${data.method} ${data.endpoint} - ${data.status_code}`);
    }
  }

  async logError(data: ErrorData): Promise<void> {
    if (!this.config.enabled || !this.initialized) return;

    // In a real implementation:
    // Sentry.captureException(new Error(data.error_message), {
    //   tags: {
    //     endpoint: data.endpoint,
    //     error_type: data.error_type,
    //   },
    //   extra: data.context,
    // });

    console.error(`[Sentry] ${data.error_type}: ${data.error_message}`);
  }

  async flush(): Promise<void> {
    // In a real implementation:
    // await Sentry.flush(2000);
  }

  async close(): Promise<void> {
    // In a real implementation:
    // await Sentry.close(2000);
    this.initialized = false;
  }
}
