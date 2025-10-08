import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { filePath, content, contextName } = await request.json();
    
    if (!filePath || !content || !contextName) {
      return NextResponse.json(
        { success: false, error: 'File path, content, and context name are required' },
        { status: 400 }
      );
    }

    // Use the provided file path directly if it's absolute, otherwise join with project root
    const isAbsolutePath = filePath.match(/^[A-Za-z]:\\/) || filePath.startsWith('/');
    const fullPath = isAbsolutePath ? filePath : join(process.cwd(), filePath);
    
    // Basic security check - ensure the path doesn't contain dangerous patterns
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    try {
      // Ensure the directory exists
      const dirPath = dirname(fullPath);
      if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }

      // Write the file
      await writeFile(fullPath, content, 'utf-8');
      
      return NextResponse.json({
        success: true,
        filePath,
        message: 'Context file saved successfully'
      });
    } catch (fileError) {
      console.error(`Failed to save file ${filePath}:`, fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to save file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Save context file API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}