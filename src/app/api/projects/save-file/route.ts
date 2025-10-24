import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { content, projectPath, filename, subfolder } = await request.json();

    if (!content || !projectPath || !filename) {
      return NextResponse.json(
        { success: false, error: 'Content, project path, and filename are required' },
        { status: 400 }
      );
    }

    // Security check - ensure the project path is valid
    if (projectPath.includes('..') || projectPath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid project path' },
        { status: 403 }
      );
    }

    // Create the target directory
    const targetDir = subfolder ? join(projectPath, subfolder) : projectPath;
    await mkdir(targetDir, { recursive: true });
    
    // Write the file
    const filePath = join(targetDir, filename);
    await writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      filePath: filePath
    });

  } catch (error) {
    console.error('File save error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save file' 
      },
      { status: 500 }
    );
  }
}