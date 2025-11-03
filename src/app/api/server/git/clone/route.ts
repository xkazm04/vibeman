import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GitManager } from '@/lib/gitManager';

/**
 * Helper to create failure response
 */
function failureResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Ensure target directory exists and is empty
 */
async function ensureEmptyDirectory(targetPath: string) {
  try {
    await fs.access(targetPath);

    // Directory exists - check if it's empty
    const files = await fs.readdir(targetPath);
    if (files.length > 0) {
      return failureResponse('Target directory is not empty', 400);
    }
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(targetPath, { recursive: true });
  }

  return null; // No errors
}

export async function POST(request: NextRequest) {
  try {
    const { repository, targetPath, branch } = await request.json();

    // Validate target directory
    const dirError = await ensureEmptyDirectory(targetPath);
    if (dirError) return dirError;

    // Clone the repository
    const result = await GitManager.clone(repository, targetPath, branch);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return failureResponse(
      error instanceof Error ? error.message : 'Failed to clone repository',
      500
    );
  }
}