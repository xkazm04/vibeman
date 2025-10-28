import { NextRequest, NextResponse } from 'next/server';
import { contextDb } from '@/app/db';

/**
 * PATCH /api/contexts/preview - Update context preview image
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, preview } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    // preview can be null to remove the preview, or a string path
    if (preview !== null && typeof preview !== 'string') {
      return NextResponse.json(
        { error: 'Preview must be a string path or null' },
        { status: 400 }
      );
    }

    const updatedContext = contextDb.updateContext(contextId, {
      preview: preview || null,
    });

    if (!updatedContext) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedContext,
    });
  } catch (error) {
    console.error('Failed to update context preview:', error);
    return NextResponse.json(
      {
        error: 'Failed to update context preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
