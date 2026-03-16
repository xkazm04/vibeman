/**
 * Build Validator
 *
 * Runs `tsc --noEmit` as a build validation gate after execution.
 * Captures pass/fail status and error output for the review stage.
 */

import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface BuildResult {
  passed: boolean;
  errorOutput?: string;
  durationMs: number;
  skipped?: boolean;
  reason?: string;
}

// ============================================================================
// Build Validation
// ============================================================================

/**
 * Run tsc --noEmit and return the result.
 *
 * - If no tsconfig.json exists, returns passed=true with skipped=true
 * - On success, returns passed=true with durationMs
 * - On failure, returns passed=false with errorOutput and durationMs
 */
export function runBuildValidation(projectPath: string): BuildResult {
  // Check for tsconfig.json first
  if (!fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
    return {
      passed: true,
      skipped: true,
      reason: 'No tsconfig.json found',
      durationMs: 0,
    };
  }

  const start = Date.now();
  try {
    execSync('npx tsc --noEmit', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const err = error as Error & { stderr?: string; stdout?: string };
    const errorOutput = err.stderr || err.stdout || String(error);
    return {
      passed: false,
      errorOutput,
      durationMs: Date.now() - start,
    };
  }
}
