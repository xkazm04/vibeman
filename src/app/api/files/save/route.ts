import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { validatePathTraversal } from '@/lib/pathSecurity';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content } = await request.json();

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

    // Security: prevent directory traversal
    const traversalError = validatePathTraversal(filePath);
    if (traversalError) {
      return NextResponse.json(
        { success: false, error: traversalError },
        { status: 403 }
      );
    }

    // Only allow saving files that already exist (no arbitrary file creation)
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File does not exist' },
        { status: 404 }
      );
    }

    // Ensure parent directory exists (should always be true for existing files)
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      return NextResponse.json(
        { success: false, error: 'Parent directory does not exist' },
        { status: 404 }
      );
    }

    await writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save file',
      },
      { status: 500 }
    );
  }
}
