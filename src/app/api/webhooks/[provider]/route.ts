/**
 * POST /api/webhooks/[provider]
 * Inbound webhook endpoint for external services (GitHub, Slack, etc).
 * Validates provider-specific signatures before processing events.
 * Rejects unsigned or invalid requests with 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { integrationDb } from '@/app/db';
import { verifyWebhookSignature } from '@/lib/integrations/webhookSignature';
import { dispatchIntegrationEvent } from '@/lib/integrations/engine';
import type { IntegrationProvider, IntegrationEventType } from '@/app/db/models/integration.types';

const VALID_PROVIDERS = new Set<string>([
  'github', 'gitlab', 'slack', 'discord', 'webhook', 'jira', 'linear', 'notion',
]);

/**
 * Extract the webhook secret from an integration's config or credentials.
 */
function extractSecret(integration: { config: string; credentials: string | null }): string | null {
  try {
    const config = JSON.parse(integration.config);
    if (config.webhookSecret) return config.webhookSecret;
  } catch { /* ignore */ }

  try {
    if (integration.credentials) {
      const creds = JSON.parse(integration.credentials);
      if (creds.webhookSecret) return creds.webhookSecret;
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Map a GitHub event type (from x-github-event header) to an IntegrationEventType.
 */
function mapGitHubEvent(githubEvent: string): IntegrationEventType | null {
  const mapping: Record<string, IntegrationEventType> = {
    'issues': 'goal.created',
    'pull_request': 'automation.completed',
    'push': 'implementation.completed',
    'workflow_run': 'automation.completed',
  };
  return mapping[githubEvent] || null;
}

/**
 * Map a Slack event type to an IntegrationEventType.
 */
function mapSlackEvent(slackType: string): IntegrationEventType | null {
  const mapping: Record<string, IntegrationEventType> = {
    'message': 'automation.started',
    'app_mention': 'automation.started',
  };
  return mapping[slackType] || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }

    // Read body as text first (required for HMAC verification before JSON parsing)
    const bodyText = await request.text();

    // Look up integration ID from query param or find first active integration for this provider
    const searchParams = request.nextUrl.searchParams;
    const integrationId = searchParams.get('integrationId');
    const projectId = searchParams.get('projectId');

    let integration;
    if (integrationId) {
      integration = integrationDb.getById(integrationId);
      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
    } else if (projectId) {
      const integrations = integrationDb.getByProvider(projectId, provider as IntegrationProvider);
      integration = integrations.find((i) => i.status === 'active') || integrations[0];
      if (!integration) {
        return NextResponse.json({ error: 'No integration configured for this provider' }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: 'projectId or integrationId query parameter is required' },
        { status: 400 }
      );
    }

    // Extract webhook secret from integration config
    const secret = extractSecret(integration);

    // SECURITY: Reject unsigned requests when a secret is configured
    if (secret) {
      const headerMap: Record<string, string | null> = {
        'x-hub-signature-256': request.headers.get('x-hub-signature-256'),
        'x-signature': request.headers.get('x-signature'),
        'x-webhook-signature': request.headers.get('x-webhook-signature'),
        'x-slack-signature': request.headers.get('x-slack-signature'),
        'x-slack-request-timestamp': request.headers.get('x-slack-request-timestamp'),
      };

      const result = verifyWebhookSignature(provider, bodyText, headerMap, secret);
      if (!result.valid) {
        return NextResponse.json(
          { error: result.error || 'Signature verification failed' },
          { status: 401 }
        );
      }
    } else {
      // No secret configured — reject the request.
      // Webhook ingestion without signature verification is a security risk.
      return NextResponse.json(
        { error: 'Webhook secret not configured for this integration. Configure a secret to enable webhook ingestion.' },
        { status: 403 }
      );
    }

    // Parse the verified body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Slack URL verification challenge (must respond with challenge value)
    if (provider === 'slack' && body.type === 'url_verification' && typeof body.challenge === 'string') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Map provider event to integration event type
    let eventType: IntegrationEventType | null = null;

    if (provider === 'github') {
      const githubEvent = request.headers.get('x-github-event');
      eventType = githubEvent ? mapGitHubEvent(githubEvent) : null;
    } else if (provider === 'slack') {
      const slackEvent = (body.event as Record<string, unknown>)?.type as string | undefined;
      eventType = slackEvent ? mapSlackEvent(slackEvent) : null;
    }

    // Default event type if no mapping found
    if (!eventType) {
      eventType = 'automation.started';
    }

    // Dispatch to the integration engine
    const result = await dispatchIntegrationEvent(
      integration.project_id,
      eventType,
      {
        provider,
        webhook_payload: body,
        received_at: new Date().toISOString(),
        headers: {
          'x-github-event': request.headers.get('x-github-event'),
          'x-github-delivery': request.headers.get('x-github-delivery'),
          'user-agent': request.headers.get('user-agent'),
        },
      },
      { triggeredBy: `webhook:${provider}` }
    );

    return NextResponse.json({
      ok: true,
      event_type: eventType,
      dispatched: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Webhook ingestion error:`, message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
