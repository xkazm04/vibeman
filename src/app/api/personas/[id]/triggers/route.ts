import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const triggers = personaDb.triggers.getByPersonaId(personaId);
    return NextResponse.json({ triggers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch persona triggers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { trigger_type, config, enabled } = body;

    // Validate required fields
    if (!trigger_type || typeof trigger_type !== 'string' || !trigger_type.trim()) {
      return NextResponse.json(
        { error: 'Trigger type is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const trigger = personaDb.triggers.create({
      persona_id: personaId,
      trigger_type: trigger_type.trim() as any,
      config: config || null,
      enabled: enabled !== undefined ? enabled : true
    });

    return NextResponse.json({ trigger }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create persona trigger', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { triggerId, ...updates } = body;

    // Validate required fields
    if (!triggerId || typeof triggerId !== 'string') {
      return NextResponse.json(
        { error: 'Trigger ID is required and must be a string' },
        { status: 400 }
      );
    }

    const trigger = personaDb.triggers.update(triggerId, updates);
    if (!trigger) {
      return NextResponse.json(
        { error: 'Trigger not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ trigger });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update persona trigger', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personaId = id;

    if (!personaId || typeof personaId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid persona ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { triggerId } = body;

    // Validate required fields
    if (!triggerId || typeof triggerId !== 'string') {
      return NextResponse.json(
        { error: 'Trigger ID is required and must be a string' },
        { status: 400 }
      );
    }

    personaDb.triggers.delete(triggerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete persona trigger', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
