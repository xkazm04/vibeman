import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get all files in the session
    const sessionFiles = codeGenerationDb.getGeneratedFilesBySession(sessionId);
    
    if (sessionFiles.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or has no files' },
        { status: 404 }
      );
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

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    console.log(`Declined session: ${sessionId} with ${sessionFiles.length} files`);

    return NextResponse.json({
      success: true,
      message: 'Session declined successfully',
      session: updatedSession,
      rejectedFiles: sessionFiles.length
    });

  } catch (error) {
    console.error('Failed to decline session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}