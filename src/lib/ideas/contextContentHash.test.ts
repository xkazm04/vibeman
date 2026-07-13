import { describe, it, expect } from 'vitest';
import { computeContextContentHash, decideScanFreshness } from './contextContentHash';

describe('computeContextContentHash', () => {
  const files = [
    { path: 'a.ts', content: 'export const a = 1;' },
    { path: 'b.ts', content: 'export const b = 2;' },
  ];

  it('returns null for an empty file set', () => {
    expect(computeContextContentHash([])).toBeNull();
  });

  it('is deterministic for identical input', () => {
    expect(computeContextContentHash(files)).toBe(computeContextContentHash(files));
  });

  it('is independent of file ordering', () => {
    const reversed = [...files].reverse();
    expect(computeContextContentHash(reversed)).toBe(computeContextContentHash(files));
  });

  it('changes when any file content changes', () => {
    const changed = [files[0], { path: 'b.ts', content: 'export const b = 3;' }];
    expect(computeContextContentHash(changed)).not.toBe(computeContextContentHash(files));
  });

  it('changes when a file path changes (same content moved)', () => {
    const renamed = [{ path: 'c.ts', content: files[0].content }, files[1]];
    expect(computeContextContentHash(renamed)).not.toBe(computeContextContentHash(files));
  });

  it('changes when a file is added', () => {
    const more = [...files, { path: 'c.ts', content: 'export const c = 3;' }];
    expect(computeContextContentHash(more)).not.toBe(computeContextContentHash(files));
  });
});

describe('decideScanFreshness', () => {
  it('is unchanged only when hashes match and not forced', () => {
    expect(decideScanFreshness({ currentHash: 'x', previousHash: 'x' })).toBe('unchanged');
  });

  it('is changed when hashes differ', () => {
    expect(decideScanFreshness({ currentHash: 'x', previousHash: 'y' })).toBe('changed');
  });

  it('is changed when there is no previous hash (first scan)', () => {
    expect(decideScanFreshness({ currentHash: 'x', previousHash: null })).toBe('changed');
    expect(decideScanFreshness({ currentHash: 'x', previousHash: undefined })).toBe('changed');
  });

  it('is changed when the current hash is unavailable', () => {
    expect(decideScanFreshness({ currentHash: null, previousHash: 'x' })).toBe('changed');
  });

  it('force always yields changed, even on a hash match', () => {
    expect(decideScanFreshness({ currentHash: 'x', previousHash: 'x', force: true })).toBe('changed');
  });
});
