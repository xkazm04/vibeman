/**
 * GET /api/personas/events/subscriptions - List subscriptions
 * POST /api/personas/events/subscriptions - Create subscription
 */
import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('persona_id');

    let subscriptions;
    if (personaId) {
      subscriptions = personaDb.eventSubscriptions.getByPersonaId(personaId);
    } else {
      subscriptions = personaDb.eventSubscriptions.getEnabled();
    }

    return NextResponse.json({ subscriptions, total: subscriptions.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona_id, event_type, source_filter, enabled } = body;

    if (!persona_id || !event_type) {
      return NextResponse.json({ error: 'persona_id and event_type are required' }, { status: 400 });
    }

    const sub = personaDb.eventSubscriptions.create({
      persona_id,
      event_type,
      source_filter: source_filter || undefined,
      enabled: enabled !== undefined ? enabled : true,
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
