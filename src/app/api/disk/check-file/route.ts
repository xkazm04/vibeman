import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validatePathTraversal } from '@/lib/pathSecurity';

/**
 * POST /api/disk/check-file
 * Check if a file exists at the specified path
 *
 * Request body:
 * - filePath: string - Absolute file path to check
 *
 * Response:
 * - exists: boolean - Whether the file exists
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Security check - prevent directory traversal
    const traversalError = validatePathTraversal(filePath);
    if (traversalError) {
      return NextResponse.json(
        { error: traversalError },
        { status: 403 }
      );
    }

    // Normalize the path
    const normalizedPath = path.normalize(filePath);

    // Check if file exists
    const exists = fs.existsSync(normalizedPath);

    return NextResponse.json({
      exists,
      path: normalizedPath
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check file',
        exists: false
      },
      { status: 500 }
    );
  }
}

export const POST = withAccessControl(handlePost, '/api/disk/check-file', { skipProjectCheck: true, minRole: 'viewer' });
