import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { createErrorResponse } from '../../../../lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    const pendingFiles = codeGenerationDb.getPendingFilesByProject(projectId);
    
    return NextResponse.json({
      success: true,
      files: pendingFiles
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}