import { NextRequest, NextResponse } from 'next/server';
import { isClaudeFolderInitialized } from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/claude-code/status
 * Check the initialization status of Claude Code folder structure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Check Claude Code folder status
    const status = isClaudeFolderInitialized(projectPath);

    return NextResponse.json({
      exists: status.initialized || status.missing.length < 4, // Folder exists if not all items missing
      initialized: status.initialized,
      missing: status.missing,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}
