import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    try {
      let events;
      if (type && type !== 'all') {
        events = eventDb.getEventsByType(projectId, type, limit);
      } else {
        events = eventDb.getEventsByProject(projectId, limit);
      }
      
      return NextResponse.json({
        success: true,
        events
      });
    } catch (dbError) {
      console.error(`Failed to get events for project ${projectId}:`, dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to get events: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      projectId, 
      title, 
      description, 
      type, 
      agent, 
      message 
    } = await request.json();
    
    if (!projectId || !title || !description || !type) {
      return NextResponse.json(
        { success: false, error: 'Project ID, title, description, and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      );
    }

    try {
      const event = eventDb.createEvent({
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
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
    } catch (dbError) {
      console.error(`Failed to create event:`, dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create event: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create event API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}