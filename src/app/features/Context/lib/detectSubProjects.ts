/**
 * Multi-Codebase Detection Utility
 *
 * Scans a project root directory to identify independent sub-projects.
 * Used by the context generation prompt builder to produce multi-codebase-aware prompts.
 */

import { readdirSync, readFileSync, existsSync, type Dirent } from 'fs';
import { join } from 'path';

export interface SubProject {
  name: string;
  relativePath: string;
  techStack: string[];
  framework: string;
  hasOwnGit: boolean;
  entryFiles: string[];
  estimatedSize: 'small' | 'medium' | 'large';
}

export interface ProjectStructure {
  isMultiCodebase: boolean;
  rootHasSourceCode: boolean;
  subProjects: SubProject[];
  rootPackageJson: boolean;
}

/** Directories to skip when counting files */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', '.next',
  '__pycache__', '.venv', 'venv', '.tox', 'coverage', '.nyc_output',
]);

/** Project marker files and their associated frameworks */
const PROJECT_MARKERS = [
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'setup.py',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'mix.exs',
] as const;

/**
 * Count files recursively with depth limit, excluding common non-source directories.
 */
function countFiles(dirPath: string, maxDepth: number, currentDepth = 0): number {
  if (currentDepth >= maxDepth) return 0;

  let count = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true, encoding: 'utf-8' }) as Dirent<string>[];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          count += countFiles(join(dirPath, entry.name), maxDepth, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch {
    // Permission denied or other read error — skip
  }
  return count;
}

/**
 * Detect framework from package.json dependencies.
 */
function detectFrameworkFromPackageJson(
  packageJsonPath: string
): { framework: string; techStack: string[] } {
  try {
    const raw = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    } as Record<string, string>;

    const techStack: string[] = [];
    let framework = 'nodejs';

    // Detect primary framework
    if (allDeps['next']) {
      framework = 'nextjs';
      techStack.push('Next.js');
    } else if (allDeps['nuxt'] || allDeps['nuxt3']) {
      framework = 'nuxt';
      techStack.push('Nuxt');
    } else if (allDeps['@angular/core']) {
      framework = 'angular';
      techStack.push('Angular');
    } else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
      framework = 'svelte';
      techStack.push('Svelte');
    } else if (allDeps['vue']) {
      framework = 'vue';
      techStack.push('Vue');
    } else if (allDeps['express']) {
      framework = 'express';
      techStack.push('Express');
    } else if (allDeps['fastify']) {
      framework = 'fastify';
      techStack.push('Fastify');
    } else if (allDeps['hono']) {
      framework = 'hono';
      techStack.push('Hono');
    }

    // Detect additional tech
    if (allDeps['react']) techStack.push('React');
    if (allDeps['typescript'] || allDeps['ts-node']) techStack.push('TypeScript');
    if (allDeps['@tauri-apps/api'] || allDeps['@tauri-apps/cli']) techStack.push('Tauri');
    if (allDeps['tailwindcss']) techStack.push('Tailwind CSS');
    if (allDeps['zustand']) techStack.push('Zustand');
    if (allDeps['prisma'] || allDeps['@prisma/client']) techStack.push('Prisma');
    if (allDeps['drizzle-orm']) techStack.push('Drizzle');
    if (allDeps['kafkajs']) techStack.push('KafkaJS');
    if (allDeps['@supabase/supabase-js']) techStack.push('Supabase');
    if (allDeps['stripe']) techStack.push('Stripe');
    if (allDeps['vite']) techStack.push('Vite');
    if (allDeps['esbuild']) techStack.push('esbuild');
    if (allDeps['electron']) {
      framework = 'electron';
      techStack.push('Electron');
    }

    // If Tauri detected and no primary web framework, mark as Tauri
    if (techStack.includes('Tauri') && framework === 'nodejs') {
      framework = 'tauri';
    }

    return { framework, techStack };
  } catch {
    return { framework: 'nodejs', techStack: ['Node.js'] };
  }
}

/**
 * Detect framework from Cargo.toml.
 */
function detectFrameworkFromCargoToml(
  cargoPath: string
): { framework: string; techStack: string[] } {
  try {
    const raw = readFileSync(cargoPath, 'utf-8');
    const techStack: string[] = ['Rust'];
    let framework = 'rust';

    if (raw.includes('tauri')) {
      framework = 'tauri';
      techStack.push('Tauri');
    }
    if (raw.includes('actix')) techStack.push('Actix');
    if (raw.includes('axum')) techStack.push('Axum');
    if (raw.includes('tokio')) techStack.push('Tokio');
    if (raw.includes('rusqlite')) techStack.push('SQLite');
    if (raw.includes('serde')) techStack.push('Serde');

    return { framework, techStack };
  } catch {
    return { framework: 'rust', techStack: ['Rust'] };
  }
}

/**
 * Build a SubProject from detected markers in a directory.
 */
function buildSubProject(dirName: string, dirPath: string): SubProject | null {
  const entryFiles: string[] = [];
  let framework = 'unknown';
  let techStack: string[] = [];

  const packageJsonPath = join(dirPath, 'package.json');
  const cargoTomlPath = join(dirPath, 'Cargo.toml');
  const pyprojectPath = join(dirPath, 'pyproject.toml');
  const setupPyPath = join(dirPath, 'setup.py');
  const goModPath = join(dirPath, 'go.mod');
  const pomPath = join(dirPath, 'pom.xml');

  // Check for sub-project package.json within nested structure (e.g., monorepo with packages/)
  const hasPackagesDir = existsSync(join(dirPath, 'packages'));

  if (existsSync(packageJsonPath)) {
    entryFiles.push('package.json');
    const detected = detectFrameworkFromPackageJson(packageJsonPath);
    framework = detected.framework;
    techStack = detected.techStack;
  }

  if (existsSync(cargoTomlPath)) {
    entryFiles.push('Cargo.toml');
    const detected = detectFrameworkFromCargoToml(cargoTomlPath);
    // Rust/Tauri info takes priority if also detected
    if (framework === 'unknown' || framework === 'nodejs') {
      framework = detected.framework;
    }
    techStack = [...new Set([...techStack, ...detected.techStack])];
  }

  // Check for src-tauri (Tauri app indicator within an npm project)
  if (existsSync(join(dirPath, 'src-tauri'))) {
    entryFiles.push('src-tauri/');
    if (!techStack.includes('Tauri')) techStack.push('Tauri');
    if (framework !== 'tauri') framework = 'tauri';
  }

  if (existsSync(pyprojectPath)) {
    entryFiles.push('pyproject.toml');
    if (framework === 'unknown') framework = 'python';
    techStack.push('Python');
  } else if (existsSync(setupPyPath)) {
    entryFiles.push('setup.py');
    if (framework === 'unknown') framework = 'python';
    techStack.push('Python');
  }

  if (existsSync(goModPath)) {
    entryFiles.push('go.mod');
    if (framework === 'unknown') framework = 'go';
    techStack.push('Go');
  }

  if (existsSync(pomPath)) {
    entryFiles.push('pom.xml');
    if (framework === 'unknown') framework = 'java';
    techStack.push('Java');
  }

  if (hasPackagesDir) {
    entryFiles.push('packages/');
  }

  // No markers found — not a sub-project
  if (entryFiles.length === 0) return null;

  const hasOwnGit = existsSync(join(dirPath, '.git'));
  if (existsSync(join(dirPath, 'src'))) entryFiles.push('src/');

  // Estimate size
  const fileCount = countFiles(dirPath, 4);
  let estimatedSize: SubProject['estimatedSize'] = 'small';
  if (fileCount > 200) estimatedSize = 'large';
  else if (fileCount > 50) estimatedSize = 'medium';

  return {
    name: dirName,
    relativePath: dirName,
    techStack,
    framework,
    hasOwnGit,
    entryFiles,
    estimatedSize,
  };
}

/**
 * Detect sub-projects within a project root directory.
 *
 * Scans top-level directories for project markers (package.json, Cargo.toml, etc.)
 * and identifies the tech stack of each sub-project.
 *
 * Returns `isMultiCodebase: true` when 2+ sub-projects are detected
 * and the root itself has no source code (i.e., it's a container directory).
 */
export function detectSubProjects(projectPath: string): ProjectStructure {
  const rootHasPackageJson = existsSync(join(projectPath, 'package.json'));
  const rootHasSrc = existsSync(join(projectPath, 'src'));
  const rootHasSourceCode = rootHasSrc || rootHasPackageJson;

  let entries: Dirent<string>[];
  try {
    entries = readdirSync(projectPath, { withFileTypes: true, encoding: 'utf-8' }) as Dirent<string>[];
  } catch {
    return {
      isMultiCodebase: false,
      rootHasSourceCode: false,
      subProjects: [],
      rootPackageJson: rootHasPackageJson,
    };
  }

  const subProjects: SubProject[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;

    const dirPath = join(projectPath, entry.name);
    const subProject = buildSubProject(entry.name, dirPath);
    if (subProject) {
      subProjects.push(subProject);
    }
  }

  // Multi-codebase when 2+ sub-projects exist and root is just a container
  // (or even if root has source code, 2+ sub-projects with own git repos counts)
  const hasMultipleGitRepos = subProjects.filter(sp => sp.hasOwnGit).length >= 2;
  const isMultiCodebase = subProjects.length >= 2 && (!rootHasSourceCode || hasMultipleGitRepos);

  return {
    isMultiCodebase,
    rootHasSourceCode,
    subProjects,
    rootPackageJson: rootHasPackageJson,
  };
}
