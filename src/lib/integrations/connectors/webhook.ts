/**
 * Generic Webhook Integration Connector
 * Handles custom HTTP webhook integrations
 */

import crypto from 'crypto';
import type {
  IntegrationConnector,
  IntegrationEventPayload,
  WebhookConfig,
} from '@/app/db/models/integration.types';

interface WebhookConnectionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  secret?: string | null;
  retryOnFailure?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Format payload based on configuration
 */
function formatPayload(
  event: IntegrationEventPayload,
  config: WebhookConfig
): string | URLSearchParams {
  const payloadData: Record<string, unknown> = {
    event_type: event.eventType,
    project_id: event.projectId,
    timestamp: event.timestamp,
    data: event.data,
  };

  // Add metadata if configured
  if (config.includeMetadata !== false && event.metadata) {
    payloadData.metadata = event.metadata;
  }

  // Add project name if available
  if (event.projectName) {
    payloadData.project_name = event.projectName;
  }

  // Add custom fields
  if (config.customFields) {
    payloadData.custom = config.customFields;
  }

  if (config.payloadFormat === 'form') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payloadData)) {
      params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    return params;
  }

  return JSON.stringify(payloadData);
}

/**
 * Make HTTP request with timeout and retry support
 */
async function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | URLSearchParams,
  timeoutMs: number
): Promise<{ success: boolean; status?: number; data?: unknown; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        data: responseData,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: `Request timeout after ${timeoutMs}ms` };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * Webhook Connector implementation
 */
export const WebhookConnector: IntegrationConnector = {
  provider: 'webhook',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const webhookConfig = (config as Record<string, unknown>).webhookConfig as WebhookConnectionConfig | undefined;

    if (!webhookConfig?.url) {
      return { valid: false, error: 'Webhook URL is required' };
    }

    try {
      new URL(webhookConfig.url);
    } catch {
      return { valid: false, error: 'Invalid webhook URL' };
    }

    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(webhookConfig.method)) {
      return { valid: false, error: 'Invalid HTTP method' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    const webhookConfig = (config as Record<string, unknown>).webhookConfig as WebhookConnectionConfig;
    const generalConfig = config as WebhookConfig;

    // Build test payload
    const testEvent: IntegrationEventPayload = {
      eventType: 'automation.started',
      projectId: 'test',
      projectName: 'Test Project',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Vibeman integration test',
        test: true,
      },
      metadata: {
        source: 'vibeman',
        version: '1.0.0',
      },
    };

    const payload = formatPayload(testEvent, generalConfig);

    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': 'Vibeman-Integration/1.0',
      ...(webhookConfig.headers || {}),
    };

    if (typeof payload === 'string') {
      headers['Content-Type'] = 'application/json';
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // Add signature if secret is configured
    if (webhookConfig.secret && typeof payload === 'string') {
      headers['X-Vibeman-Signature'] = generateSignature(payload, webhookConfig.secret);
    }

    const result = await makeRequest(
      webhookConfig.url,
      webhookConfig.method,
      headers,
      payload,
      webhookConfig.timeoutMs || 30000
    );

    if (result.success) {
      return { success: true, message: `Connected to webhook (HTTP ${result.status})` };
    }

    return { success: false, message: result.error || 'Failed to connect to webhook' };
  },

  async sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    // Validate
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const webhookConfig = (config as Record<string, unknown>).webhookConfig as WebhookConnectionConfig;
    const generalConfig = config as WebhookConfig;

    const payload = formatPayload(event, generalConfig);

    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': 'Vibeman-Integration/1.0',
      ...(webhookConfig.headers || {}),
    };

    if (typeof payload === 'string') {
      headers['Content-Type'] = 'application/json';
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // Add signature if secret is configured
    if (webhookConfig.secret && typeof payload === 'string') {
      headers['X-Vibeman-Signature'] = generateSignature(payload, webhookConfig.secret);
    }

    // Add event type header
    headers['X-Vibeman-Event'] = event.eventType;

    const timeoutMs = webhookConfig.timeoutMs || 30000;
    const maxRetries = webhookConfig.retryOnFailure ? (webhookConfig.maxRetries || 3) : 1;

    let lastError: string = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await makeRequest(
        webhookConfig.url,
        webhookConfig.method,
        headers,
        payload,
        timeoutMs
      );

      if (result.success) {
        return {
          success: true,
          response: {
            status: result.status,
            data: result.data,
            attempts: attempt + 1,
          },
        };
      }

      lastError = result.error || 'Unknown error';

      // Don't retry on client errors (4xx)
      if (result.status && result.status >= 400 && result.status < 500) {
        break;
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return { success: false, error: lastError };
  },
};
