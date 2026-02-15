import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { withObservability } from '@/lib/observability/middleware';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validateFilePath } from '@/lib/pathSecurity';

async function handlePost(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    // Validate file path for traversal attacks
    const validation = validateFilePath(filePath);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.error.includes('required') ? 400 : 403 }
      );
    }
    const fullPath = validation.resolvedPath;

    try {
      const content = await readFile(fullPath, 'utf-8');
      return NextResponse.json({
        success: true,
        content,
        filePath: fullPath
      });
    } catch (fileError) {
      // Use debug/info logging for file not found - it's a natural state
      const errorCode = (fileError as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        // File doesn't exist - this is expected in many cases, just return 404
        return NextResponse.json(
          {
            success: false,
            error: 'File not found',
            filePath: fullPath
          },
          { status: 404 }
        );
      }

      // Other errors (permissions, etc.) are actual problems worth logging
      return NextResponse.json(
        {
          success: false,
          error: `Failed to read file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath: fullPath
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(withAccessControl(handlePost, '/api/disk/read-file', { skipProjectCheck: true, minRole: 'viewer' }), '/api/disk/read-file');