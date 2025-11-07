import { GitManager } from '@/lib/gitManager';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ERROR_STATUS } from '../utils';

export async function POST(request: NextRequest) {
  try {
    const { projectId, path, branch } = await request.json();

    // Check if it's a git repository
    const isGitRepo = await GitManager.isGitRepo(path);
    if (!isGitRepo) {
      return NextResponse.json(
        { error: 'Not a git repository' },
        { status: 400 }
      );
    }

    // Get git status
    const status = await GitManager.getStatus(path, branch ? `origin/${branch}` : undefined);

    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get git status';
    return NextResponse.json(
      {
        error: errorMessage,
        status: {
          ...DEFAULT_ERROR_STATUS,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}