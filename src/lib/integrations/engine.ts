/**
 * Integration Engine
 * Orchestrates event dispatch to external integrations
 */

import {
  integrationDb,
  integrationEventDb,
  webhookDb,
} from '@/app/db';
import type {
  DbIntegration,
  IntegrationEventType,
  IntegrationEventPayload,
  IntegrationProvider,
} from '@/app/db/models/integration.types';
import { isEventSupported } from './registry';
import { decryptFieldOrRaw } from '@/lib/personas/credentialCrypto';
import { GitHubConnector } from './connectors/github';
import { SlackConnector } from './connectors/slack';
import { DiscordConnector } from './connectors/discord';
import { WebhookConnector } from './connectors/webhook';
import { SupabaseConnector } from './connectors/supabase';
import { PostgresConnector } from './connectors/postgres';

/**
 * Connector factory - returns the appropriate connector for a provider
 */
function getConnector(provider: IntegrationProvider) {
  switch (provider) {
    case 'github':
      return GitHubConnector;
    case 'slack':
      return SlackConnector;
    case 'discord':
      return DiscordConnector;
    case 'webhook':
      return WebhookConnector;
    case 'supabase':
      return SupabaseConnector;
    case 'postgres':
      return PostgresConnector;
    default:
      return null;
  }
}

/**
 * Parse JSON safely with fallback
 */
function parseJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Integration Engine class
 * Handles event dispatching and integration lifecycle
 */
export class IntegrationEngine {
  private static instance: IntegrationEngine;

  private constructor() {}

  static getInstance(): IntegrationEngine {
    if (!IntegrationEngine.instance) {
      IntegrationEngine.instance = new IntegrationEngine();
    }
    return IntegrationEngine.instance;
  }

  /**
   * Dispatch an event to all subscribed integrations
   */
  async dispatchEvent(
    projectId: string,
    eventType: IntegrationEventType,
    data: Record<string, unknown>,
    options?: {
      projectName?: string;
      triggeredBy?: string;
    }
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const results = { sent: 0, failed: 0, skipped: 0 };

    // Get all active integrations for this project that are subscribed to this event
    const integrations = integrationDb.getByEventType(projectId, eventType);

    if (integrations.length === 0) {
      return results;
    }

    // Build the event payload
    const payload: IntegrationEventPayload = {
      eventType,
      projectId,
      projectName: options?.projectName,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: 'vibeman',
        version: '1.0.0',
        triggeredBy: options?.triggeredBy,
      },
    };

    // Dispatch to each integration
    const dispatches = integrations.map(async (integration) => {
      try {
        // Check if event is supported by this provider
        if (!isEventSupported(integration.provider, eventType)) {
          results.skipped++;
          return;
        }

        // Create event log entry
        const eventLog = integrationEventDb.create({
          integration_id: integration.id,
          project_id: projectId,
          event_type: eventType,
          payload: JSON.stringify(payload),
          status: 'pending',
          response: null,
          error_message: null,
        });

        // Get connector and send event
        const result = await this.sendToIntegration(integration, payload);

        if (result.success) {
          integrationEventDb.updateStatus(
            eventLog.id,
            'sent',
            JSON.stringify(result.response)
          );
          integrationDb.recordSync(integration.id);
          results.sent++;
        } else {
          integrationEventDb.updateStatus(
            eventLog.id,
            'failed',
            undefined,
            result.error
          );
          integrationDb.updateStatus(integration.id, 'error', result.error);
          results.failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        integrationDb.updateStatus(integration.id, 'error', errorMessage);
        results.failed++;
      }
    });

    await Promise.allSettled(dispatches);
    return results;
  }

  /**
   * Send event to a specific integration
   */
  private async sendToIntegration(
    integration: DbIntegration,
    payload: IntegrationEventPayload
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    const connector = getConnector(integration.provider);
    if (!connector) {
      return { success: false, error: `No connector available for provider: ${integration.provider}` };
    }

    const config = parseJson<Record<string, unknown>>(integration.config, {});
    // Decrypt credentials — handles both encrypted ("enc:...") and legacy plaintext formats
    const rawCreds = integration.credentials ? decryptFieldOrRaw(integration.credentials) : null;
    const credentials = parseJson<Record<string, unknown>>(rawCreds, {});

    // For webhook integrations, get additional config from webhooks table
    if (integration.provider === 'webhook') {
      const webhook = webhookDb.getByIntegration(integration.id);
      if (webhook) {
        (config as Record<string, unknown>).webhookConfig = {
          url: webhook.url,
          method: webhook.method,
          headers: parseJson(webhook.headers, {}),
          secret: webhook.secret ? decryptFieldOrRaw(webhook.secret) : webhook.secret,
          retryOnFailure: webhook.retry_on_failure === 1,
          maxRetries: webhook.max_retries,
          timeoutMs: webhook.timeout_ms,
        };
      }
    }

    return connector.sendEvent(payload, config, credentials);
  }

  /**
   * Test connection for an integration
   */
  async testConnection(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const connector = getConnector(provider);
    if (!connector) {
      return { success: false, message: `No connector available for provider: ${provider}` };
    }

    return connector.testConnection(config, credentials);
  }

  /**
   * Validate integration configuration
   */
  async validateConfig(
    provider: IntegrationProvider,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const connector = getConnector(provider);
    if (!connector) {
      return { valid: false, error: `No connector available for provider: ${provider}` };
    }

    return connector.validate(config, credentials);
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(maxRetries: number = 3): Promise<{ retried: number; succeeded: number }> {
    const results = { retried: 0, succeeded: 0 };

    const failedEvents = integrationEventDb.getFailedEvents(maxRetries);

    for (const event of failedEvents) {
      results.retried++;

      const integration = integrationDb.getById(event.integration_id);
      if (!integration || integration.status !== 'active') {
        integrationEventDb.updateStatus(event.id, 'skipped');
        continue;
      }

      const payload = parseJson<IntegrationEventPayload>(event.payload, {
        eventType: event.event_type as IntegrationEventType,
        projectId: event.project_id,
        timestamp: new Date().toISOString(),
        data: {},
      });

      const result = await this.sendToIntegration(integration, payload);

      if (result.success) {
        integrationEventDb.updateStatus(event.id, 'sent', JSON.stringify(result.response));
        integrationDb.recordSync(integration.id);
        results.succeeded++;
      } else {
        integrationEventDb.updateStatus(event.id, 'failed', undefined, result.error);
      }
    }

    return results;
  }

  /**
   * Process pending events
   */
  async processPendingEvents(): Promise<{ processed: number; succeeded: number }> {
    const results = { processed: 0, succeeded: 0 };

    const pendingEvents = integrationEventDb.getPendingEvents();

    for (const event of pendingEvents) {
      results.processed++;

      const integration = integrationDb.getById(event.integration_id);
      if (!integration || integration.status !== 'active') {
        integrationEventDb.updateStatus(event.id, 'skipped');
        continue;
      }

      const payload = parseJson<IntegrationEventPayload>(event.payload, {
        eventType: event.event_type as IntegrationEventType,
        projectId: event.project_id,
        timestamp: new Date().toISOString(),
        data: {},
      });

      const result = await this.sendToIntegration(integration, payload);

      if (result.success) {
        integrationEventDb.updateStatus(event.id, 'sent', JSON.stringify(result.response));
        integrationDb.recordSync(integration.id);
        results.succeeded++;
      } else {
        integrationEventDb.updateStatus(event.id, 'failed', undefined, result.error);
      }
    }

    return results;
  }
}

/**
 * Singleton instance of the integration engine
 */
export const integrationEngine = IntegrationEngine.getInstance();

/**
 * Convenience function to dispatch events
 */
export async function dispatchIntegrationEvent(
  projectId: string,
  eventType: IntegrationEventType,
  data: Record<string, unknown>,
  options?: {
    projectName?: string;
    triggeredBy?: string;
  }
): Promise<{ sent: number; failed: number; skipped: number }> {
  return integrationEngine.dispatchEvent(projectId, eventType, data, options);
}
