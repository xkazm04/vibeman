import { NextRequest, NextResponse } from 'next/server';
import { triggerDocSync } from '@/app/features/Docs/lib/docsSync';

/**
 * POST /api/docs/sync-on-commit - Trigger documentation sync after a git commit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectName, commitSha, commitMessage } = body;

    if (!projectId || !projectPath || !projectName) {
      return NextResponse.json(
        { error: 'projectId, projectPath, and projectName are required' },
        { status: 400 }
      );
    }

    // Trigger sync asynchronously
    const updatedCount = await triggerDocSync({
      projectId,
      projectPath,
      projectName,
      trigger: 'commit'
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      commitSha,
      message: `Documentation synced after commit: ${commitMessage || commitSha}`
    });
  } catch (error) {
    console.error('Error syncing documentation on commit:', error);
    return NextResponse.json(
      { error: 'Failed to sync documentation', details: String(error) },
      { status: 500 }
    );
  }
}
