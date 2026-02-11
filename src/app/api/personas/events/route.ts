/**
 * GET /api/personas/events - List recent events with filters
 * POST /api/personas/events - Manually publish an event (admin/testing)
 */
import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import { personaEventBus } from '@/lib/personas/eventBus';
import type { PersonaEventType, PersonaEventSourceType } from '@/app/db/models/persona.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('event_type') as PersonaEventType | null;

    let events;
    if (eventType) {
      events = personaDb.events.getByType(eventType, limit);
    } else {
      events = personaDb.events.getRecent(limit);
    }

    const pendingCount = personaDb.events.countPending();

    return NextResponse.json({ events, pendingCount, total: events.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, source_type, source_id, target_persona_id, payload, project_id } = body;

    if (!event_type || !source_type) {
      return NextResponse.json({ error: 'event_type and source_type are required' }, { status: 400 });
    }

    const eventId = personaEventBus.publish({
      event_type: event_type as PersonaEventType,
      source_type: source_type as PersonaEventSourceType,
      source_id,
      target_persona_id,
      project_id: project_id || 'default',
      payload,
    });

    return NextResponse.json({ ok: true, event_id: eventId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
