import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';

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

    const pendingFiles = codeGenerationDb.getPendingFilesByProject(projectId);
    
    return NextResponse.json({
      success: true,
      count: pendingFiles.length,
      files: pendingFiles.map(file => ({
        id: file.id,
        filepath: file.filepath,
        action: file.action,
        created_at: file.created_at
      }))
    });
  } catch (error) {
    console.error('Failed to get pending count:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}