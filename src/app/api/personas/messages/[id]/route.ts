/**
 * Single Persona Message API
 * GET: Fetch message with delivery records
 * PUT: Update message (primarily mark as read)
 * DELETE: Delete a message
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const message = personaDb.messages.getById(id);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const deliveries = personaDb.messageDeliveries.getByMessageId(id);
    return NextResponse.json({ message, deliveries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch message' },
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

    if (body.is_read) {
      personaDb.messages.markAsRead(id);
    }

    const message = personaDb.messages.getById(id);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = personaDb.messages.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 500 }
    );
  }
}
