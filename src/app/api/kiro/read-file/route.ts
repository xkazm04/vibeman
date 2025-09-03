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

    // Handle both absolute and relative paths
    let fullPath: string;
    const projectRoot = process.cwd();
    
    // Check if it's an absolute path (Windows: C:\ or Unix: /)
    const isAbsolutePath = filePath.match(/^[A-Za-z]:\\/) || filePath.startsWith('/');
    
    if (isAbsolutePath) {
      fullPath = filePath;
    } else {
      fullPath = join(projectRoot, filePath);
    }
    
    // Security check - prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      return NextResponse.json({
        success: true,
        content,
        filePath
      });
    } catch (fileError) {
      console.error(`Failed to read file ${filePath}:`, fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to read file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath
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