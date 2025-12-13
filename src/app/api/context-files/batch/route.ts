import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { contextDb } from '@/app/db';
import { logger } from '@/lib/logger';

interface BatchContextFileResult {
  contextId: string;
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * POST /api/context-files/batch
 * Batch load multiple context file contents
 */
export async function POST(request: NextRequest) {
  try {
    const { contextIds } = await request.json();

    if (!contextIds || !Array.isArray(contextIds) || contextIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Context IDs array is required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (contextIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 contexts per batch' },
        { status: 400 }
      );
    }

    const results: BatchContextFileResult[] = await Promise.all(
      contextIds.map(async (contextId: string): Promise<BatchContextFileResult> => {
        try {
          // Get context from database
          const context = contextDb.getContextById(contextId);

          if (!context) {
            return {
              contextId,
              success: false,
              error: 'Context not found',
            };
          }

          if (!context.has_context_file || !context.context_file_path) {
            return {
              contextId,
              success: false,
              error: 'Context file not configured',
            };
          }

          // Read file content
          const content = await readFile(context.context_file_path, 'utf-8');

          return {
            contextId,
            success: true,
            content,
          };
        } catch (fileError) {
          const errorCode = (fileError as NodeJS.ErrnoException).code;
          return {
            contextId,
            success: false,
            error: errorCode === 'ENOENT' ? 'File not found on disk' : 'Failed to read file',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('[context-files/batch] Error loading context files:', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
