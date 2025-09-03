import { NextRequest, NextResponse } from 'next/server';
import { backlogDb } from '@/lib/backlogDatabase';
import { v4 as uuidv4 } from 'uuid';

// POST - Create a test backlog item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Create a test item
    const testItem = backlogDb.createBacklogItem({
      id: uuidv4(),
      project_id: projectId,
      title: 'Test Backlog Item',
      description: 'This is a test backlog item created for debugging purposes.',
      status: 'pending',
      type: 'feature',
      impacted_files: [
        { filepath: 'src/test.ts', type: 'modify' }
      ]
    });

    return NextResponse.json({
      message: 'Test item created successfully',
      item: testItem,
      success: true
    });
  } catch (error) {
    console.error('Error creating test item:', error);
    return NextResponse.json(
      { error: 'Failed to create test item', details: error.message },
      { status: 500 }
    );
  }
}