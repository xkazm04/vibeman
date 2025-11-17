import fs from 'fs/promises';
import path from 'path';
import { ProjectContext } from './types';

/**
 * Load project context from CLAUDE.md, README, package.json, etc.
 * This context is used by AI to generate strategic refactoring packages.
 */
export async function loadProjectContext(projectPath: string): Promise<ProjectContext> {
  console.log('[contextLoader] Loading project context from:', projectPath);

  // Validate projectPath
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('Project path is required and must be a string');
  }

  // Resolve to absolute path if relative
  const absolutePath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);

  console.log('[contextLoader] Resolved absolute path:', absolutePath);

  // Check if path exists
  try {
    await fs.access(absolutePath);
  } catch (error) {
    throw new Error(`Project path does not exist: ${absolutePath}`);
  }

  try {
    // Load CLAUDE.md
    const claudeMdPath = path.join(absolutePath, '.claude', 'CLAUDE.md');
    let claudeMd = '';
    try {
      claudeMd = await fs.readFile(claudeMdPath, 'utf-8');
      console.log('[contextLoader] CLAUDE.md loaded:', claudeMd.length, 'characters');
    } catch (error) {
      console.warn('[contextLoader] CLAUDE.md not found, continuing without it');
    }

    // Load README.md
    const readmePath = path.join(absolutePath, 'README.md');
    let readme = '';
    try {
      readme = await fs.readFile(readmePath, 'utf-8');
      console.log('[contextLoader] README.md loaded:', readme.length, 'characters');
    } catch (error) {
      console.warn('[contextLoader] README.md not found');
    }

    // Load package.json
    const packageJsonPath = path.join(absolutePath, 'package.json');
    let packageJson: any = {};
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(packageJsonContent);
      console.log('[contextLoader] package.json loaded');
    } catch (error) {
      console.warn('[contextLoader] package.json not found or invalid');
    }

    // Detect project type
    const projectType = detectProjectType(packageJson);
    console.log('[contextLoader] Detected project type:', projectType);

    // Extract tech stack
    const techStack = extractTechStack(packageJson);
    console.log('[contextLoader] Tech stack:', techStack);

    // Parse architecture from CLAUDE.md
    const architecture = extractArchitecture(claudeMd);

    // Extract priorities and conventions
    const priorities = extractPriorities(claudeMd);
    const conventions = extractConventions(claudeMd);

    return {
      claudeMd,
      readme,
      projectType,
      techStack,
      architecture,
      priorities,
      conventions,
    };
  } catch (error) {
    console.error('[contextLoader] Error loading project context:', error);
    throw new Error(`Failed to load project context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect project type from package.json dependencies
 */
function detectProjectType(packageJson: any): string {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.next) return 'next.js';
  if (deps.react && deps['react-native']) return 'react-native';
  if (deps.react) return 'react';
  if (deps.express) return 'express';
  if (deps.fastapi) return 'fastapi';
  if (deps.vue) return 'vue';
  if (deps['@angular/core']) return 'angular';
  if (deps.svelte) return 'svelte';

  return 'unknown';
}

/**
 * Extract technology stack from package.json
 */
function extractTechStack(packageJson: any): string[] {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const stack: string[] = [];

  // Framework
  if (deps.next) stack.push(`Next.js ${deps.next.replace('^', '')}`);
  if (deps.react && !deps.next) stack.push(`React ${deps.react.replace('^', '')}`);
  if (deps.vue) stack.push(`Vue ${deps.vue.replace('^', '')}`);
  if (deps['@angular/core']) stack.push(`Angular ${deps['@angular/core'].replace('^', '')}`);

  // Language
  if (deps.typescript) stack.push(`TypeScript ${deps.typescript.replace('^', '')}`);

  // State management
  if (deps.zustand) stack.push('Zustand');
  if (deps.redux) stack.push('Redux');
  if (deps['@tanstack/react-query']) stack.push('React Query');

  // Styling
  if (deps.tailwindcss) stack.push('Tailwind CSS');
  if (deps['styled-components']) stack.push('Styled Components');
  if (deps['framer-motion']) stack.push('Framer Motion');

  // Database
  if (deps['better-sqlite3']) stack.push('SQLite');
  if (deps.prisma) stack.push('Prisma');
  if (deps.mongoose) stack.push('MongoDB');
  if (deps.pg) stack.push('PostgreSQL');

  // Testing
  if (deps.jest) stack.push('Jest');
  if (deps.vitest) stack.push('Vitest');
  if (deps['@playwright/test']) stack.push('Playwright');

  return stack;
}

/**
 * Extract architecture description from CLAUDE.md
 */
function extractArchitecture(claudeMd: string): string {
  if (!claudeMd) return 'Not specified';

  // Look for "Architecture" section
  const archMatch = claudeMd.match(/##\s*Architecture[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
  if (archMatch) {
    return archMatch[1].trim().slice(0, 1000); // First 1000 chars
  }

  // Fallback: Look for "Layered Stack" or similar
  const stackMatch = claudeMd.match(/###\s*Layered Stack[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
  if (stackMatch) {
    return stackMatch[1].trim().slice(0, 1000);
  }

  return 'Not specified';
}

/**
 * Extract priorities from CLAUDE.md
 */
function extractPriorities(claudeMd: string): string[] {
  if (!claudeMd) return [];

  const priorities: string[] = [];
  const lines = claudeMd.split('\n');

  // Look for bullet points with priority keywords
  for (const line of lines) {
    if (line.match(/^\s*[-*]\s+.*(priority|important|must|critical|key|essential)/i)) {
      const cleaned = line.replace(/^\s*[-*]\s+/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        priorities.push(cleaned);
      }
    }
  }

  // Also look for explicit "Priorities" section
  const prioritiesMatch = claudeMd.match(/##\s*Priorit(y|ies)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
  if (prioritiesMatch) {
    const sectionLines = prioritiesMatch[2].split('\n');
    for (const line of sectionLines) {
      if (line.match(/^\s*[-*]\s+/)) {
        const cleaned = line.replace(/^\s*[-*]\s+/, '').trim();
        if (cleaned.length > 10 && cleaned.length < 200 && !priorities.includes(cleaned)) {
          priorities.push(cleaned);
        }
      }
    }
  }

  return priorities.slice(0, 15); // Top 15
}

/**
 * Extract code conventions from CLAUDE.md
 */
function extractConventions(claudeMd: string): string[] {
  if (!claudeMd) return [];

  const conventions: string[] = [];

  // Look for sections like "Conventions", "Guidelines", "Standards", "Important Conventions"
  const conventionsMatch = claudeMd.match(/##\s*(Convention|Guideline|Standard|Practice|Important Convention)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i);
  if (conventionsMatch) {
    const sectionLines = conventionsMatch[2].split('\n');
    for (const line of sectionLines) {
      if (line.match(/^\s*[-*]\s+/)) {
        const cleaned = line.replace(/^\s*[-*]\s+/, '').trim();
        if (cleaned.length > 10 && cleaned.length < 300) {
          conventions.push(cleaned);
        }
      }
    }
  }

  // Also look for "MUST" statements anywhere
  const lines = claudeMd.split('\n');
  for (const line of lines) {
    if (line.match(/MUST|ALWAYS|NEVER/)) {
      const cleaned = line.replace(/^\s*[-*]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 300 && !conventions.includes(cleaned)) {
        conventions.push(cleaned);
      }
    }
  }

  return conventions.slice(0, 20); // Top 20
}
