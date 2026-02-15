/**
 * POST /api/personas/webhooks/[triggerId]
 * Ingests external webhook payloads and publishes to the event bus.
 * Validates HMAC signatures when a secret is configured.
 * Rejects unsigned requests when a secret is configured.
 */
import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { personaEventBus } from '@/lib/personas/eventBus';
import { verifyGenericHmacSignature } from '@/lib/integrations/webhookSignature';
import { checkRateLimit } from '@/lib/api-helpers/rateLimiter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  const rateLimited = checkRateLimit(request, '/api/personas/webhooks', 'strict');
  if (rateLimited) return rateLimited;

  try {
    const { triggerId } = await params;

    // Validate trigger exists, is webhook type, and is enabled
    const trigger = personaDb.triggers.getById(triggerId);
    if (!trigger) {
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
    }
    if (trigger.trigger_type !== 'webhook') {
      return NextResponse.json({ error: 'Trigger is not a webhook type' }, { status: 400 });
    }
    if (!trigger.enabled) {
      return NextResponse.json({ error: 'Trigger is disabled' }, { status: 403 });
    }

    let config: Record<string, unknown> = {};
    if (trigger.config) {
      try { config = JSON.parse(trigger.config); } catch { /* ignore */ }
    }

    // Always read body as text first to support HMAC verification
    const bodyText = await request.text();

    // HMAC signature verification when secret is configured
    if (config.hmac_secret) {
      const signature = request.headers.get('x-hub-signature-256') || request.headers.get('x-signature');
      const result = verifyGenericHmacSignature(
        bodyText,
        signature,
        config.hmac_secret as string,
        'x-hub-signature-256 or x-signature'
      );
      if (!result.valid) {
        return NextResponse.json({ error: result.error || 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse verified body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = {};
    }

    const eventId = personaEventBus.publish({
      event_type: 'webhook_received',
      source_type: 'webhook',
      source_id: triggerId,
      target_persona_id: trigger.persona_id,
      project_id: personaDb.personas.getById(trigger.persona_id)?.project_id || 'default',
      payload: { trigger_id: triggerId, headers: Object.fromEntries(request.headers.entries()), body },
    });

    // Update trigger's last_triggered_at
    personaDb.triggers.markTriggered(triggerId, null);

    return NextResponse.json({ ok: true, event_id: eventId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
