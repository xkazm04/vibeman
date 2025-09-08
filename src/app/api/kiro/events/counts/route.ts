import { NextRequest, NextResponse } from 'next/server';
import { eventDb } from '@/lib/eventDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';

    // Get event counts from SQLite database
    const counts = eventDb.getEventCountsByProject(projectId);

    return NextResponse.json({
      success: true,
      counts
    });
  } catch (error) {
    console.error('Failed to fetch event counts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}