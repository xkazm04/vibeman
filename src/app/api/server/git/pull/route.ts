import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';
import { GitManager } from '@/lib/gitManager';

/**
 * Helper to create failure response
 */
function failureResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Validate project can be pulled
 */
async function validatePullPreconditions(projectId: string, path: string) {
  // Check if the project is running
  const status = processManager.getStatus(projectId);
  if (status && status.status === 'running') {
    return failureResponse('Cannot pull while the server is running. Please stop it first.', 400);
  }

  // Check if it's a git repository
  const isGitRepo = await GitManager.isGitRepo(path);
  if (!isGitRepo) {
    return failureResponse('Not a git repository', 400);
  }

  return null; // No errors
}

/**
 * Switch to target branch if needed
 */
async function ensureCorrectBranch(path: string, targetBranch?: string) {
  if (!targetBranch) return null;

  const currentBranch = await GitManager.getCurrentBranch(path);
  if (currentBranch === targetBranch) return null;

  const switchResult = await GitManager.switchBranch(path, targetBranch);
  if (!switchResult.success) {
    return NextResponse.json(switchResult, { status: 400 });
  }

  return null; // No errors
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, path, branch } = await request.json();

    // Validate preconditions
    const validationError = await validatePullPreconditions(projectId, path);
    if (validationError) return validationError;

    // Switch to correct branch if needed
    const branchError = await ensureCorrectBranch(path, branch);
    if (branchError) return branchError;

    // Pull latest changes
    const result = await GitManager.pull(path, branch);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return failureResponse(
      error instanceof Error ? error.message : 'Failed to pull changes',
      500
    );
  }
}