import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface FolderNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FolderNode[];
}

async function buildFolderTree(dirPath: string, relativePath: string = '', maxDepth: number = 3, currentDepth: number = 0): Promise<FolderNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const items = await readdir(dirPath);
    const nodes: FolderNode[] = [];

    // Filter out common ignored directories and files
    const ignoredItems = [
      'node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea',
      'coverage', '.nyc_output', 'logs', '*.log', '.DS_Store', 'Thumbs.db'
    ];

    for (const item of items) {
      // Skip ignored items
      if (ignoredItems.some(ignored => 
        item === ignored || 
        item.startsWith('.') && item !== '.env' ||
        item.endsWith('.log')
      )) {
        continue;
      }

      const fullPath = join(dirPath, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

      try {
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          const node: FolderNode = {
            name: item,
            path: itemRelativePath,
            type: 'folder'
          };

          // Recursively get children for folders
          if (currentDepth < maxDepth - 1) {
            node.children = await buildFolderTree(fullPath, itemRelativePath, maxDepth, currentDepth + 1);
          }

          nodes.push(node);
        } else if (stats.isFile()) {
          // Only include certain file types for display
          const allowedExtensions = ['.md', '.txt', '.json', '.yml', '.yaml', '.env'];
          const hasAllowedExtension = allowedExtensions.some(ext => item.toLowerCase().endsWith(ext));
          
          if (hasAllowedExtension) {
            nodes.push({
              name: item,
              path: itemRelativePath,
              type: 'file'
            });
          }
        }
      } catch (statError) {
        // Skip items that can't be accessed
        continue;
      }
    }

    // Sort: folders first, then files, both alphabetically
    return nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'folder' ? -1 : 1;
    });

  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    
    // Use project path if provided, otherwise use current working directory
    const basePath = projectPath || process.cwd();
    
    console.log('Building folder structure for:', basePath);
    
    const structure = await buildFolderTree(basePath, '', 3);
    
    return NextResponse.json({
      success: true,
      structure,
      basePath
    });
    
  } catch (error) {
    console.error('Folder structure API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load folder structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}