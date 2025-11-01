import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { TreeNode } from '@/types';

// Files and directories to ignore in NextJS projects
const IGNORED_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  'dist',
  'build',
  '.DS_Store',
  'Thumbs.db',
  '.vscode',
  '.idea',
  '*.tmp',
  '*.temp',
  '.cache',
  'coverage',
  '.nyc_output',
  '.vercel',
  '.netlify',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

// File extensions to include (and their descriptions)
const FILE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript file',
  '.tsx': 'TypeScript React component',
  '.js': 'JavaScript file',
  '.jsx': 'JavaScript React component',
  '.json': 'JSON configuration file',
  '.md': 'Markdown documentation',
  '.py': 'Python file',
  '.java': 'Java file',
  '.go': 'Go source file',
  '.rs': 'Rust source file',
  '.css': 'CSS stylesheet',
  '.scss': 'SCSS stylesheet',
  '.sass': 'SASS stylesheet',
  '.less': 'LESS stylesheet',
  '.html': 'HTML file',
  '.yml': 'YAML configuration',
  '.yaml': 'YAML configuration',
  '.env.example': 'Environment variables example',
  '.gitignore': 'Git ignore rules',
  '.eslintrc': 'ESLint configuration',
  '.prettierrc': 'Prettier configuration',
  'tailwind.config': 'Tailwind CSS configuration',
  'next.config': 'Next.js configuration',
  'package.json': 'Package configuration',
  'tsconfig.json': 'TypeScript configuration',
  'README': 'Project documentation',
};

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function shouldIgnore(name: string): boolean {
  // Debug log for "Backlog" specifically - check which pattern matches
  if (name.toLowerCase().includes('backlog')) {
    console.log(`🔍 Checking "${name}":`);
    IGNORED_PATTERNS.forEach(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(name)) {
          console.log(`   ❌ MATCHED by pattern: "${pattern}" (regex)`);
        }
      } else if (name === pattern) {
        console.log(`   ❌ MATCHED by pattern: "${pattern}" (exact match)`);
      } else if (name.startsWith(pattern)) {
        console.log(`   ❌ MATCHED by pattern: "${pattern}" (startsWith)`);
      }
    });
  }
  
  // Log to debug what's being checked
  const ignored = IGNORED_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(name);
    }
    return name === pattern || name.startsWith(pattern);
  });
  
  if (name.toLowerCase().includes('backlog')) {
    console.log(`   Result: ${ignored ? 'IGNORED' : 'INCLUDED'}`);
  }
  
  return ignored;
}

function getFileDescription(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);
  
  // Check for specific files first
  if (FILE_EXTENSIONS[fileName]) {
    return FILE_EXTENSIONS[fileName];
  }
  
  // Check for files with specific base names
  if (FILE_EXTENSIONS[baseName]) {
    return FILE_EXTENSIONS[baseName];
  }
  
  // Check by extension
  if (FILE_EXTENSIONS[ext]) {
    return FILE_EXTENSIONS[ext];
  }
  
  // Default descriptions
  if (ext) {
    return `${ext.substring(1).toUpperCase()} file`;
  }
  
  return 'File';
}

function getFolderDescription(folderName: string, childCount: number): string {
  const descriptions: Record<string, string> = {
    'src': 'Source code directory',
    'app': 'Next.js app directory',
    'pages': 'Next.js pages directory',
    'components': 'React components',
    'lib': 'Utility libraries',
    'utils': 'Utility functions',
    'hooks': 'React custom hooks',
    'styles': 'Stylesheets and themes',
    'public': 'Static assets',
    'assets': 'Project assets',
    'images': 'Image files',
    'icons': 'Icon files',
    'fonts': 'Font files',
    'data': 'Data files',
    'config': 'Configuration files',
    'types': 'TypeScript type definitions',
    'interfaces': 'TypeScript interfaces',
    'api': 'API routes',
    'middleware': 'Middleware functions',
    'stores': 'State management',
    'context': 'React context providers',
    'providers': 'React providers',
    'layouts': 'Layout components',
    'ui': 'UI components',
    'common': 'Common utilities',
    'shared': 'Shared resources',
    'constants': 'Application constants',
    'helpers': 'Helper functions',
    'services': 'Service layer',
    'models': 'Data models',
    'schemas': 'Data schemas',
    'tests': 'Test files',
    '__tests__': 'Test files',
    'spec': 'Test specifications',
    'docs': 'Documentation',
    'examples': 'Example code',
  };
  
  const baseDescription = descriptions[folderName.toLowerCase()] || 'Directory';
  return `${baseDescription} (${childCount} items)`;
}

async function scanDirectory(dirPath: string, basePath: string): Promise<TreeNode | null> {
  try {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);
    
    // Debug: Log the full path being scanned
    const relativePath = path.relative(basePath, dirPath);
    if (relativePath.toLowerCase().includes('backlog')) {
      console.log(`🔍 Scanning path: ${dirPath}`);
      console.log(`   Relative: ${relativePath}`);
      console.log(`   Name: ${name}`);
    }
    
    if (shouldIgnore(name)) {
      if (name.toLowerCase().includes('backlog')) {
        console.log(`   ❌ IGNORED by shouldIgnore`);
      }
      return null;
    }
    
    if (stats.isDirectory()) {
      const entries = await fs.readdir(dirPath);
      
      // Debug log for Backlog folder - before processing
      if (name.toLowerCase().includes('backlog')) {
        console.log(`📁 Reading folder "${name}"`);
        console.log(`   Raw entries:`, entries);
      }
      
      const children: TreeNode[] = [];
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const childNode = await scanDirectory(entryPath, basePath);
        if (childNode) {
          children.push(childNode);
        }
      }
      
      // Debug log for Backlog folder - after processing
      if (name.toLowerCase().includes('backlog')) {
        console.log(`📁 Folder "${name}": ${children.length} children found after filtering`);
        console.log(`   Valid children:`, children.map(c => c.name));
      }
      
      // Sort children: folders first, then files, both alphabetically
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      const relativePath = path.relative(basePath, dirPath);
      const nodeId = relativePath || 'root';
      
      // Include folder even if it has no children (empty folders should be visible)
      return {
        id: nodeId,
        name,
        type: 'folder',
        description: getFolderDescription(name, children.length),
        detailedDescription: `Folder containing ${children.length} items`,
        children: children.length > 0 ? children : undefined,
        path: relativePath || dirPath,
      };
    } else {
      // Check file size
      if (stats.size > MAX_FILE_SIZE) {
        return null;
      }
      
      const ext = path.extname(name).toLowerCase();
      const baseName = path.basename(name, ext);
      
      // Check if we should include this file type
      const shouldInclude = 
        FILE_EXTENSIONS[name] ||
        FILE_EXTENSIONS[baseName] ||
        FILE_EXTENSIONS[ext] ||
        ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss', '.html', '.py'].includes(ext);
      
      if (!shouldInclude) {
        return null;
      }
      
      const relativePath = path.relative(basePath, dirPath);
      const sizeKB = Math.round(stats.size / 1024);
      
      return {
        id: relativePath,
        name,
        type: 'file',
        description: getFileDescription(name),
        detailedDescription: `${getFileDescription(name)} (${sizeKB}KB)`,
        path: relativePath,
      };
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }
    
    // Verify the path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 404 }
      );
    }
    
    // Scan the directory structure
    const structure = await scanDirectory(projectPath, projectPath);
    
    if (!structure) {
      return NextResponse.json(
        { error: 'Failed to scan project structure' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      structure,
      scannedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Project structure scan error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to scan project structure'
      },
      { status: 500 }
    );
  }
} 