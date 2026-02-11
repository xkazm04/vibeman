/**
 * Mark All Messages as Read API
 * POST: Mark all messages as read, optionally filtered by persona_id
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const personaId = body.persona_id;

    personaDb.messages.markAllAsRead(personaId);

    const unreadCount = personaDb.messages.getUnreadCount();
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
