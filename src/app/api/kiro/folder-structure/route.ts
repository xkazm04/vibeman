import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface FolderNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FolderNode[];
}

const IGNORED_ITEMS = [
  'node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea',
  'coverage', '.nyc_output', 'logs', '*.log', '.DS_Store', 'Thumbs.db'
];

const ALLOWED_EXTENSIONS = ['.md', '.txt', '.json', '.yml', '.yaml', '.env'];

function shouldIgnoreItem(item: string): boolean {
  return IGNORED_ITEMS.some(ignored =>
    item === ignored ||
    item.startsWith('.') && item !== '.env' ||
    item.endsWith('.log')
  );
}

function shouldIncludeFile(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext));
}

function sortNodes(a: FolderNode, b: FolderNode): number {
  if (a.type === b.type) {
    return a.name.localeCompare(b.name);
  }
  return a.type === 'folder' ? -1 : 1;
}

async function createFolderNode(
  item: string,
  itemRelativePath: string,
  fullPath: string,
  maxDepth: number,
  currentDepth: number
): Promise<FolderNode> {
  const node: FolderNode = {
    name: item,
    path: itemRelativePath,
    type: 'folder'
  };

  if (currentDepth < maxDepth - 1) {
    node.children = await buildFolderTree(fullPath, itemRelativePath, maxDepth, currentDepth + 1);
  }

  return node;
}

function createFileNode(item: string, itemRelativePath: string): FolderNode {
  return {
    name: item,
    path: itemRelativePath,
    type: 'file'
  };
}

async function processItem(
  item: string,
  dirPath: string,
  relativePath: string,
  maxDepth: number,
  currentDepth: number
): Promise<FolderNode | null> {
  if (shouldIgnoreItem(item)) {
    return null;
  }

  const fullPath = join(dirPath, item);
  const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

  try {
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      return await createFolderNode(item, itemRelativePath, fullPath, maxDepth, currentDepth);
    } else if (stats.isFile() && shouldIncludeFile(item)) {
      return createFileNode(item, itemRelativePath);
    }
  } catch (statError) {
    // Skip items that can't be accessed
  }

  return null;
}

async function buildFolderTree(
  dirPath: string,
  relativePath: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FolderNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const items = await readdir(dirPath);
    const nodePromises = items.map(item =>
      processItem(item, dirPath, relativePath, maxDepth, currentDepth)
    );

    const processedNodes = await Promise.all(nodePromises);
    const nodes = processedNodes.filter((node): node is FolderNode => node !== null);

    return nodes.sort(sortNodes);
  } catch (error) {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    // Use project path if provided, otherwise use current working directory
    const basePath = projectPath || process.cwd();

    const structure = await buildFolderTree(basePath, '', 3);

    return NextResponse.json({
      success: true,
      structure,
      basePath
    });

  } catch (error) {
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