import { NextRequest, NextResponse } from 'next/server';
import { eventRepository } from '@/app/db/repositories/event.repository';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/blueprint/events
 * Fetch latest events by titles for blueprint scans
 *
 * Query params:
 *   - projectId: Project ID
 *   - titles: Comma-separated list of event titles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const titlesParam = searchParams.get('titles');

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing projectId parameter'
        },
        { status: 400 }
      );
    }

    if (!titlesParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing titles parameter'
        },
        { status: 400 }
      );
    }

    // Parse titles from comma-separated string
    const titles = titlesParam.split(',').map(t => t.trim()).filter(t => t);

    if (titles.length === 0) {
      return NextResponse.json({
        success: true,
        events: {}
      });
    }

    // Fetch latest events for each title
    const events = eventRepository.getLatestEventsByTitles(projectId, titles);

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('[Blueprint Events API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprint/events
 * Create a new event for blueprint scans
 *
 * Body:
 *   - project_id: Project ID
 *   - title: Event title
 *   - description: Event description
 *   - type: Event type (info, warning, error, success, proposal_accepted, proposal_rejected)
 *   - agent?: Agent name (optional)
 *   - message?: Additional message (optional)
 */
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

    // Create event in database
    const event = eventRepository.createEvent({
      id: uuidv4(),
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
    console.error('[Blueprint Events API] Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
