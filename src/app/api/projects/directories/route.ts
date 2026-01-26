import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, access } from 'fs/promises';
import { join } from 'path';

// Force dynamic rendering to prevent static analysis of file paths
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customBasePath = searchParams.get('basePath');

    const currentAppPath = process.cwd();
    let parentPath: string;

    // Use custom base path if provided and valid
    if (customBasePath) {
      try {
        await access(customBasePath);
        const stats = await stat(customBasePath);
        if (stats.isDirectory()) {
          parentPath = customBasePath;
        } else {
          // If provided path is not a directory, fall back to default
          parentPath = join(currentAppPath, '..');
        }
      } catch {
        // If provided path doesn't exist or can't be accessed, fall back to default
        parentPath = join(currentAppPath, '..');
      }
    } else {
      parentPath = join(currentAppPath, '..');
    }

    const entries = await readdir(parentPath);
    const directories = [];

    for (const entry of entries) {
      try {
        const fullPath = join(parentPath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Skip hidden directories and common non-project directories
          if (!entry.startsWith('.') &&
              !['node_modules', 'dist', 'build', '__pycache__'].includes(entry)) {
            directories.push({
              name: entry,
              path: fullPath
            });
          }
        }
      } catch {
        // Skip entries that can't be accessed
      }
    }

    return NextResponse.json({
      success: true,
      currentAppPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read directories'
      },
      { status: 500 }
    );
  }
}