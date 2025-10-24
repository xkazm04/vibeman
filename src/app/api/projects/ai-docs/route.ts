import { NextRequest, NextResponse } from 'next/server';
import { generateAIReview } from '@/app/projects/ProjectAI/generateAIReview';
import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';

/**
 * Gather codebase files organized by type for AI analysis
 */
async function gatherCodebaseResources(projectPath: string) {
  const configFiles: Array<{ path: string; content: string; type: string }> = [];
  const mainFiles: Array<{ path: string; content: string; type: string }> = [];
  const documentationFiles: Array<{ path: string; content: string; type: string }> = [];

  const configFileNames = [
    'package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts', 'next.config.mjs',
    'tailwind.config.js', 'tailwind.config.ts', '.eslintrc.js', '.eslintrc.json',
    'vite.config.ts', 'vite.config.js', 'webpack.config.js'
  ];

  const docFileNames = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'CLAUDE.md'];

  const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', 'database'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'];

  // Helper to read a file safely
  async function readFileSafe(filePath: string): Promise<{ path: string; content: string; type: string } | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const ext = extname(filePath).slice(1);
      const relativePath = relative(projectPath, filePath);

      // Skip very large files (>200KB)
      if (content.length > 200000) {
        return null;
      }

      return {
        path: relativePath.replace(/\\/g, '/'),
        content,
        type: getFileType(ext)
      };
    } catch (error) {
      console.error(`Failed to read file: ${filePath}`, error);
      return null;
    }
  }

  // Gather config files from project root
  try {
    for (const configName of configFileNames) {
      const configPath = join(projectPath, configName);
      const file = await readFileSafe(configPath);
      if (file) {
        configFiles.push(file);
      }
    }
  } catch (error) {
    console.error('Error gathering config files:', error);
  }

  // Gather documentation files from project root
  try {
    for (const docName of docFileNames) {
      const docPath = join(projectPath, docName);
      const file = await readFileSafe(docPath);
      if (file) {
        documentationFiles.push(file);
      }
    }
  } catch (error) {
    console.error('Error gathering documentation files:', error);
  }

  // Gather main implementation files
  async function walkDirectory(dir: string, depth: number = 0): Promise<void> {
    if (depth > 4 || mainFiles.length >= 30) return; // Limit depth and file count

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (mainFiles.length >= 30) break;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludedDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await walkDirectory(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (codeExtensions.includes(ext)) {
            const file = await readFileSafe(fullPath);
            if (file) {
              mainFiles.push(file);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read directory: ${dir}`, error);
    }
  }

  await walkDirectory(projectPath);

  console.log(`[AI Docs] Gathered resources: ${configFiles.length} config, ${mainFiles.length} code, ${documentationFiles.length} docs`);

  return { configFiles, mainFiles, documentationFiles };
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

export async function POST(request: NextRequest) {
  try {
    const { projectName, projectPath, analysis, projectId, provider } = await request.json();

    if (!projectName) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project path is required for gathering codebase resources' },
        { status: 400 }
      );
    }

    console.log(`[AI Docs] Starting documentation generation for: ${projectName}`);
    console.log(`[AI Docs] Project path: ${projectPath}`);

    // Gather codebase resources
    const { configFiles, mainFiles, documentationFiles } = await gatherCodebaseResources(projectPath);

    // Build enriched analysis object with codebase resources
    const enrichedAnalysis = {
      ...(analysis || {}),
      codebase: {
        configFiles,
        mainFiles,
        documentationFiles
      },
      stats: {
        ...(analysis?.stats || {}),
        technologies: analysis?.stats?.technologies || []
      }
    };

    console.log(`[AI Docs] Calling generateAIReview with ${configFiles.length + mainFiles.length + documentationFiles.length} files`);

    const aiReview = await generateAIReview(projectName, enrichedAnalysis, projectId, provider);

    return NextResponse.json({
      success: true,
      review: aiReview
    });

  } catch (error) {
    console.error('AI docs generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI documentation'
      },
      { status: 500 }
    );
  }
}