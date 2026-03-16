/**
 * Build Validator Tests (VALD-01)
 *
 * Validates tsc --noEmit build validation gate.
 * Uses mocks for child_process and fs to test all paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'child_process';
import * as fs from 'node:fs';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

import {
  runBuildValidation,
  type BuildResult,
} from '@/app/features/Conductor/lib/execution/buildValidator';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runBuildValidation', () => {
  it('returns passed=true when tsc succeeds', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(childProcess.execSync).mockReturnValue('');

    const result = runBuildValidation('/project');
    expect(result.passed).toBe(true);
    expect(result.errorOutput).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns passed=false with errorOutput when tsc fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const error = new Error('tsc failed') as Error & { stderr: string; stdout: string };
    error.stderr = 'src/a.ts(3,1): error TS2304: Cannot find name "foo".';
    error.stdout = '';
    vi.mocked(childProcess.execSync).mockImplementation(() => { throw error; });

    const result = runBuildValidation('/project');
    expect(result.passed).toBe(false);
    expect(result.errorOutput).toContain('TS2304');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns passed=true with skipped=true when no tsconfig.json found', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = runBuildValidation('/project');
    expect(result.passed).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('tsconfig');
    expect(result.durationMs).toBe(0);
  });

  it('records durationMs in all cases', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(childProcess.execSync).mockReturnValue('');

    const result = runBuildValidation('/project');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('captures stderr or stdout from tsc error', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const error = new Error('fail') as Error & { stderr: string; stdout: string };
    error.stderr = '';
    error.stdout = 'some stdout error';
    vi.mocked(childProcess.execSync).mockImplementation(() => { throw error; });

    const result = runBuildValidation('/project');
    expect(result.passed).toBe(false);
    expect(result.errorOutput).toBe('some stdout error');
  });
});
