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
      console.error(`Failed to read file ${fullPath}:`, fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to read file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath: fullPath
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}