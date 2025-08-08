import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface FolderNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FolderNode[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const basePath = searchParams.get('path') || '';
    const projectPath = searchParams.get('projectPath');
    
    // Use the provided project path or fall back to current working directory
    const projectRoot = projectPath || process.cwd();
    const fullPath = basePath ? join(projectRoot, basePath) : projectRoot;
    
    // Security check - ensure the path is within the project directory
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }

    try {
      const folderStructure = await getFolderStructure(fullPath, basePath, projectRoot);
      
      return NextResponse.json({
        success: true,
        structure: folderStructure
      });
    } catch (error) {
      console.error(`Failed to read folder structure for ${basePath}:`, error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to read folder structure: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Folder structure API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getFolderStructure(
  fullPath: string, 
  relativePath: string, 
  projectRoot: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FolderNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = await readdir(fullPath);
    const nodes: FolderNode[] = [];
    
    // Filter out common directories/files that shouldn't be shown
    const excludePatterns = [
      /^\./, // Hidden files/folders
      /^node_modules$/,
      /^\.next$/,
      /^\.git$/,
      /^dist$/,
      /^build$/,
      /^coverage$/,
      /^\.vscode$/,
      /^\.idea$/,
      /\.log$/,
      /\.tmp$/,
      /\.cache$/
    ];

    for (const entry of entries) {
      // Skip excluded patterns
      if (excludePatterns.some(pattern => pattern.test(entry))) {
        continue;
      }

      const entryFullPath = join(fullPath, entry);
      const entryRelativePath = relativePath ? `${relativePath}/${entry}` : entry;
      
      try {
        const stats = await stat(entryFullPath);
        
        if (stats.isDirectory()) {
          const children = currentDepth < maxDepth - 1 
            ? await getFolderStructure(entryFullPath, entryRelativePath, projectRoot, maxDepth, currentDepth + 1)
            : undefined;
            
          nodes.push({
            name: entry,
            path: entryRelativePath,
            type: 'folder',
            children: children && children.length > 0 ? children : undefined
          });
        } else if (stats.isFile()) {
          // Only include certain file types for context
          const fileExtensions = ['.md', '.txt', '.json', '.yml', '.yaml', '.toml'];
          const hasValidExtension = fileExtensions.some(ext => entry.toLowerCase().endsWith(ext));
          
          if (hasValidExtension) {
            nodes.push({
              name: entry,
              path: entryRelativePath,
              type: 'file'
            });
          }
        }
      } catch (statError) {
        // Skip entries that can't be stat'd (permission issues, etc.)
        console.warn(`Could not stat ${entryFullPath}:`, statError);
        continue;
      }
    }
    
    // Sort: folders first, then files, both alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return nodes;
  } catch (error) {
    console.error(`Error reading directory ${fullPath}:`, error);
    return [];
  }
}