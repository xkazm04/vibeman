/**
 * buildStaleResolver — mtime+size short-circuit (Direction 3c).
 *
 * Proves the resolver skips the sha256 re-hash when (size, mtime) match the
 * baseline, still detects genuine content changes, and returns verdicts
 * identical to a resolver that always hashes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, statSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { buildStaleResolver, hashFileAt, type BaselineEntry } from './fileHashes';

let dir: string;

function write(rel: string, content: string): void {
  writeFileSync(path.join(dir, rel), content);
}
/** Baseline entry from the file's current on-disk fingerprint. */
function fingerprint(rel: string): BaselineEntry {
  const h = hashFileAt(path.join(dir, rel))!;
  return { sha256: h.sha256, size: h.size, mtimeMs: h.mtimeMs };
}
/** Reference resolver that ALWAYS hashes (the pre-optimization behaviour). */
function refResolver(baseline: Map<string, BaselineEntry>) {
  return (rel: string): boolean => {
    const base = baseline.get(rel);
    if (!base) return false;
    const h = hashFileAt(path.join(dir, rel));
    return h != null && h.sha256 !== base.sha256;
  };
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'fh-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('buildStaleResolver short-circuit', () => {
  it('trusts a matching (size, mtime) and SKIPS the hash', () => {
    write('a.ts', 'hello');
    const st = statSync(path.join(dir, 'a.ts'));
    // Deliberately WRONG sha but correct stat signature: if the resolver hashed,
    // it would flag stale; the short-circuit trusts the stat and returns false.
    const baseline = new Map<string, BaselineEntry>([
      ['a.ts', { sha256: 'deadbeef', size: st.size, mtimeMs: Math.floor(st.mtimeMs) }],
    ]);
    expect(buildStaleResolver(dir, baseline)('a.ts')).toBe(false);
  });

  it('falls back to hashing when the baseline has no mtime (pre-migration row)', () => {
    write('a.ts', 'hello');
    const st = statSync(path.join(dir, 'a.ts'));
    const baseline = new Map<string, BaselineEntry>([
      ['a.ts', { sha256: 'deadbeef', size: st.size, mtimeMs: null }],
    ]);
    // No mtime ⇒ hash path ⇒ real sha != deadbeef ⇒ stale.
    expect(buildStaleResolver(dir, baseline)('a.ts')).toBe(true);
  });

  it('detects a genuine content change (size differs)', () => {
    write('a.ts', 'hello');
    const base = new Map([['a.ts', fingerprint('a.ts')]]);
    write('a.ts', 'hello world'); // grew
    expect(buildStaleResolver(dir, base)('a.ts')).toBe(true);
  });

  it('detects a same-size content change (mtime bumped)', () => {
    write('a.ts', 'AAAA');
    const base = new Map([['a.ts', fingerprint('a.ts')]]);
    write('a.ts', 'BBBB'); // same length, different bytes
    const future = Date.now() / 1000 + 10;
    utimesSync(path.join(dir, 'a.ts'), future, future);
    expect(buildStaleResolver(dir, base)('a.ts')).toBe(true);
  });

  it('returns false for a file with no baseline', () => {
    write('a.ts', 'hello');
    expect(buildStaleResolver(dir, new Map())('a.ts')).toBe(false);
  });

  it('gives verdicts identical to the always-hash reference resolver', () => {
    write('unchanged.ts', 'stay');
    write('grow.ts', 'small');
    write('same-len.ts', 'AAAA');
    write('rewrite-same.ts', 'identical');
    const baseline = new Map<string, BaselineEntry>([
      ['unchanged.ts', fingerprint('unchanged.ts')],
      ['grow.ts', fingerprint('grow.ts')],
      ['same-len.ts', fingerprint('same-len.ts')],
      ['rewrite-same.ts', fingerprint('rewrite-same.ts')],
    ]);

    // Mutate after baselining.
    write('grow.ts', 'small + more'); // size change
    write('same-len.ts', 'BBBB');     // same size, different content
    write('rewrite-same.ts', 'identical'); // identical content, new mtime
    const future = Date.now() / 1000 + 20;
    for (const f of ['same-len.ts', 'rewrite-same.ts']) {
      utimesSync(path.join(dir, f), future, future);
    }

    const optimized = buildStaleResolver(dir, baseline);
    const reference = refResolver(baseline);
    for (const rel of ['unchanged.ts', 'grow.ts', 'same-len.ts', 'rewrite-same.ts']) {
      expect(optimized(rel), rel).toBe(reference(rel));
    }
  });
});
