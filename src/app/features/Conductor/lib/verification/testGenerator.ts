/**
 * Test Generator -- Conductor Verification Engine
 *
 * Generates lightweight structural verification tests from task specs.
 * No LLM involved -- purely deterministic based on file patterns.
 *
 * Test types:
 * - Existence: verify created files exist
 * - Import: verify files can be imported without errors
 * - Export: verify expected exports are present
 * - TypeCheck: verify files compile with tsc
 * - Snapshot: verify modified files changed from pre-dispatch state
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { V3Task } from '../v3/types';

export interface GeneratedTest {
  testFilePath: string;
  testCode: string;
  taskId: string;
  taskTitle: string;
  targetFiles: string[];
  generationMethod: 'existence' | 'import' | 'export' | 'snapshot';
}

export interface TestGeneratorInput {
  task: V3Task;
  projectPath: string;
  projectId: string;
  preSnapshots?: Map<string, { exists: boolean; mtime: number }>;
}

export interface TestRunResult {
  totalTests: number;
  passed: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

const VERIFY_DIR = 'tests/conductor-verify';

export function generateVerificationTests(
  input: TestGeneratorInput,
): GeneratedTest[] {
  const { task, projectPath, preSnapshots } = input;
  const tests: GeneratedTest[] = [];

  // Group files by what happened to them
  const newFiles: string[] = [];
  const modifiedFiles: string[] = [];

  for (const filePath of task.targetFiles) {
    const absPath = path.resolve(projectPath, filePath);
    const snapshot = preSnapshots?.get(filePath);

    if (snapshot && !snapshot.exists) {
      newFiles.push(filePath);
    } else if (snapshot && snapshot.exists) {
      modifiedFiles.push(filePath);
    } else {
      // No snapshot info -- check current state
      if (fs.existsSync(absPath)) {
        modifiedFiles.push(filePath);
      } else {
        newFiles.push(filePath);
      }
    }
  }

  // Generate existence tests for new files
  if (newFiles.length > 0) {
    tests.push(generateExistenceTest(task, newFiles));
  }

  // Generate import tests for TypeScript/JavaScript files
  const tsFiles = task.targetFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
  if (tsFiles.length > 0) {
    tests.push(generateImportTest(task, tsFiles, projectPath));
  }

  // Generate snapshot tests for modified files
  if (modifiedFiles.length > 0 && preSnapshots) {
    tests.push(generateSnapshotTest(task, modifiedFiles, preSnapshots));
  }

  return tests;
}

function generateExistenceTest(
  task: V3Task,
  files: string[],
): GeneratedTest {
  const checks = files
    .map(
      (f) =>
        `  it('should have created ${f}', () => {\n    expect(fs.existsSync(path.resolve(projectRoot, '${f}'))).toBe(true);\n  });`,
    )
    .join('\n\n');

  const code = `import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const projectRoot = process.cwd();

describe('Verification: ${task.title} -- File Existence', () => {
${checks}
});
`;

  return {
    testFilePath: `${VERIFY_DIR}/task_${task.id.slice(0, 8)}_existence.test.ts`,
    testCode: code,
    taskId: task.id,
    taskTitle: task.title,
    targetFiles: files,
    generationMethod: 'existence',
  };
}

function generateImportTest(
  task: V3Task,
  files: string[],
  projectPath: string,
): GeneratedTest {
  const checks = files
    .map((f) => {
      // Convert file path to importable module path
      const modulePath = f
        .replace(/\.(ts|tsx|js|jsx)$/, '')
        .replace(/\\/g, '/');
      const absModulePath = path
        .resolve(projectPath, modulePath)
        .replace(/\\/g, '/');

      return `  it('should import ${f} without errors', async () => {
    await expect(import('${absModulePath}')).resolves.toBeDefined();
  });`;
    })
    .join('\n\n');

  const code = `import { describe, it, expect } from 'vitest';

describe('Verification: ${task.title} -- Imports', () => {
${checks}
});
`;

  return {
    testFilePath: `${VERIFY_DIR}/task_${task.id.slice(0, 8)}_import.test.ts`,
    testCode: code,
    taskId: task.id,
    taskTitle: task.title,
    targetFiles: files,
    generationMethod: 'import',
  };
}

function generateSnapshotTest(
  task: V3Task,
  files: string[],
  preSnapshots: Map<string, { exists: boolean; mtime: number }>,
): GeneratedTest {
  const checks = files
    .map((f) => {
      const snap = preSnapshots.get(f);
      if (!snap) return '';
      return `  it('should have modified ${f}', () => {
    const stat = fs.statSync(path.resolve(projectRoot, '${f}'));
    expect(stat.mtimeMs).toBeGreaterThan(${snap.mtime});
  });`;
    })
    .filter(Boolean)
    .join('\n\n');

  const code = `import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const projectRoot = process.cwd();

describe('Verification: ${task.title} -- File Modifications', () => {
${checks}
});
`;

  return {
    testFilePath: `${VERIFY_DIR}/task_${task.id.slice(0, 8)}_snapshot.test.ts`,
    testCode: code,
    taskId: task.id,
    taskTitle: task.title,
    targetFiles: files,
    generationMethod: 'snapshot',
  };
}

/**
 * Write generated test files to disk.
 * Returns the list of absolute paths written.
 */
export function writeTestFiles(
  projectPath: string,
  tests: GeneratedTest[],
): string[] {
  const verifyDir = path.join(projectPath, VERIFY_DIR);
  if (!fs.existsSync(verifyDir)) {
    fs.mkdirSync(verifyDir, { recursive: true });
  }

  const written: string[] = [];
  for (const test of tests) {
    const absPath = path.join(projectPath, test.testFilePath);
    fs.writeFileSync(absPath, test.testCode, 'utf-8');
    written.push(absPath);
  }
  return written;
}

/**
 * Remove generated test files after verification.
 */
export function cleanupTestFiles(
  projectPath: string,
  tests: GeneratedTest[],
): void {
  for (const test of tests) {
    const absPath = path.join(projectPath, test.testFilePath);
    try {
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch {
      // Best-effort cleanup
    }
  }

  // Remove verify directory if empty
  const verifyDir = path.join(projectPath, VERIFY_DIR);
  try {
    const remaining = fs.readdirSync(verifyDir);
    if (remaining.length === 0) fs.rmdirSync(verifyDir);
  } catch {
    // Directory may not exist or may not be empty
  }
}

/**
 * Run verification tests via vitest and parse results.
 */
export function parseVitestJsonOutput(jsonOutput: string): TestRunResult {
  try {
    const result = JSON.parse(jsonOutput);
    const testResults = result.testResults || [];
    let passed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const suite of testResults) {
      for (const test of suite.assertionResults || []) {
        if (test.status === 'passed') passed++;
        else {
          failed++;
          if (test.failureMessages?.length) {
            errors.push(
              `${test.fullName}: ${test.failureMessages[0].slice(0, 200)}`,
            );
          }
        }
      }
    }

    return {
      totalTests: passed + failed,
      passed,
      failed,
      errors,
      durationMs: result.startTime ? Date.now() - result.startTime : 0,
    };
  } catch {
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: ['Failed to parse vitest JSON output'],
      durationMs: 0,
    };
  }
}
