import { NextRequest, NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET() {
  try {
    const events = personaDb.credentialEvents.getAll();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching credential events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch credential events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential_id, event_template_id, name, config, enabled } = body;

    if (!credential_id || !event_template_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: credential_id, event_template_id, name' },
        { status: 400 }
      );
    }

    // Verify credential exists
    const credential = personaDb.credentials.getById(credential_id);
    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const event = personaDb.credentialEvents.create({
      credential_id,
      event_template_id,
      name,
      config: config || undefined,
      enabled: enabled !== undefined ? enabled : true,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating credential event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create credential event' },
      { status: 500 }
    );
  }
}
