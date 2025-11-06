import { NextRequest, NextResponse } from 'next/server';
import { generateAIReview } from '@/app/projects/ProjectAI/generateAIReview';
import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { contextDb } from '@/app/db';

/**
 * Gather codebase files organized by type for AI analysis
 */
async function gatherCodebaseResources(projectPath: string, projectId?: string) {
  const configFiles: Array<{ path: string; content: string; type: string }> = [];
  const mainFiles: Array<{ path: string; content: string; type: string }> = [];
  const documentationFiles: Array<{ path: string; content: string; type: string }> = [];

  // Fetch contexts from database if projectId is provided
  let contexts: Array<{ name: string; description: string; file_paths: string[] }> = [];
  if (projectId) {
    try {
      const dbContexts = contextDb.getContextsByProject(projectId);
      contexts = dbContexts.map(ctx => ({
        name: ctx.name,
        description: ctx.description || '',
        file_paths: JSON.parse(ctx.file_paths)
      }));
    } catch {
      // Continue without contexts
    }
  }

  const configFileNames = [
    'package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts', 'next.config.mjs',
    'tailwind.config.js', 'tailwind.config.ts', '.eslintrc.js', '.eslintrc.json',
    'vite.config.ts', 'vite.config.js', 'webpack.config.js'
  ];

  const docFileNames = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'CLAUDE.md'];

  const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', 'database', 'coverage', '.vscode', '.idea'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs'];

  // Helper to read a file safely with size tracking
  async function readFileSafe(filePath: string): Promise<{ path: string; content: string; type: string; size: number } | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const ext = extname(filePath).slice(1);
      const relativePath = relative(projectPath, filePath);

      // Skip very large files (>300KB) but track size for prioritization
      if (content.length > 300000) {
        return null;
      }

      return {
        path: relativePath.replace(/\\/g, '/'),
        content,
        type: getFileType(ext),
        size: content.length
      };
    } catch (error) {
      // Silently skip files we can't read (permissions, binary files, etc.)
      return null;
    }
  }

  // Helper to gather files from project root
  async function gatherRootFiles(fileNames: string[]): Promise<Array<{ path: string; content: string; type: string }>> {
    const files: Array<{ path: string; content: string; type: string }> = [];
    try {
      for (const fileName of fileNames) {
        const filePath = join(projectPath, fileName);
        const file = await readFileSafe(filePath);
        if (file) {
          files.push(file);
        }
      }
    } catch {
      // Continue without files
    }
    return files;
  }

  // Gather config files from project root
  configFiles.push(...await gatherRootFiles(configFileNames));

  // Gather documentation files from project root
  documentationFiles.push(...await gatherRootFiles(docFileNames));

  // Gather main implementation files with prioritization
  // Priority: src/ app/ lib/ components/ pages/ api/ routes/ controllers/ models/ services/
  const priorityDirs = ['src', 'app', 'lib', 'components', 'pages', 'api', 'routes', 'controllers', 'models', 'services', 'core', 'utils'];
  const allFiles: Array<{ path: string; content: string; type: string; size: number; priority: number }> = [];

  async function walkDirectory(dir: string, depth: number = 0, isPriority: boolean = false): Promise<void> {
    if (depth > 6 || allFiles.length >= 100) return; // Increased limits for better coverage

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (allFiles.length >= 100) break;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludedDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            const isEntryPriority = priorityDirs.includes(entry.name.toLowerCase());
            await walkDirectory(fullPath, depth + 1, isPriority || isEntryPriority);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (codeExtensions.includes(ext)) {
            const file = await readFileSafe(fullPath);
            if (file) {
              // Assign priority: higher priority for smaller files in priority directories
              const sizePriority = file.size < 50000 ? 2 : file.size < 100000 ? 1 : 0;
              const dirPriority = isPriority ? 3 : 0;
              allFiles.push({
                ...file,
                priority: dirPriority + sizePriority
              });
            }
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  await walkDirectory(projectPath);

  // Sort by priority (higher first) and take top 50-60 files
  allFiles.sort((a, b) => b.priority - a.priority);
  const topFiles = allFiles.slice(0, 60);

  // Remove priority field before adding to mainFiles
  mainFiles.push(...topFiles.map(({ priority, ...file }) => file));

  return { configFiles, mainFiles, documentationFiles, contexts };
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
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
  };

  return typeMap[ext] || 'text';
}

/**
 * Validate request parameters
 */
function validateRequest(projectName: string, projectPath: string): { valid: boolean; error?: NextResponse } {
  if (!projectName) {
    return {
      valid: false,
      error: NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      )
    };
  }

  if (!projectPath) {
    return {
      valid: false,
      error: NextResponse.json(
        { success: false, error: 'Project path is required for gathering codebase resources' },
        { status: 400 }
      )
    };
  }

  return { valid: true };
}

/**
 * Build enriched analysis with codebase resources
 */
function buildEnrichedAnalysis(
  analysis: any,
  configFiles: any[],
  mainFiles: any[],
  documentationFiles: any[],
  contexts: any[]
) {
  return {
    ...(analysis || {}),
    codebase: {
      configFiles,
      mainFiles,
      documentationFiles,
      contexts
    },
    stats: {
      ...(analysis?.stats || {}),
      technologies: analysis?.stats?.technologies || []
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const { projectName, projectPath, analysis, projectId, provider, vision } = await request.json();

    // Validate request
    const validation = validateRequest(projectName, projectPath);
    if (!validation.valid) {
      return validation.error;
    }

    // Gather codebase resources (including contexts if projectId is provided)
    const { configFiles, mainFiles, documentationFiles, contexts } = await gatherCodebaseResources(projectPath, projectId);

    // Build enriched analysis object with codebase resources
    const enrichedAnalysis = buildEnrichedAnalysis(analysis, configFiles, mainFiles, documentationFiles, contexts);

    const aiReview = await generateAIReview(projectName, enrichedAnalysis, projectId, provider, vision);

    return NextResponse.json({
      success: true,
      review: aiReview
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI documentation'
      },
      { status: 500 }
    );
  }
}