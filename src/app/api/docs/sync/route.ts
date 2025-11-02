import { NextRequest, NextResponse } from 'next/server';
import { syncStaleDocs } from '@/app/features/Docs/lib/docsGenerator';

/**
 * POST /api/docs/sync - Sync stale documentation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectName, minutesOld } = body;

    if (!projectId || !projectPath || !projectName) {
      return NextResponse.json(
        { error: 'projectId, projectPath, and projectName are required' },
        { status: 400 }
      );
    }

    const updatedCount = await syncStaleDocs(
      projectId,
      projectPath,
      projectName,
      minutesOld
    );

    return NextResponse.json({
      success: true,
      updatedCount
    });
  } catch (error) {
    console.error('Error syncing documentation:', error);
    return NextResponse.json(
      { error: 'Failed to sync documentation', details: String(error) },
      { status: 500 }
    );
  }
}
