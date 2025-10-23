import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

/**
 * POST /api/project/files
 * Fetch files from a project for analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, filePaths, limit = 20 } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    let files: Array<{ path: string; content: string; type: string }> = [];

    if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
      // Read specific files provided
      console.log(`[API] Reading ${filePaths.length} specific files...`);

      for (const filePath of filePaths.slice(0, limit)) {
        try {
          const fullPath = join(projectPath, filePath);
          const content = await readFile(fullPath, 'utf-8');
          const ext = extname(filePath).slice(1);

          files.push({
            path: filePath,
            content,
            type: getFileType(ext)
          });
        } catch (error) {
          console.error(`Failed to read file: ${filePath}`, error);
          // Continue with other files
        }
      }

    } else {
      // Discover and read main implementation files
      console.log('[API] Discovering main implementation files...');

      const discoveredFiles = await discoverMainFiles(projectPath, limit);
      files = discoveredFiles;
    }

    console.log(`[API] Returning ${files.length} files for analysis`);

    return NextResponse.json({ files });

  } catch (error) {
    console.error('[API] Error fetching project files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

/**
 * Discover main implementation files in a project
 */
async function discoverMainFiles(
  projectPath: string,
  limit: number
): Promise<Array<{ path: string; content: string; type: string }>> {
  const files: Array<{ path: string; content: string; type: string }> = [];

  const includedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'];
  const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv'];

  async function walkDirectory(dir: string, depth: number = 0): Promise<void> {
    if (depth > 3 || files.length >= limit) return; // Limit depth and file count

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= limit) break;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludedDirs.includes(entry.name)) {
            await walkDirectory(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);

          if (includedExtensions.includes(ext)) {
            try {
              const content = await readFile(fullPath, 'utf-8');
              const relativePath = relative(projectPath, fullPath);

              // Skip very large files (>100KB)
              if (content.length < 100000) {
                files.push({
                  path: relativePath,
                  content,
                  type: getFileType(ext.slice(1))
                });
              }
            } catch (readError) {
              console.error(`Failed to read file: ${fullPath}`, readError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read directory: ${dir}`, error);
    }
  }

  await walkDirectory(projectPath);
  return files;
}

/**
 * Get file type for syntax highlighting
 */
function getFileType(ext: string): string {
  const typeMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
  };

  return typeMap[ext] || 'text';
}
