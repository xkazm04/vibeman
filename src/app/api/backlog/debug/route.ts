import { NextRequest, NextResponse } from 'next/server';
import { backlogDb } from '@/lib/backlogDatabase';

// GET - Debug endpoint to check all backlog items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get all items including rejected ones for debugging
    const allItems = backlogDb.getAllBacklogItemsByProject(projectId);
    const nonRejectedItems = backlogDb.getBacklogItemsByProject(projectId);

    return NextResponse.json({
      projectId,
      totalItems: allItems.length,
      nonRejectedItems: nonRejectedItems.length,
      allItems,
      nonRejectedItems,
      success: true
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error.message },
      { status: 500 }
    );
  }
}