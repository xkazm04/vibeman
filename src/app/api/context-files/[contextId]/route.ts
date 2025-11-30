import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { contextDb } from '@/app/db';

/**
 * GET /api/context-files/:contextId
 * Load context file content by context ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> }
) {
  try {
    const { contextId } = await params;

    if (!contextId) {
      return NextResponse.json(
        { success: false, error: 'Context ID is required' },
        { status: 400 }
      );
    }

    // Get context from database
    const context = contextDb.getContextById(contextId);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Context not found' },
        { status: 404 }
      );
    }

    if (!context.has_context_file || !context.context_file_path) {
      return NextResponse.json(
        { success: false, error: 'Context file not configured' },
        { status: 404 }
      );
    }

    // Read file content
    try {
      const content = await readFile(context.context_file_path, 'utf-8');

      // Return text response for backward compatibility
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (fileError) {
      const errorCode = (fileError as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Context file not found on disk' },
          { status: 404 }
        );
      }
      throw fileError;
    }
  } catch (error) {
    console.error('[context-files] Error loading context file:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
