import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { withObservability } from '@/lib/observability/middleware';

async function handlePost(request: NextRequest) {
  try {
    const { filePath, content } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      );
    }

    if (content === undefined || content === null) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Security check - prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
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

    // Handle both absolute and relative paths
    let fullPath: string;
    const projectRoot = process.cwd();

    // Check if it's an absolute path (Windows: C:\ or D:\ or Unix: /)
    const isAbsolutePath = /^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('/');

    if (isAbsolutePath) {
      fullPath = filePath;
    } else {
      fullPath = join(projectRoot, filePath);
    }

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
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/disk/save-file');
