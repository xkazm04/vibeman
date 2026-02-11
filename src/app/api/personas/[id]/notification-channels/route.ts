/**
 * Persona Notification Channels API
 * GET: Fetch notification channels for a persona
 * PUT: Update notification channels for a persona
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';
import type { NotificationChannel } from '@/app/db/models/persona.types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const persona = personaDb.personas.getById(id);
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    let channels: NotificationChannel[] = [];
    if (persona.notification_channels) {
      try {
        channels = JSON.parse(persona.notification_channels);
      } catch {
        channels = [];
      }
    }

    return NextResponse.json({ channels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch notification channels' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { channels } = body;

    if (!Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'channels must be an array' },
        { status: 400 }
      );
    }

    const persona = personaDb.personas.getById(id);
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    personaDb.personas.update(id, {
      notification_channels: JSON.stringify(channels),
    });

    return NextResponse.json({ channels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update notification channels' },
      { status: 500 }
    );
  }
}
