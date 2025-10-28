import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { eventDb } from '../../../../lib/database';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { generateAIReview } from '@/app/projects/ProjectAI/promptFunctions';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath, projectName, mode } = await request.json();

    if (!projectId || !projectPath || !projectName || !mode) {
      return NextResponse.json(
        { success: false, error: 'Project ID, path, name, and mode are required' },
        { status: 400 }
      );
    }

    // Security check - ensure the project path is valid
    if (projectPath.includes('..') || projectPath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid project path' },
        { status: 403 }
      );
    }

    // Start background processing
    processBackgroundGeneration({
      projectId,
      projectPath,
      projectName,
      mode
    });

    return NextResponse.json({
      success: true,
      message: `Background ${mode} generation started`
    });
  } catch (error) {
    console.error('AI project background API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processBackgroundGeneration({
  projectId,
  projectPath,
  projectName,
  mode
}: {
  projectId: string;
  projectPath: string;
  projectName: string;
  mode: 'docs' | 'goals' | 'context' | 'code';
}) {
  try {
    // Log start event
    eventDb.createEvent({
      id: uuidv4(),
      project_id: projectId,
      title: `AI ${mode.charAt(0).toUpperCase() + mode.slice(1)} Generation Started`,
      description: `Background generation of ${mode} for project ${projectName}`,
      type: 'info'
    });

    // Analyze the project structure
    const projectAnalysis = await analyzeProjectStructure(projectPath);

    // Generate content based on mode
    switch (mode) {
      case 'docs':
        const aiReview = await generateAIReview(projectName, projectAnalysis, projectId);

        // Save to project root/context/high.md
        const contextDir = join(projectPath, 'context');
        await fs.mkdir(contextDir, { recursive: true });
        const docsPath = join(contextDir, 'high.md');
        await fs.writeFile(docsPath, aiReview, 'utf-8');

        // Log success event
        eventDb.createEvent({
          id: uuidv4(),
          project_id: projectId,
          title: 'AI Documentation Generated',
          description: `Documentation saved to context/high.md`,
          type: 'success'
        });
        break;

      default:
        throw new Error(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    console.error(`Background ${mode} generation failed:`, error);

    // Log error event
    eventDb.createEvent({
      id: uuidv4(),
      project_id: projectId,
      title: `AI ${mode.charAt(0).toUpperCase() + mode.slice(1)} Generation Failed`,
      description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error'
    });
  }
}

async function analyzeProjectStructure(projectPath: string) {
  const analysis = {
    structure: {} as Record<string, any>,
    stats: {
      totalFiles: 0,
      totalDirectories: 0,
      fileTypes: {} as Record<string, number>,
      keyFiles: [] as string[],
      technologies: [] as string[]
    },
    codebase: {
      mainFiles: [] as Array<{ path: string; content: string; type: string }>,
      configFiles: [] as Array<{ path: string; content: string; type: string }>,
      documentationFiles: [] as Array<{ path: string; content: string; type: string }>
    }
  };

  // Key files to analyze for project understanding
  const keyFilePatterns = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'next.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'README.md',
    'KIRO.md',
    '.env.example',
    'docker-compose.yml',
    'Dockerfile'
  ];

  // Important directories to analyze
  const importantDirs = ['src', 'app', 'components', 'pages', 'lib', 'utils', 'hooks', 'stores'];

  try {
    // Read project structure
    analysis.structure = await readDirectoryStructure(projectPath, 2); // Max depth 2

    // Analyze key files
    for (const pattern of keyFilePatterns) {
      try {
        const filePath = join(projectPath, pattern);
        const stats = await stat(filePath);

        if (stats.isFile()) {
          const content = await readFile(filePath, 'utf-8');
          const fileType = getFileCategory(pattern);

          analysis.codebase[fileType].push({
            path: pattern,
            content: content.slice(0, 5000), // Limit content size
            type: extname(pattern) || 'config'
          });

          analysis.stats.keyFiles.push(pattern);
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    }

    // Analyze important directories for main implementation files
    for (const dir of importantDirs) {
      try {
        const dirPath = join(projectPath, dir);
        const dirStats = await stat(dirPath);

        if (dirStats.isDirectory()) {
          const files = await findImportantFiles(dirPath, 3); // Max depth 3
          analysis.codebase.mainFiles.push(...files);
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    // Detect technologies based on files
    analysis.stats.technologies = detectTechnologies(analysis);

    return analysis;
  } catch (error) {
    console.error('Error analyzing project structure:', error);
    throw error;
  }
}

async function readDirectoryStructure(dirPath: string, maxDepth: number, currentDepth = 0): Promise<any> {
  if (currentDepth >= maxDepth) return {};

  try {
    const entries = await readdir(dirPath);
    const structure: Record<string, any> = {};

    for (const entry of entries) {
      // Skip common directories that aren't useful for analysis
      if (['.git', 'node_modules', '.next', 'dist', 'build', '.vscode'].includes(entry)) {
        continue;
      }

      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);

      if (stats.isDirectory()) {
        structure[entry] = await readDirectoryStructure(entryPath, maxDepth, currentDepth + 1);
      } else {
        structure[entry] = 'file';
      }
    }

    return structure;
  } catch (error) {
    return {};
  }
}

async function findImportantFiles(dirPath: string, maxDepth: number, currentDepth = 0): Promise<Array<{ path: string; content: string; type: string }>> {
  if (currentDepth >= maxDepth) return [];

  const files: Array<{ path: string; content: string; type: string }> = [];
  const importantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);

      if (stats.isDirectory() && !['node_modules', '.git', '.next', 'dist'].includes(entry)) {
        const subFiles = await findImportantFiles(entryPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        const ext = extname(entry);
        if (importantExtensions.includes(ext)) {
          try {
            const content = await readFile(entryPath, 'utf-8');
            const relativePath = entryPath.replace(dirPath, '').replace(/^[\/\\]/, '');

            files.push({
              path: relativePath,
              content: content.slice(0, 3000), // Limit content size
              type: ext
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return files.slice(0, 20); // Limit number of files
}

function getFileCategory(filename: string): 'mainFiles' | 'configFiles' | 'documentationFiles' {
  if (filename.includes('README') || filename.includes('.md')) {
    return 'documentationFiles';
  }
  if (filename.includes('config') || filename.includes('package.json') || filename.includes('tsconfig')) {
    return 'configFiles';
  }
  return 'mainFiles';
}

function detectTechnologies(analysis: any): string[] {
  const technologies: string[] = [];

  // Check package.json for dependencies
  const packageJson = analysis.codebase.configFiles.find((f: any) => f.path === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.react) technologies.push('React');
      if (deps.next) technologies.push('Next.js');
      if (deps.typescript) technologies.push('TypeScript');
      if (deps.tailwindcss) technologies.push('Tailwind CSS');
      if (deps['framer-motion']) technologies.push('Framer Motion');
      if (deps.zustand) technologies.push('Zustand');
      if (deps['@tanstack/react-query']) technologies.push('React Query');
    } catch (error) {
      // Invalid JSON, skip
    }
  }

  // Check for other indicators
  if (analysis.stats.keyFiles.includes('tsconfig.json')) technologies.push('TypeScript');
  if (analysis.stats.keyFiles.includes('tailwind.config.js') || analysis.stats.keyFiles.includes('tailwind.config.ts')) {
    technologies.push('Tailwind CSS');
  }

  return [...new Set(technologies)]; // Remove duplicates
}