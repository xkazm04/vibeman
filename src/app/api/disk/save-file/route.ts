import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { folderPath, fileName, content, projectPath } = await request.json();
    
    if (!folderPath || !fileName || content === undefined) {
      return NextResponse.json(
        { success: false, error: 'Folder path, file name, and content are required' },
        { status: 400 }
      );
    }

    // Security check - prevent directory traversal
    if (folderPath.includes('..') || fileName.includes('..') || folderPath.includes('~') || fileName.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Construct the full path - use projectPath if provided, otherwise use current working directory
    const baseDir = projectPath || process.cwd();
    const fullFolderPath = join(baseDir, folderPath);
    const fullFilePath = join(fullFolderPath, fileName);
    
    // Security check - ensure the path is within the base directory
    if (!fullFilePath.startsWith(baseDir)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      );
    }

    try {
      // Ensure the directory exists
      if (!existsSync(fullFolderPath)) {
        await mkdir(fullFolderPath, { recursive: true });
      }

      // Write the file
      await writeFile(fullFilePath, content, 'utf-8');
      
      return NextResponse.json({
        success: true,
        filePath: join(folderPath, fileName),
        message: 'File saved successfully'
      });
    } catch (fileError) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to save file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          filePath: join(folderPath, fileName)
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