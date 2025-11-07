import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security check - prevent directory traversal (do this first)
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Handle both absolute and relative paths
    let fullPath: string;
    const projectRoot = process.cwd();
    
    // Check if it's an absolute path (Windows: C:\ or D:\ or Unix: /)
    const isAbsolutePath = /^[A-Za-z]:[\\\/]/.test(filePath) || filePath.startsWith('/');
    
    if (isAbsolutePath) {
      // Use the absolute path directly, don't join with projectRoot
      fullPath = filePath;
    } else {
      // Only join relative paths with project root
      fullPath = join(projectRoot, filePath);
    }

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