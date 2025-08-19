import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { backlogDb } from '../../../../lib/backlogDatabase';

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

    // Get all completed sessions for this project that have pending files
    const sessions = codeGenerationDb.getSessionsWithPendingFiles(projectId);
    
    // Group files by session and get task titles
    const reviewSessions = sessions.map(session => {
      const files = codeGenerationDb.getPendingFilesBySession(session.id);
      const task = backlogDb.getBacklogItemById(session.task_id);
      
      return {
        sessionId: session.id,
        taskTitle: task?.title || `Task ${session.task_id}`,
        files: files
      };
    }).filter(session => session.files.length > 0);
    
    return NextResponse.json({
      success: true,
      sessions: reviewSessions
    });
  } catch (error) {
    console.error('Failed to get pending sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}