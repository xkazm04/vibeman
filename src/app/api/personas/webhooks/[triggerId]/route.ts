/**
 * POST /api/personas/webhooks/[triggerId]
 * Ingests external webhook payloads and publishes to the event bus.
 */
import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { personaEventBus } from '@/lib/personas/eventBus';
import * as crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ triggerId: string }> }
) {
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

    // Optional HMAC signature verification
    let config: Record<string, unknown> = {};
    if (trigger.config) {
      try { config = JSON.parse(trigger.config); } catch { /* ignore */ }
    }

    if (config.hmac_secret) {
      const signature = request.headers.get('x-hub-signature-256') || request.headers.get('x-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
      }
      const bodyText = await request.text();
      const expected = 'sha256=' + crypto.createHmac('sha256', config.hmac_secret as string).update(bodyText).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      // Parse body after text consumption
      const body = JSON.parse(bodyText);

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
    }

    // No HMAC - parse body normally
    const body = await request.json().catch(() => ({}));

    const eventId = personaEventBus.publish({
      event_type: 'webhook_received',
      source_type: 'webhook',
      source_id: triggerId,
      target_persona_id: trigger.persona_id,
      project_id: personaDb.personas.getById(trigger.persona_id)?.project_id || 'default',
      payload: { trigger_id: triggerId, headers: Object.fromEntries(request.headers.entries()), body },
    });

    personaDb.triggers.markTriggered(triggerId, null);

    return NextResponse.json({ ok: true, event_id: eventId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
