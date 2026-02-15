import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validateFilePath } from '@/lib/pathSecurity';

async function handlePost(request: NextRequest) {
  try {
    const { filePath, content, contextName } = await request.json();
    
    if (!filePath || !content || !contextName) {
      return NextResponse.json(
        { success: false, error: 'File path, content, and context name are required' },
        { status: 400 }
      );
    }

    // Validate file path for traversal attacks
    const validation = validateFilePath(filePath);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      );
    }
    const fullPath = validation.resolvedPath;

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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAccessControl(handlePost, '/api/disk/save-context-file', { skipProjectCheck: true, minRole: 'developer' });