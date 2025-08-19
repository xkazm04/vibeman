import { NextRequest, NextResponse } from 'next/server';
import { codeGenerationDb } from '../../../../lib/codeGenerationDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Update file status to rejected
    const updatedFile = codeGenerationDb.updateGeneratedFile(fileId, {
      status: 'rejected'
    });

    if (!updatedFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    console.log(`Rejected file: ${updatedFile.filepath}`);

    return NextResponse.json({
      success: true,
      message: 'File rejected successfully',
      file: updatedFile
    });

  } catch (error) {
    console.error('Failed to reject file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}