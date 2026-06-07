/**
 * Integration Test API
 * Handles testing integration connections
 */

import { NextResponse } from 'next/server';
import { integrationRepository, webhookRepository } from '@/app/db/repositories/integration.repository';
import { integrationEngine } from '@/lib/integrations';
import type { IntegrationProvider } from '@/app/db/models/integration.types';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';
import { decryptFieldOrRaw } from '@/lib/integrations/credentialCrypto';

/**
 * POST /api/integrations/test
 * Test an integration connection
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id, // Existing integration ID
      provider, // For new integrations
      config,
      credentials,
      webhookUrl,
      webhookMethod,
      webhookHeaders,
      webhookSecret,
    } = body;

    let testProvider: IntegrationProvider;
    let testConfig: Record<string, unknown>;
    let testCredentials: Record<string, unknown>;

    if (id) {
      // Test existing integration
      const integration = integrationRepository.getById(id);
      if (!integration) {
        return NextResponse.json(
          { success: false, error: 'Integration not found' },
          { status: 404 }
        );
      }

      testProvider = integration.provider;
      testConfig = safeJsonParse(integration.config, {});
      const rawCreds = integration.credentials ? decryptFieldOrRaw(integration.credentials) : null;
      testCredentials = safeJsonParse(rawCreds, {});

      // For webhook integrations, include webhook config
      if (testProvider === 'webhook') {
        const webhook = webhookRepository.getByIntegration(id);
        if (webhook) {
          testConfig.webhookConfig = {
            url: webhook.url,
            method: webhook.method,
            headers: safeJsonParse(webhook.headers, {}),
            secret: webhook.secret ? decryptFieldOrRaw(webhook.secret) : webhook.secret,
            retryOnFailure: webhook.retry_on_failure === 1,
            maxRetries: webhook.max_retries,
            timeoutMs: webhook.timeout_ms,
          };
        }
      }
    } else {
      // Test new integration
      if (!provider) {
        return NextResponse.json(
          { success: false, error: 'provider is required' },
          { status: 400 }
        );
      }

      testProvider = provider;
      testConfig = config || {};
      testCredentials = credentials || {};

      // For webhook integrations, include webhook config
      if (provider === 'webhook' && webhookUrl) {
        testConfig.webhookConfig = {
          url: webhookUrl,
          method: webhookMethod || 'POST',
          headers: webhookHeaders || {},
          secret: webhookSecret,
          retryOnFailure: true,
          maxRetries: 3,
          timeoutMs: 30000,
        };
      }
    }

    // Test the connection
    const result = await integrationEngine.testConnection(
      testProvider,
      testConfig,
      testCredentials
    );

    // Update integration status if testing existing integration
    if (id) {
      if (result.success) {
        integrationRepository.updateStatus(id, 'active');
      } else {
        integrationRepository.updateStatus(id, 'error', result.message);
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Integrations feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test integration' },
      { status: 500 }
    );
  }
}

import { safeJsonParse } from '@/lib/integrations/safeJsonParse';
