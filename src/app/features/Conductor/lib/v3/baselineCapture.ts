/**
 * Baseline Capture — Harness Pattern Integration
 *
 * Captures the project's health state BEFORE any pipeline work begins.
 * Enables the reflect phase to evaluate delta (did we make things better
 * or worse?) rather than just absolute state (does it compile?).
 *
 * Also provides foundation-first task injection: if the baseline has
 * type errors, a wave-0 fix task is auto-generated before LLM-planned tasks.
 */

import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { BaselineMetrics, V3Task } from './types';

// ============================================================================
// Baseline Capture
// ============================================================================

/**
 * Capture baseline metrics for a project before pipeline execution.
 * Runs tsc and optionally vitest to measure current health.
 */
export function captureBaseline(projectPath: string): BaselineMetrics {
  const now = new Date().toISOString();

  // TypeScript compilation check
  let typeErrors = 0;
  let typeErrorOutput = '';

  if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
    try {
      execSync('npx tsc --noEmit', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: unknown) {
      const err = error as Error & { stderr?: string; stdout?: string };
      typeErrorOutput = (err.stderr || err.stdout || '').slice(0, 2000);
      // Count errors by matching "error TS" patterns
      const errorMatches = typeErrorOutput.match(/error TS\d+/g);
      typeErrors = errorMatches ? errorMatches.length : 1;
    }
  }

  // Test pass rate (quick check — only if vitest is configured)
  let testsPassed = 0;
  let testsTotal = 0;
  const hasVitest = fs.existsSync(path.join(projectPath, 'vitest.config.ts'))
    || fs.existsSync(path.join(projectPath, 'vitest.config.js'));

  if (hasVitest) {
    try {
      const output = execSync('npx vitest run --reporter=json 2>/dev/null', {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 180000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const parsed = JSON.parse(output);
      testsTotal = parsed.numTotalTests || 0;
      testsPassed = parsed.numPassedTests || 0;
    } catch (error: unknown) {
      // vitest exits non-zero on failures — try to parse stdout
      const err = error as Error & { stdout?: string };
      try {
        if (err.stdout) {
          const parsed = JSON.parse(err.stdout);
          testsTotal = parsed.numTotalTests || 0;
          testsPassed = parsed.numPassedTests || 0;
        }
      } catch {
        // Can't parse — leave at 0/0
      }
    }
  }

  return {
    typeErrors,
    typeErrorOutput,
    testsPassed,
    testsTotal,
    buildPassing: typeErrors === 0,
    capturedAt: now,
  };
}

// ============================================================================
// Foundation-First Rule
// ============================================================================

/**
 * If the baseline has type errors, generate a wave-0 "fix type errors" task
 * that runs before all LLM-planned tasks. This ensures the codebase compiles
 * before feature work begins (Harness Tier 0 pattern).
 */
export function generateFoundationTask(baseline: BaselineMetrics, projectPath: string): V3Task | null {
  if (baseline.typeErrors === 0) return null;

  // Extract the most relevant error info for the task description
  const errorSnippet = baseline.typeErrorOutput.slice(0, 800);

  return {
    id: uuidv4(),
    title: 'Fix baseline TypeScript compilation errors',
    description: [
      `The project has ${baseline.typeErrors} TypeScript error(s) that must be fixed before any feature work begins.`,
      '',
      '## Baseline Errors',
      '```',
      errorSnippet,
      '```',
      '',
      '## Instructions',
      '1. Run `npx tsc --noEmit` to see all errors',
      '2. Fix each error — prefer minimal, targeted fixes',
      '3. Do NOT refactor surrounding code or add features',
      '4. Do NOT delete files or remove functionality to "fix" errors',
      '5. If an error is caused by a stale `.next/types/` cache, delete that directory',
      '6. Verify with `npx tsc --noEmit` = 0 errors',
    ].join('\n'),
    targetFiles: extractFilesFromErrors(errorSnippet, projectPath),
    complexity: baseline.typeErrors <= 3 ? 1 : 2,
    dependsOn: [],
    status: 'pending',
  };
}

/**
 * Inject foundation task as wave-0 before all LLM-planned tasks.
 * All planned tasks get a dependency on the foundation task.
 */
export function prependFoundationTask(tasks: V3Task[], foundationTask: V3Task): V3Task[] {
  // Make all root tasks (no dependencies) depend on the foundation task
  for (const task of tasks) {
    if (task.dependsOn.length === 0) {
      task.dependsOn.push(foundationTask.id);
    }
  }

  return [foundationTask, ...tasks];
}

// ============================================================================
// Inter-Wave Quality Gate
// ============================================================================

export interface WaveGateResult {
  passed: boolean;
  typeErrors: number;
  newErrorsIntroduced: number;
  errorOutput: string;
}

/**
 * Run a quick type check between DAG waves.
 * Compares against baseline to detect regressions.
 */
export function runInterWaveGate(projectPath: string, baseline: BaselineMetrics): WaveGateResult {
  let typeErrors = 0;
  let errorOutput = '';

  try {
    execSync('npx tsc --noEmit', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: unknown) {
    const err = error as Error & { stderr?: string; stdout?: string };
    errorOutput = (err.stderr || err.stdout || '').slice(0, 2000);
    const errorMatches = errorOutput.match(/error TS\d+/g);
    typeErrors = errorMatches ? errorMatches.length : 1;
  }

  const newErrorsIntroduced = Math.max(0, typeErrors - baseline.typeErrors);

  return {
    passed: newErrorsIntroduced === 0,
    typeErrors,
    newErrorsIntroduced,
    errorOutput,
  };
}

// ============================================================================
// Learnings Loader
// ============================================================================

const LEARNINGS_PATHS = [
  'docs/harness/harness-learnings.md',
  '.planning/LEARNINGS.md',
  'LEARNINGS.md',
];

/**
 * Load accumulated learnings from the project's learnings file.
 * Returns formatted prompt section, or empty string if no learnings found.
 */
export function loadLearnings(projectPath: string): string {
  for (const relPath of LEARNINGS_PATHS) {
    const absPath = path.join(projectPath, relPath);
    if (fs.existsSync(absPath)) {
      try {
        const content = fs.readFileSync(absPath, 'utf-8');
        return parseLearningsForPrompt(content);
      } catch {
        continue;
      }
    }
  }
  return '';
}

/**
 * Parse a learnings markdown file into categorized rules for prompt injection.
 * Extracts bullet points under ## headings, filters by relevance.
 */
function parseLearningsForPrompt(content: string): string {
  const lines = content.split('\n');
  const rules: string[] = [];
  let currentSection = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim();
    } else if (line.startsWith('- ') && currentSection) {
      rules.push(`[${currentSection}] ${line.slice(2).trim()}`);
    }
  }

  if (rules.length === 0) return '';

  return [
    '## Accumulated Learnings',
    '',
    'These rules were learned from previous development cycles. Follow them to avoid known pitfalls:',
    '',
    ...rules.map(r => `- ${r}`),
  ].join('\n');
}

/**
 * Filter learnings to only include rules relevant to a task's target files.
 */
export function filterLearningsForTask(
  fullLearnings: string,
  targetFiles: string[]
): string {
  if (!fullLearnings) return '';

  const lines = fullLearnings.split('\n');
  const header = lines.slice(0, 3);
  const rules = lines.slice(3).filter(l => l.startsWith('- '));

  // Determine task context from file patterns
  const contexts = new Set<string>();
  for (const file of targetFiles) {
    if (/\.tsx?$/.test(file)) contexts.add('TypeScript');
    if (/\.tsx$/.test(file) || /components\//.test(file)) contexts.add('React');
    if (/route\.ts$/.test(file) || /api\//.test(file)) contexts.add('API');
    if (/\.test\./.test(file) || /tests\//.test(file)) contexts.add('Testing');
    if (/migration/.test(file) || /repository/.test(file)) contexts.add('Database');
    if (/store/.test(file) || /hooks\//.test(file)) contexts.add('Hooks');
  }

  // Include rules that match any detected context
  const contextKeywords: Record<string, RegExp> = {
    'TypeScript': /typescript|tsc|type|any\b|strict/i,
    'React': /react|useRef|useCallback|useEffect|component|hook|jsx|tsx/i,
    'API': /api|route|endpoint|response|error.*handling|catch/i,
    'Testing': /test|vitest|mock|waitFor|timer|jest|assert/i,
    'Database': /sqlite|database|migration|repository|table|column|pragma/i,
    'Hooks': /useRef|useCallback|closure|stale|timer|re-render/i,
  };

  const relevantRules = rules.filter(rule => {
    for (const ctx of contexts) {
      const pattern = contextKeywords[ctx];
      if (pattern && pattern.test(rule)) return true;
    }
    return false;
  });

  if (relevantRules.length === 0) return '';
  return [...header, ...relevantRules].join('\n');
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract file paths from TypeScript error output.
 */
function extractFilesFromErrors(errorOutput: string, projectPath: string): string[] {
  const filePattern = /^(.+\.tsx?)\(\d+,\d+\):/gm;
  const files = new Set<string>();
  let match;
  while ((match = filePattern.exec(errorOutput)) !== null) {
    // Normalize to relative path
    let filePath = match[1].replace(/\\/g, '/');
    const projNormalized = projectPath.replace(/\\/g, '/');
    if (filePath.startsWith(projNormalized)) {
      filePath = filePath.slice(projNormalized.length + 1);
    }
    files.add(filePath);
  }
  return Array.from(files).slice(0, 5); // Max 5 files for scope limits
}
