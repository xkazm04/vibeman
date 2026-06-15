import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import { handleApiError } from '@/lib/api-errors';
import { analyzeUnusedCode } from '@/lib/scan/unusedCodeDetector';

/**
 * POST /api/unused-code
 *
 * Analyzes a Next.js project to find unused components.
 *
 * The actual AST-based detection lives in `@/lib/scan/unusedCodeDetector`
 * (`analyzeUnusedCode`). This route only handles request parsing,
 * validation, and the optional streaming wrapper.
 *
 * Request body:
 * {
 *   projectPath: string;
 *   projectType: string;
 *   stream?: boolean;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   unusedFiles: Array<{
 *     filePath: string;
 *     relativePath: string;
 *     exports: string[];
 *     reason: string;
 *   }>;
 *   stats: {
 *     totalFiles: number;
 *     totalExports: number;
 *     unusedExports: number;
 *   };
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, projectType, stream } = body;

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectPath is required' },
        { status: 400 }
      );
    }

    if (projectType !== 'nextjs') {
      return NextResponse.json(
        { success: false, error: 'Only Next.js projects are supported' },
        { status: 400 }
      );
    }

    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Project path does not exist' },
        { status: 404 }
      );
    }

    // If streaming is requested, use ReadableStream
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Run analysis with progress callback
            const result = await analyzeUnusedCode(projectPath, (current, total, currentFile) => {
              // Send progress update
              const progressData = JSON.stringify({
                type: 'progress',
                current,
                total,
                currentFile,
                progress: Math.round((current / total) * 100),
              }) + '\n';

              controller.enqueue(encoder.encode(progressData));
            });

            // Send final result
            const finalData = JSON.stringify({
              type: 'complete',
              result,
            }) + '\n';

            controller.enqueue(encoder.encode(finalData));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }) + '\n';

            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Non-streaming mode (backward compatibility)
    const result = await analyzeUnusedCode(projectPath);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Unused code analysis');
  }
}
