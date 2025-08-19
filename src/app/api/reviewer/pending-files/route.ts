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
      files: pendingFiles
    });
  } catch (error) {
    console.error('Failed to get pending files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}