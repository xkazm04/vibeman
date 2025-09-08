import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required'
        },
        { status: 400 }
      );
    }

    // Delete events from SQLite database
    const deletedCount = eventDb.deleteEventsByProject(projectId);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} events for project ${projectId}`
    });
  } catch (error) {
    console.error('Failed to clear events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}