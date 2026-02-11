import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = personaDb.credentialEvents.getById(id);

    if (!event) {
      return NextResponse.json(
        { error: 'Credential event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error fetching credential event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch credential event' },
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
    const body = await request.json();
    const { name, config, enabled } = body;

    // Verify event exists
    const existing = personaDb.credentialEvents.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential event not found' },
        { status: 404 }
      );
    }

    const updates: { name?: string; config?: object; enabled?: boolean } = {};
    if (name !== undefined) updates.name = name;
    if (config !== undefined) updates.config = config;
    if (enabled !== undefined) updates.enabled = enabled;

    const event = personaDb.credentialEvents.update(id, updates);

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error updating credential event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update credential event' },
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

    // Verify event exists
    const existing = personaDb.credentialEvents.getById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential event not found' },
        { status: 404 }
      );
    }

    personaDb.credentialEvents.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credential event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete credential event' },
      { status: 500 }
    );
  }
}
