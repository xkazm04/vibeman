/**
 * Tests for path-security confinement helpers.
 *
 * These guard the disk read/write/list APIs (the arbitrary-whole-machine-access
 * criticals fixed 2026-06-19). The exploit branches previously shipped with zero
 * coverage; these assert the actual security invariants, not just that the code runs.
 *
 * All paths are built with `path.resolve` / `path.join` so the assertions use the
 * running platform's own separator and stay correct on both Windows and POSIX CI.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  validatePathWithinAllowedRoots,
  validateSafeBasePath,
  validateFilePath,
  validatePathTraversal,
} from '@/lib/pathSecurity';

const NUL = String.fromCharCode(0);

describe('pathSecurity', () => {
  describe('validatePathWithinAllowedRoots', () => {
    const root = path.resolve('/projects/app');
    const otherRoot = path.resolve('/work/site');

    it('allows a path inside an allowed root', () => {
      expect(validatePathWithinAllowedRoots(path.join(root, 'src/index.ts'), [root])).toBeNull();
    });

    it('allows the root directory itself', () => {
      expect(validatePathWithinAllowedRoots(root, [root])).toBeNull();
    });

    it('allows a path inside any one of several roots', () => {
      expect(validatePathWithinAllowedRoots(path.join(otherRoot, 'a.ts'), [root, otherRoot])).toBeNull();
    });

    it('rejects a path outside all roots (the /etc/passwd case)', () => {
      expect(validatePathWithinAllowedRoots(path.resolve('/etc/passwd'), [root])).not.toBeNull();
    });

    it('rejects a sibling that merely shares a name prefix (no partial-prefix escape)', () => {
      // /projects/app-evil must NOT be treated as inside /projects/app
      expect(validatePathWithinAllowedRoots(path.resolve('/projects/app-evil/x'), [root])).not.toBeNull();
    });

    it('rejects everything when there are no allowed roots', () => {
      expect(validatePathWithinAllowedRoots(path.join(root, 'x'), [])).not.toBeNull();
    });

    it('skips empty/invalid root entries but still honors valid ones', () => {
      expect(validatePathWithinAllowedRoots(path.join(root, 'x'), ['', root])).toBeNull();
    });
  });

  describe('validateSafeBasePath', () => {
    it('allows a normal (non-system) directory', () => {
      expect(validateSafeBasePath(path.resolve('some/user/projects'))).toBeNull();
    });

    it('rejects directory traversal', () => {
      expect(validateSafeBasePath('../../etc')).not.toBeNull();
    });

    it('rejects a Windows system root (case-insensitive exact match)', () => {
      expect(validateSafeBasePath('C:\\Windows')).not.toBeNull();
      expect(validateSafeBasePath('c:\\windows')).not.toBeNull();
      expect(validateSafeBasePath('C:\\Program Files')).not.toBeNull();
    });
  });

  describe('validateFilePath', () => {
    it('rejects a null-byte path', () => {
      expect(validateFilePath(`a${NUL}b`).valid).toBe(false);
    });

    it('rejects a traversal path', () => {
      expect(validateFilePath('../secret').valid).toBe(false);
    });

    it('accepts a clean absolute path', () => {
      const r = validateFilePath(path.resolve('/projects/app/src/x.ts'));
      expect(r.valid).toBe(true);
      if (r.valid) expect(path.isAbsolute(r.resolvedPath)).toBe(true);
    });
  });

  describe('validatePathTraversal', () => {
    it('flags ".."', () => expect(validatePathTraversal('a/../b')).not.toBeNull());
    it('flags "~"', () => expect(validatePathTraversal('~/x')).not.toBeNull());
    it('passes a clean relative path', () => expect(validatePathTraversal('a/b/c.ts')).toBeNull());
    it('rejects empty input', () => expect(validatePathTraversal('')).not.toBeNull());
  });
});
