import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
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
        error: error instanceof Error ? error.message : 'Failed to check file',
        exists: false
      },
      { status: 500 }
    );
  }
}
