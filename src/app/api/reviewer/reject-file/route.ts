import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';
import { createErrorResponse, notFoundResponse } from '../../../../lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return createErrorResponse('File ID is required', 400);
    }

    // Update file status to rejected
    const updatedFile = codeGenerationDb.updateGeneratedFile(fileId, {
      status: 'rejected'
    });

    if (!updatedFile) {
      return notFoundResponse('File');
    }

    return NextResponse.json({
      success: true,
      message: 'File rejected successfully',
      file: updatedFile
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}