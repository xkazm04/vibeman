/**
 * PUT /api/personas/events/subscriptions/[id] - Update subscription
 * DELETE /api/personas/events/subscriptions/[id] - Delete subscription
 */
import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = personaDb.eventSubscriptions.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    personaDb.eventSubscriptions.update(id, body);
    const updated = personaDb.eventSubscriptions.getById(id);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = personaDb.eventSubscriptions.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    personaDb.eventSubscriptions.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
