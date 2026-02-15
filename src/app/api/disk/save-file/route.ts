import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { withObservability } from '@/lib/observability/middleware';
import { validateFilePath } from '@/lib/pathSecurity';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

async function handlePost(request: NextRequest) {
  try {
    const { filePath, content } = await request.json();

    if (content === undefined || content === null) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate file path for traversal attacks
    const validation = validateFilePath(filePath);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.error.includes('required') ? 400 : 403 }
      );
    }

    // Additional security - only allow saving within specific directories
    const allowedPaths = [
      'src/app/projects/ProjectAI/ScanIdeas/prompts',
      '.claude/requirements',
      'context'
    ];

    const isAllowed = allowedPaths.some(allowed =>
      filePath.startsWith(allowed) || filePath.includes(`/${allowed}/`) || filePath.includes(`\\${allowed}\\`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Writing to this directory is not allowed' },
        { status: 403 }
      );
    }

    const fullPath = validation.resolvedPath;

    try {
      // Ensure directory exists
      const dirPath = dirname(fullPath);
      await mkdir(dirPath, { recursive: true });

      // Write the file
      await writeFile(fullPath, content, 'utf-8');

      return NextResponse.json({
        success: true,
        message: 'File saved successfully',
        filePath: fullPath
      });
    } catch (fileError) {
      const errorCode = (fileError as NodeJS.ErrnoException).code;

      // Handle specific error codes
      if (errorCode === 'EACCES' || errorCode === 'EPERM') {
        return NextResponse.json(
          {
            success: false,
            error: 'Permission denied - cannot write to file',
            filePath: fullPath
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Failed to save file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath: fullPath
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save file'
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/disk/save-file');
