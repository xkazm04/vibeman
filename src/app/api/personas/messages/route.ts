/**
 * Persona Messages API
 * GET: List messages with filters and pagination
 * POST: Create a message manually (for testing)
 */

import { NextResponse } from 'next/server';
import { personaDb } from '@/app/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const isRead = url.searchParams.get('is_read');
    const personaId = url.searchParams.get('persona_id');
    const priority = url.searchParams.get('priority');

    const filter: { is_read?: number; persona_id?: string; priority?: string } = {};
    if (isRead !== null) filter.is_read = parseInt(isRead, 10);
    if (personaId) filter.persona_id = personaId;
    if (priority) filter.priority = priority;

    const messages = personaDb.messages.getGlobalWithPersonaInfo(limit, offset, Object.keys(filter).length > 0 ? filter : undefined);
    const total = personaDb.messages.getGlobalCount(Object.keys(filter).length > 0 ? filter : undefined);
    const unreadCount = personaDb.messages.getUnreadCount();

    return NextResponse.json({ messages, total, unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { persona_id, content, title, priority, content_type, execution_id } = body;

    if (!persona_id || !content) {
      return NextResponse.json(
        { error: 'persona_id and content are required' },
        { status: 400 }
      );
    }

    const message = personaDb.messages.create({
      persona_id,
      content,
      title,
      priority,
      content_type,
      execution_id,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create message' },
      { status: 500 }
    );
  }
}
