import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || undefined;

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
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, title, description, type, agent, message } = body;

    if (!project_id || !title || !description || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: project_id, title, description, type'
        },
        { status: 400 }
      );
    }

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
    console.error('Failed to create event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing event ID'
        },
        { status: 400 }
      );
    }

    // Delete event from SQLite database
    const deleted = eventDb.deleteEvent(eventId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}