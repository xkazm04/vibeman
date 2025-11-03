import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { createErrorResponse, notFoundResponse } from '../../../../lib/api-helpers';

async function declineSession(sessionId: string) {
  // Get all files in the session
  const sessionFiles = codeGenerationDb.getGeneratedFilesBySession(sessionId);

  if (sessionFiles.length === 0) {
    return null;
  }

  // Update all pending files in the session to rejected
  for (const file of sessionFiles) {
    if (file.status === 'pending') {
      codeGenerationDb.updateGeneratedFile(file.id, {
        status: 'rejected'
      });
    }
  }

  // Update session status to failed
  const updatedSession = codeGenerationDb.updateSession(sessionId, {
    status: 'failed',
    error_message: 'Session declined by user'
  });

  return { updatedSession, rejectedCount: sessionFiles.length };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return createErrorResponse('Session ID is required', 400);
    }

    const result = await declineSession(sessionId);

    if (!result) {
      return notFoundResponse('Session');
    }

    if (!result.updatedSession) {
      return createErrorResponse('Failed to update session', 500);
    }

    return NextResponse.json({
      success: true,
      message: 'Session declined successfully',
      session: result.updatedSession,
      rejectedFiles: result.rejectedCount
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}