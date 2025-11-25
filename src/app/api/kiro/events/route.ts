import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

interface EventQueryParams {
  projectId: string;
  limit: number;
  offset: number;
  type?: string;
}

type EventType = 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';

interface CreateEventBody {
  project_id: string;
  title: string;
  description: string;
  type: EventType;
  agent?: string;
  message?: string;
}

function createErrorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    {
      success: false,
      error: message
    },
    { status }
  );
}

function parseEventQueryParams(searchParams: URLSearchParams): EventQueryParams {
  return {
    projectId: searchParams.get('projectId') || 'default',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    type: searchParams.get('type') || undefined
  };
}

function validateCreateEventBody(body: Partial<CreateEventBody>): string | null {
  const { project_id, title, description, type } = body;

  if (!project_id || !title || !description || !type) {
    return 'Missing required fields: project_id, title, description, type';
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { projectId, limit, offset, type } = parseEventQueryParams(searchParams);

    // Get events from SQLite database
    const events = eventDb.getEventsByProject(projectId, {
      limit,
      offset,
      type
    });

    return NextResponse.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEventBody = await request.json();

    const validationError = validateCreateEventBody(body);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const { project_id, title, description, type, agent, message } = body;

    // Create event in SQLite database
    const event = eventDb.createEvent({
      project_id,
      title,
      description,
      type,
      agent,
      message
    });

    return NextResponse.json({
      success: true,
      event
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return createErrorResponse('Missing event ID', 400);
    }

    // Delete event from SQLite database
    const deleted = eventDb.deleteEvent(eventId);

    if (!deleted) {
      return createErrorResponse('Event not found', 404);
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}