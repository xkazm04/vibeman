import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';

export interface FileInfo {
  path: string;
  content: string;
  type: string;
}

export interface ProjectAnalysis {
  structure: Record<string, unknown>;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    fileTypes: Record<string, number>;
    keyFiles: string[];
    technologies: string[];
  };
  codebase: {
    mainFiles: FileInfo[];
    configFiles: FileInfo[];
    documentationFiles: FileInfo[];
  };
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const IGNORED_DIRS = ['.git', 'node_modules', '.next', 'dist', 'build', '.vscode'];
const IMPORTANT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];
const KEY_FILE_PATTERNS = [
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
const IMPORTANT_DIRS = ['src', 'app', 'components', 'pages', 'lib', 'utils', 'hooks', 'stores'];

function getFileCategory(filename: string): 'mainFiles' | 'configFiles' | 'documentationFiles' {
  if (filename.includes('README') || filename.includes('.md')) {
    return 'documentationFiles';
  }
  if (filename.includes('config') || filename.includes('package.json') || filename.includes('tsconfig')) {
    return 'configFiles';
  }
  return 'mainFiles';
}

async function readDirectoryStructure(dirPath: string, maxDepth: number, currentDepth = 0): Promise<Record<string, unknown>> {
  if (currentDepth >= maxDepth) return {};

  try {
    const entries = await readdir(dirPath);
    const structure: Record<string, unknown> = {};

    for (const entry of entries) {
      if (IGNORED_DIRS.includes(entry)) {
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

async function findImportantFiles(dirPath: string, maxDepth: number, currentDepth = 0): Promise<FileInfo[]> {
  if (currentDepth >= maxDepth) return [];

  const files: FileInfo[] = [];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);

      if (stats.isDirectory() && !IGNORED_DIRS.includes(entry)) {
        const subFiles = await findImportantFiles(entryPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        const ext = extname(entry);
        if (IMPORTANT_EXTENSIONS.includes(ext)) {
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

function detectTechnologiesFromPackageJson(packageJson: FileInfo): string[] {
  const technologies: string[] = [];

  try {
    const pkg: PackageJson = JSON.parse(packageJson.content);
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

  return technologies;
}

function detectTechnologies(analysis: ProjectAnalysis): string[] {
  const technologies: string[] = [];

  // Check package.json for dependencies
  const packageJson = analysis.codebase.configFiles.find((f) => f.path === 'package.json');
  if (packageJson) {
    technologies.push(...detectTechnologiesFromPackageJson(packageJson));
  }

  // Check for other indicators
  if (analysis.stats.keyFiles.includes('tsconfig.json')) {
    technologies.push('TypeScript');
  }
  if (analysis.stats.keyFiles.includes('tailwind.config.js') || analysis.stats.keyFiles.includes('tailwind.config.ts')) {
    technologies.push('Tailwind CSS');
  }

  return Array.from(new Set(technologies)); // Remove duplicates
}

async function analyzeKeyFiles(projectPath: string, analysis: ProjectAnalysis) {
  for (const pattern of KEY_FILE_PATTERNS) {
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
}

async function analyzeImportantDirectories(projectPath: string, analysis: ProjectAnalysis) {
  for (const dir of IMPORTANT_DIRS) {
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
}

export async function analyzeProjectStructure(projectPath: string): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    structure: {},
    stats: {
      totalFiles: 0,
      totalDirectories: 0,
      fileTypes: {},
      keyFiles: [],
      technologies: []
    },
    codebase: {
      mainFiles: [],
      configFiles: [],
      documentationFiles: []
    }
  };

  try {
    // Read project structure
    analysis.structure = await readDirectoryStructure(projectPath, 2); // Max depth 2

    // Analyze key files
    await analyzeKeyFiles(projectPath, analysis);

    // Analyze important directories for main implementation files
    await analyzeImportantDirectories(projectPath, analysis);

    // Detect technologies based on files
    analysis.stats.technologies = detectTechnologies(analysis);

    return analysis;
  } catch (error) {
    throw error;
  }
}
