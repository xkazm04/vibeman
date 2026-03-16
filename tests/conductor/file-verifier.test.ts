/**
 * File Verifier Tests (EXEC-02)
 *
 * Validates post-execution file modification verification:
 * snapshot before/after, create/delete/modify checks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  snapshotFiles,
  verifyExecution,
  type FileSnapshot,
} from '@/app/features/Conductor/lib/execution/fileVerifier';
import type { AffectedFiles } from '@/app/features/Conductor/lib/types';

// ============================================================================
// Temp directory helpers
// ============================================================================

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(relativePath: string, content: string = 'test') {
  const fullPath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

// ============================================================================
// snapshotFiles
// ============================================================================

describe('snapshotFiles', () => {
  it('returns exists=true and mtimeMs for existing files', () => {
    writeFile('src/a.ts');
    const snapshots = snapshotFiles(tmpDir, ['src/a.ts']);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].exists).toBe(true);
    expect(snapshots[0].mtimeMs).toBeGreaterThan(0);
    expect(snapshots[0].path).toBe('src/a.ts');
  });

  it('returns exists=false and mtimeMs=0 for missing files', () => {
    const snapshots = snapshotFiles(tmpDir, ['src/missing.ts']);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].exists).toBe(false);
    expect(snapshots[0].mtimeMs).toBe(0);
  });

  it('handles multiple files', () => {
    writeFile('a.ts');
    const snapshots = snapshotFiles(tmpDir, ['a.ts', 'b.ts']);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].exists).toBe(true);
    expect(snapshots[1].exists).toBe(false);
  });
});

// ============================================================================
// verifyExecution
// ============================================================================

describe('verifyExecution', () => {
  it('fails if a create file does not exist after execution', () => {
    const af: AffectedFiles = { create: ['src/new.ts'], modify: [], delete: [] };
    const before: FileSnapshot[] = [{ path: 'src/new.ts', exists: false, mtimeMs: 0 }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('src/new.ts');
  });

  it('passes when create file exists after execution', () => {
    writeFile('src/new.ts', 'created');
    const af: AffectedFiles = { create: ['src/new.ts'], modify: [], delete: [] };
    const before: FileSnapshot[] = [{ path: 'src/new.ts', exists: false, mtimeMs: 0 }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(true);
  });

  it('fails if a delete file still exists after execution', () => {
    writeFile('src/old.ts', 'still here');
    const af: AffectedFiles = { create: [], modify: [], delete: ['src/old.ts'] };
    const before: FileSnapshot[] = [{ path: 'src/old.ts', exists: true, mtimeMs: 1000 }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('src/old.ts');
  });

  it('passes when delete file was removed', () => {
    const af: AffectedFiles = { create: [], modify: [], delete: ['src/old.ts'] };
    const before: FileSnapshot[] = [{ path: 'src/old.ts', exists: true, mtimeMs: 1000 }];

    // File does not exist (was deleted)
    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(true);
  });

  it('fails if NO modify file changed mtime', () => {
    writeFile('src/unchanged.ts', 'same');
    const mtime = fs.statSync(path.join(tmpDir, 'src/unchanged.ts')).mtimeMs;

    const af: AffectedFiles = { create: [], modify: ['src/unchanged.ts'], delete: [] };
    const before: FileSnapshot[] = [{ path: 'src/unchanged.ts', exists: true, mtimeMs: mtime }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('modify');
  });

  it('passes when at least one modify file has different mtime', () => {
    writeFile('src/changed.ts', 'updated content');
    const af: AffectedFiles = { create: [], modify: ['src/changed.ts'], delete: [] };
    // Use a different mtime to simulate the file was modified
    const before: FileSnapshot[] = [{ path: 'src/changed.ts', exists: true, mtimeMs: 0 }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(true);
  });

  it('passes when modify list is empty and create/delete pass', () => {
    writeFile('src/new.ts', 'created');
    const af: AffectedFiles = { create: ['src/new.ts'], modify: [], delete: [] };
    const before: FileSnapshot[] = [{ path: 'src/new.ts', exists: false, mtimeMs: 0 }];

    const result = verifyExecution(tmpDir, af, before);
    expect(result.passed).toBe(true);
  });

  it('passes when all lists are empty', () => {
    const af: AffectedFiles = { create: [], modify: [], delete: [] };
    const result = verifyExecution(tmpDir, af, []);
    expect(result.passed).toBe(true);
  });
});
