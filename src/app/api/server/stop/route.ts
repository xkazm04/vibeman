import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

/**
 * Create a success response
 */
function createSuccessResponse(message: string) {
  return NextResponse.json({
    success: true,
    message,
  });
}

/**
 * Create an error response
 */
function createErrorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Failed to stop process' },
    { status: 500 }
  );
}

/**
 * Handle no process found case
 */
function handleNoProcess(): ReturnType<typeof NextResponse.json> {
  return createSuccessResponse('No process found to stop');
}

/**
 * Handle already stopped process case
 */
function handleAlreadyStopped(projectId: string): ReturnType<typeof NextResponse.json> {
  processManager.removeProcess(projectId);
  return createSuccessResponse('Process was already stopped and has been cleared');
}

/**
 * Handle force removal of error state
 */
function handleForceRemoveError(projectId: string): ReturnType<typeof NextResponse.json> {
  processManager.removeProcess(projectId);
  return createSuccessResponse('Error state cleared and process removed');
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, force } = await request.json();

    // Ensure process manager is initialized
    await processManager.initialize();

    // If force is true, clear error state first
    if (force) {
      processManager.clearErrorState(projectId);
    }

    const status = processManager.getStatus(projectId);

    if (!status) {
      return handleNoProcess();
    }

    if (status.status === 'stopped') {
      return handleAlreadyStopped(projectId);
    }

    if (status.status === 'error' && force) {
      return handleForceRemoveError(projectId);
    }

    await processManager.stopProcess(projectId);

    return createSuccessResponse('Process stopped successfully');
  } catch (error) {
    return createErrorResponse(error);
  }
}
