import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { validateProjectPath, validateSubfolder, validateFilename } from '@/lib/pathSecurity';
import { withAccessControl } from '@/lib/api-helpers/accessControl';

async function handlePost(request: NextRequest) {
  try {
    const { content, projectPath, filename, subfolder } = await request.json();

    if (!content || !projectPath || !filename) {
      return NextResponse.json(
        { success: false, error: 'Content, project path, and filename are required' },
        { status: 400 }
      );
    }

    // Validate all path components for traversal attacks
    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { success: false, error: pathError },
        { status: 403 }
      );
    }

    const subfolderError = validateSubfolder(subfolder);
    if (subfolderError) {
      return NextResponse.json(
        { success: false, error: subfolderError },
        { status: 403 }
      );
    }

    const filenameError = validateFilename(filename);
    if (filenameError) {
      return NextResponse.json(
        { success: false, error: filenameError },
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save file'
      },
      { status: 500 }
    );
  }
}

export const POST = withAccessControl(handlePost, '/api/projects/save-file', { skipProjectCheck: true, minRole: 'developer' });