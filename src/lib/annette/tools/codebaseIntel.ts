/**
 * Codebase Intelligence Tools
 * Honest project analysis, backlog generation, health assessment, and dependency analysis.
 *
 * Tools:
 * - analyze_codebase_structure: Analyze project file structure and dependencies
 * - generate_backlog_items: Generate development backlog from codebase analysis
 * - assess_project_health: Honest assessment of project strengths and weaknesses
 * - get_dependency_analysis: Analyze project dependencies
 */

import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { projectDb } from '@/lib/project_database';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export async function executeCodebaseIntelTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string,
): Promise<string> {
  switch (name) {
    case 'analyze_codebase_structure':
      return analyzeCodebaseStructure(input, projectId, projectPath);

    case 'generate_backlog_items':
      return generateBacklogItems(input, projectId);

    case 'assess_project_health':
      return assessProjectHealth(projectId, projectPath);

    case 'get_dependency_analysis':
      return getDependencyAnalysis(projectId, projectPath);

    default:
      return JSON.stringify({ error: `Unknown codebase intel tool: ${name}` });
  }
}

// ─── Tool 1: analyze_codebase_structure ────────────────────────────────────

function resolveProjectPath(projectId: string, projectPath?: string): string | null {
  if (projectPath) return projectPath;
  const project = projectDb.getProject(projectId);
  return project?.path ?? null;
}

async function analyzeCodebaseStructure(
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string,
): Promise<string> {
  const depth = parseInt(String(input.depth || '2'), 10);
  const rootPath = resolveProjectPath(projectId, projectPath);

  if (!rootPath) {
    return JSON.stringify({ error: 'Project path not found. Register the project first.' });
  }

  if (!fs.existsSync(rootPath)) {
    return JSON.stringify({ error: `Project path does not exist: ${rootPath}` });
  }

  try {
    // Count files by extension
    const extensionCounts: Record<string, number> = {};
    const directorySizes: Array<{ name: string; fileCount: number }> = [];
    const configFiles: string[] = [];
    const knownConfigs = [
      'package.json', 'tsconfig.json', 'next.config.js', 'next.config.mjs', 'next.config.ts',
      '.eslintrc.js', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
      '.prettierrc', '.prettierrc.json', 'prettier.config.js',
      'tailwind.config.js', 'tailwind.config.ts',
      'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      '.github', '.env.example',
    ];

    // Scan top-level for config files
    const topEntries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of topEntries) {
      if (knownConfigs.includes(entry.name)) {
        configFiles.push(entry.name);
      }
    }

    // Scan directories and count extensions
    const skipDirs = new Set([
      'node_modules', '.next', '.git', 'dist', 'build', '.turbo',
      'coverage', '.cache', '__pycache__',
    ]);

    function walkDir(dirPath: string, currentDepth: number): number {
      if (currentDepth > depth + 2) return 0; // go deeper for counting, not reporting
      let count = 0;
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.github') continue;
          if (skipDirs.has(entry.name)) continue;

          if (entry.isDirectory()) {
            count += walkDir(path.join(dirPath, entry.name), currentDepth + 1);
          } else {
            count++;
            const ext = path.extname(entry.name).toLowerCase() || '(no ext)';
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
          }
        }
      } catch {
        // permission or symlink errors — skip
      }
      return count;
    }

    // Count files in top-level directories
    for (const entry of topEntries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      if (skipDirs.has(entry.name)) continue;

      const dirFileCount = walkDir(path.join(rootPath, entry.name), 1);
      directorySizes.push({ name: entry.name, fileCount: dirFileCount });
    }

    // Also count root-level files
    walkDir(rootPath, 0);

    // Sort directories by size
    directorySizes.sort((a, b) => b.fileCount - a.fileCount);

    // Sort extensions by count
    const sortedExtensions = Object.entries(extensionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([ext, count]) => ({ extension: ext, count }));

    const totalFiles = Object.values(extensionCounts).reduce((s, c) => s + c, 0);

    // Read package.json for dependency counts
    let dependencyCounts: { deps: number; devDeps: number } | null = null;
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        dependencyCounts = {
          deps: Object.keys(pkg.dependencies || {}).length,
          devDeps: Object.keys(pkg.devDependencies || {}).length,
        };
      } catch {
        // invalid package.json
      }
    }

    return JSON.stringify({
      projectPath: rootPath,
      totalFiles,
      filesByExtension: sortedExtensions,
      topDirectories: directorySizes.slice(0, 10),
      configFilesFound: configFiles,
      dependencyCounts,
      scanDepth: depth,
    });
  } catch (error) {
    logger.error('analyze_codebase_structure failed', { error });
    return JSON.stringify({ error: 'Failed to analyze codebase structure' });
  }
}

// ─── Tool 2: generate_backlog_items ────────────────────────────────────────

async function generateBacklogItems(
  input: Record<string, unknown>,
  projectId: string,
): Promise<string> {
  const focus = (input.focus as string) || 'all';
  const contextId = input.contextId as string | undefined;

  try {
    // Gather current state from databases
    const goals = goalRepository.getGoalsByProject(projectId);
    const openGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

    const pendingIdeas = ideaRepository.getIdeasByProject(projectId).filter(i => i.status === 'pending');
    const acceptedIdeas = ideaRepository.getIdeasByProject(projectId).filter(i => i.status === 'accepted');
    const rejectedIdeas = ideaRepository.getIdeasByProject(projectId).filter(i => i.status === 'rejected');

    const contexts = contextRepository.getContextsByProject(projectId);

    // If contextId provided, get that context's file paths for scope
    let contextScope: { name: string; filePaths: string[] } | null = null;
    if (contextId) {
      const ctx = contextRepository.getContextById(contextId);
      if (ctx) {
        let filePaths: string[] = [];
        try { filePaths = JSON.parse(ctx.file_paths || '[]'); } catch { /* empty */ }
        contextScope = { name: ctx.name, filePaths };
      }
    }

    // Get brain insights for intelligence
    let insightSummary: string[] = [];
    try {
      const insights = brainInsightRepository.getByProject(projectId, 10);
      insightSummary = insights
        .filter(i => i.type === 'preference_learned' || i.type === 'pattern_detected')
        .slice(0, 5)
        .map(i => i.description);
    } catch {
      // no insights yet
    }

    // Build backlog items by category
    const backlogItems: Array<{
      category: string;
      title: string;
      priority: 'high' | 'medium' | 'low';
      rationale: string;
      source: string;
    }> = [];

    // Technical items
    if (focus === 'all' || focus === 'technical') {
      // Unreviewed ideas that are technical
      const technicalIdeas = pendingIdeas
        .filter(i => i.category === 'refactoring' || i.category === 'architecture' || i.category === 'performance')
        .slice(0, 5);
      for (const idea of technicalIdeas) {
        backlogItems.push({
          category: 'technical',
          title: idea.title,
          priority: (idea.impact ?? 0) >= 7 ? 'high' : (idea.impact ?? 0) >= 4 ? 'medium' : 'low',
          rationale: `Pending idea from ${idea.scan_type || 'scan'}: ${idea.description?.slice(0, 100) || 'No description'}`,
          source: `idea:${idea.id}`,
        });
      }

      // Contexts without descriptions (documentation debt)
      const undocumentedContexts = contexts.filter(c => !c.description);
      if (undocumentedContexts.length > 0) {
        backlogItems.push({
          category: 'technical',
          title: `Document ${undocumentedContexts.length} undocumented context(s)`,
          priority: 'medium',
          rationale: `Contexts missing descriptions: ${undocumentedContexts.slice(0, 3).map(c => c.name).join(', ')}`,
          source: 'analysis',
        });
      }
    }

    // Quality items
    if (focus === 'all' || focus === 'quality') {
      const qualityIdeas = pendingIdeas
        .filter(i => i.category === 'testing' || i.category === 'security' || i.category === 'bug')
        .slice(0, 5);
      for (const idea of qualityIdeas) {
        backlogItems.push({
          category: 'quality',
          title: idea.title,
          priority: idea.category === 'security' || idea.category === 'bug' ? 'high' : 'medium',
          rationale: `Pending ${idea.category} idea: ${idea.description?.slice(0, 100) || 'No description'}`,
          source: `idea:${idea.id}`,
        });
      }
    }

    // Feature items
    if (focus === 'all' || focus === 'features') {
      const featureIdeas = pendingIdeas
        .filter(i => i.category === 'feature' || i.category === 'ux' || i.category === 'enhancement')
        .slice(0, 5);
      for (const idea of featureIdeas) {
        backlogItems.push({
          category: 'features',
          title: idea.title,
          priority: (idea.impact ?? 0) >= 7 ? 'high' : 'medium',
          rationale: `Pending feature idea: ${idea.description?.slice(0, 100) || 'No description'}`,
          source: `idea:${idea.id}`,
        });
      }

      // Goals that are still open (not in progress)
      const staleGoals = openGoals.filter(g => g.status === 'open');
      for (const goal of staleGoals.slice(0, 3)) {
        backlogItems.push({
          category: 'features',
          title: `Progress goal: ${goal.title}`,
          priority: 'medium',
          rationale: `Goal created but not started yet`,
          source: `goal:${goal.id}`,
        });
      }
    }

    // Build summary
    const ideaAcceptanceRate = (acceptedIdeas.length + rejectedIdeas.length) > 0
      ? Math.round((acceptedIdeas.length / (acceptedIdeas.length + rejectedIdeas.length)) * 100)
      : null;

    return JSON.stringify({
      focus,
      contextScope: contextScope ? { name: contextScope.name, fileCount: contextScope.filePaths.length } : null,
      currentState: {
        totalGoals: goals.length,
        openGoals: openGoals.length,
        pendingIdeas: pendingIdeas.length,
        acceptedIdeas: acceptedIdeas.length,
        contextsCount: contexts.length,
        ideaAcceptanceRate: ideaAcceptanceRate !== null ? `${ideaAcceptanceRate}%` : 'no data',
      },
      backlogItems,
      backlogCount: backlogItems.length,
      brainInsights: insightSummary.length > 0 ? insightSummary : undefined,
      message: backlogItems.length === 0
        ? 'No backlog items generated. Try running a scan first to generate ideas, or broaden the focus filter.'
        : `Generated ${backlogItems.length} backlog items${contextScope ? ` scoped to "${contextScope.name}"` : ''}.`,
    });
  } catch (error) {
    logger.error('generate_backlog_items failed', { error });
    return JSON.stringify({ error: 'Failed to generate backlog items' });
  }
}

// ─── Tool 3: assess_project_health ─────────────────────────────────────────

function getGitModifiedCount(projectPath: string): Promise<number> {
  return new Promise((resolve) => {
    exec('git status --porcelain', { cwd: projectPath, timeout: 5000 }, (error, stdout) => {
      if (error) { resolve(-1); return; }
      const lines = stdout.trim().split('\n').filter(l => l.length > 0);
      resolve(lines.length);
    });
  });
}

async function assessProjectHealth(
  projectId: string,
  projectPath?: string,
): Promise<string> {
  const rootPath = resolveProjectPath(projectId, projectPath);

  if (!rootPath) {
    return JSON.stringify({ error: 'Project path not found.' });
  }

  try {
    const strengths: Array<{ area: string; detail: string; metric?: string }> = [];
    const weaknesses: Array<{ area: string; detail: string; metric?: string }> = [];
    const metrics: Record<string, unknown> = {};

    // ── Test coverage proxy ──
    let testFileCount = 0;
    let sourceFileCount = 0;

    function countFilesForCoverage(dirPath: string, currentDepth: number): void {
      if (currentDepth > 6) return;
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
          if (entry.isDirectory()) {
            countFilesForCoverage(path.join(dirPath, entry.name), currentDepth + 1);
          } else {
            const name = entry.name.toLowerCase();
            const ext = path.extname(name);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              if (name.includes('.test.') || name.includes('.spec.') || name.includes('__tests__')) {
                testFileCount++;
              } else {
                sourceFileCount++;
              }
            }
          }
        }
      } catch {
        // skip
      }
    }

    countFilesForCoverage(rootPath, 0);
    const testRatio = sourceFileCount > 0 ? (testFileCount / sourceFileCount) : 0;
    metrics.testFiles = testFileCount;
    metrics.sourceFiles = sourceFileCount;
    metrics.testToSourceRatio = Math.round(testRatio * 100) / 100;

    if (testRatio >= 0.3) {
      strengths.push({ area: 'Testing', detail: 'Healthy test-to-source ratio', metric: `${testFileCount} test files / ${sourceFileCount} source files (${(testRatio * 100).toFixed(0)}%)` });
    } else if (testRatio >= 0.1) {
      weaknesses.push({ area: 'Testing', detail: 'Some tests exist but coverage may be thin', metric: `${testFileCount} test files / ${sourceFileCount} source files (${(testRatio * 100).toFixed(0)}%)` });
    } else {
      weaknesses.push({ area: 'Testing', detail: 'Very few or no test files found', metric: `${testFileCount} test files / ${sourceFileCount} source files` });
    }

    // ── Quality indicators ──
    const eslintExists = fs.existsSync(path.join(rootPath, '.eslintrc.js'))
      || fs.existsSync(path.join(rootPath, '.eslintrc.json'))
      || fs.existsSync(path.join(rootPath, 'eslint.config.js'))
      || fs.existsSync(path.join(rootPath, 'eslint.config.mjs'));
    if (eslintExists) {
      strengths.push({ area: 'Linting', detail: 'ESLint configured' });
    } else {
      weaknesses.push({ area: 'Linting', detail: 'No ESLint configuration found' });
    }

    // Check tsconfig strict mode
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfigRaw = fs.readFileSync(tsconfigPath, 'utf-8');
        // Simple check — tsconfig may have comments, so we do string matching
        const isStrict = tsconfigRaw.includes('"strict": true') || tsconfigRaw.includes('"strict":true');
        if (isStrict) {
          strengths.push({ area: 'TypeScript', detail: 'Strict mode enabled' });
        } else {
          weaknesses.push({ area: 'TypeScript', detail: 'Strict mode not enabled in tsconfig' });
        }
      } catch {
        // can't read tsconfig
      }
    }

    // CI/CD
    const hasGithubActions = fs.existsSync(path.join(rootPath, '.github', 'workflows'));
    if (hasGithubActions) {
      strengths.push({ area: 'CI/CD', detail: 'GitHub Actions workflows found' });
    } else {
      weaknesses.push({ area: 'CI/CD', detail: 'No CI/CD configuration detected' });
    }

    // ── Brain insights ──
    let brainInsightsCount = 0;
    try {
      const insights = brainInsightRepository.getByProject(projectId, 50);
      brainInsightsCount = insights.length;
      if (brainInsightsCount > 10) {
        strengths.push({ area: 'Brain Learning', detail: 'Rich pattern database built', metric: `${brainInsightsCount} insights recorded` });
      } else if (brainInsightsCount > 0) {
        strengths.push({ area: 'Brain Learning', detail: 'Brain has started learning patterns', metric: `${brainInsightsCount} insights so far` });
      }
    } catch {
      // no brain data
    }
    metrics.brainInsights = brainInsightsCount;

    // ── Behavioral context ──
    try {
      const behavioral = getBehavioralContext(projectId);
      if (behavioral.hasData) {
        const neglectedCount = behavioral.trending?.neglectedAreas?.length || 0;
        if (neglectedCount > 3) {
          weaknesses.push({ area: 'Maintenance', detail: `${neglectedCount} neglected areas detected`, metric: `Areas: ${behavioral.trending?.neglectedAreas?.slice(0, 3).join(', ')}...` });
        }
        metrics.activeContexts = behavioral.currentFocus?.activeContexts?.length || 0;
        metrics.neglectedAreas = neglectedCount;
      }
    } catch {
      // no behavioral data
    }

    // ── Idea acceptance/rejection ratio ──
    try {
      const allIdeas = ideaRepository.getIdeasByProject(projectId);
      const accepted = allIdeas.filter(i => i.status === 'accepted').length;
      const rejected = allIdeas.filter(i => i.status === 'rejected').length;
      const pending = allIdeas.filter(i => i.status === 'pending').length;
      const total = allIdeas.length;

      metrics.ideas = { total, accepted, rejected, pending };

      if (total > 0) {
        const triaged = accepted + rejected;
        if (triaged > 0) {
          const acceptRate = Math.round((accepted / triaged) * 100);
          if (acceptRate > 50) {
            strengths.push({ area: 'Idea Quality', detail: 'High idea acceptance rate', metric: `${acceptRate}% accepted (${accepted}/${triaged})` });
          } else if (acceptRate < 20 && triaged > 5) {
            weaknesses.push({ area: 'Idea Quality', detail: 'Low idea acceptance rate — scan output may need tuning', metric: `${acceptRate}% accepted (${accepted}/${triaged})` });
          }
        }
        if (pending > 20) {
          weaknesses.push({ area: 'Triage Backlog', detail: 'Large number of unreviewed ideas', metric: `${pending} pending ideas` });
        }
      }
    } catch {
      // no idea data
    }

    // ── Git status (uncommitted changes) ──
    let gitModifiedFiles = -1;
    try {
      gitModifiedFiles = await getGitModifiedCount(rootPath);
      metrics.uncommittedFiles = gitModifiedFiles;
      if (gitModifiedFiles > 30) {
        weaknesses.push({ area: 'Version Control', detail: 'Large number of uncommitted changes', metric: `${gitModifiedFiles} modified files` });
      } else if (gitModifiedFiles >= 0 && gitModifiedFiles <= 5) {
        strengths.push({ area: 'Version Control', detail: 'Clean working directory', metric: `${gitModifiedFiles} modified files` });
      }
    } catch {
      // git not available
    }

    // ── Goal progress ──
    try {
      const goals = goalRepository.getGoalsByProject(projectId);
      const doneGoals = goals.filter(g => g.status === 'done').length;
      const totalGoals = goals.length;
      metrics.goals = { total: totalGoals, done: doneGoals };

      if (totalGoals > 0 && doneGoals / totalGoals >= 0.5) {
        strengths.push({ area: 'Goal Progress', detail: 'Strong goal completion rate', metric: `${doneGoals}/${totalGoals} done` });
      } else if (totalGoals > 5 && doneGoals === 0) {
        weaknesses.push({ area: 'Goal Progress', detail: 'Multiple goals set but none completed', metric: `0/${totalGoals} done` });
      }
    } catch {
      // no goal data
    }

    return JSON.stringify({
      projectPath: rootPath,
      strengths,
      weaknesses,
      metrics,
      overallAssessment: strengths.length >= weaknesses.length
        ? 'Project shows more strengths than weaknesses. Focus on addressing the identified gaps.'
        : 'Several areas need attention. Prioritize the weaknesses list for the biggest impact.',
    });
  } catch (error) {
    logger.error('assess_project_health failed', { error });
    return JSON.stringify({ error: 'Failed to assess project health' });
  }
}

// ─── Tool 4: get_dependency_analysis ───────────────────────────────────────

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}

const SECURITY_RELEVANT_PACKAGES = new Set([
  'bcrypt', 'bcryptjs', 'jsonwebtoken', 'jose', 'passport',
  'helmet', 'cors', 'csurf', 'express-rate-limit', 'rate-limiter-flexible',
  'crypto-js', 'node-forge', 'oauth', 'openid-client',
  'next-auth', '@auth/core', 'lucia',
]);

const LARGE_FRAMEWORK_GROUPS: Record<string, string[]> = {
  'React Ecosystem': ['react', 'react-dom', 'next', '@next/font', '@next/mdx'],
  'State Management': ['zustand', 'redux', '@reduxjs/toolkit', 'jotai', 'recoil', 'mobx', 'valtio'],
  'Styling': ['tailwindcss', 'styled-components', '@emotion/react', 'sass', 'postcss', 'autoprefixer'],
  'Testing': ['jest', 'vitest', '@testing-library/react', '@testing-library/jest-dom', 'cypress', 'playwright'],
  'Database': ['prisma', '@prisma/client', 'better-sqlite3', 'pg', 'mysql2', 'drizzle-orm', 'knex', 'typeorm'],
  'Build Tools': ['typescript', 'webpack', 'vite', 'esbuild', 'swc', 'turbopack', 'tsup'],
  'AI/LLM': ['@anthropic-ai/sdk', 'openai', 'langchain', '@langchain/core', 'ai', '@ai-sdk/anthropic'],
};

async function getDependencyAnalysis(
  projectId: string,
  projectPath?: string,
): Promise<string> {
  const rootPath = resolveProjectPath(projectId, projectPath);

  if (!rootPath) {
    return JSON.stringify({ error: 'Project path not found.' });
  }

  const pkgPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return JSON.stringify({ error: 'No package.json found at project root.' });
  }

  try {
    const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const peerDeps = pkg.peerDependencies || {};

    const allDepsNames = Object.keys(deps);
    const allDevDepsNames = Object.keys(devDeps);
    const totalCount = allDepsNames.length + allDevDepsNames.length;

    // Identify dependency groups present
    const groupsFound: Record<string, string[]> = {};
    for (const [group, packages] of Object.entries(LARGE_FRAMEWORK_GROUPS)) {
      const found = packages.filter(p => p in deps || p in devDeps);
      if (found.length > 0) {
        groupsFound[group] = found;
      }
    }

    // Identify security-relevant packages
    const securityPackages = [...allDepsNames, ...allDevDepsNames]
      .filter(name => SECURITY_RELEVANT_PACKAGES.has(name));

    // Check for potentially outdated version patterns
    const potentiallyPinned: string[] = [];
    const wildcardVersions: string[] = [];
    for (const [name, version] of [...Object.entries(deps), ...Object.entries(devDeps)]) {
      if (version === '*' || version === 'latest') {
        wildcardVersions.push(name);
      }
      // Exact pins without caret or tilde
      if (/^\d+\.\d+\.\d+$/.test(version)) {
        potentiallyPinned.push(name);
      }
    }

    // Size assessment
    let sizeAssessment: string;
    if (totalCount < 20) {
      sizeAssessment = 'lean';
    } else if (totalCount < 50) {
      sizeAssessment = 'moderate';
    } else if (totalCount < 100) {
      sizeAssessment = 'large';
    } else {
      sizeAssessment = 'very large — consider auditing for unused dependencies';
    }

    // Check for lockfile
    const hasLockfile = fs.existsSync(path.join(rootPath, 'package-lock.json'))
      || fs.existsSync(path.join(rootPath, 'yarn.lock'))
      || fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))
      || fs.existsSync(path.join(rootPath, 'bun.lockb'));

    return JSON.stringify({
      projectName: pkg.name || 'unknown',
      counts: {
        dependencies: allDepsNames.length,
        devDependencies: allDevDepsNames.length,
        peerDependencies: Object.keys(peerDeps).length,
        total: totalCount,
      },
      sizeAssessment,
      hasLockfile,
      engines: pkg.engines || null,
      dependencyGroups: groupsFound,
      securityPackages: securityPackages.length > 0 ? securityPackages : 'none detected',
      warnings: {
        wildcardVersions: wildcardVersions.length > 0 ? wildcardVersions : undefined,
        exactlyPinnedCount: potentiallyPinned.length > 10 ? potentiallyPinned.length : undefined,
      },
    });
  } catch (error) {
    logger.error('get_dependency_analysis failed', { error });
    return JSON.stringify({ error: 'Failed to analyze dependencies' });
  }
}
