/**
 * Content-hash freshness for idea scans — "scan only what drifted".
 *
 * Every scan is otherwise a fresh full-prompt LLM call regardless of whether the
 * context's code moved since the last scan of that type. This module derives a
 * stable hash of the exact files fed to the model; the scan pipeline records it
 * on the scan row and, on the next scan, skips the LLM call when the hash has
 * not moved (unless the caller forces it). Pure + dependency-light so it is
 * trivially testable.
 */

import { createHash } from 'crypto';

/** A file as handed to idea generation: a relative path + its (possibly truncated) content. */
export interface HashableFile {
  path: string;
  content: string;
}

/**
 * Compute an order-independent content hash over the given files. Each file
 * contributes `path\0sha256(content)`; the per-file digests are sorted (so file
 * ordering never changes the result) and hashed together. Hashing the actual
 * prompt input — not the on-disk bytes — means the hash reflects exactly what
 * the model saw, including any per-file truncation the caller applied.
 *
 * Returns null for an empty file set (nothing to compare against).
 */
export function computeContextContentHash(files: HashableFile[]): string | null {
  if (!files || files.length === 0) return null;
  const perFile = files.map(
    (f) => `${f.path}\0${createHash('sha256').update(f.content ?? '').digest('hex')}`
  );
  perFile.sort();
  return createHash('sha256').update(perFile.join('\n')).digest('hex');
}

/** Explicit freshness verdict surfaced to callers/UI — never a silent skip. */
export type ScanFreshness = 'changed' | 'unchanged';

/**
 * Decide whether a scan can be skipped as unchanged.
 *
 * `unchanged` requires: not forced, a hash for the current input, a recorded
 * previous hash, and the two being equal. Every other case is `changed` (a
 * missing prior hash, a first-ever scan, or a real content move), so the default
 * is always to scan — freshness only ever suppresses provably-identical work.
 */
export function decideScanFreshness(params: {
  currentHash: string | null;
  previousHash: string | null | undefined;
  force?: boolean;
}): ScanFreshness {
  const { currentHash, previousHash, force } = params;
  if (force) return 'changed';
  if (!currentHash || !previousHash) return 'changed';
  return currentHash === previousHash ? 'unchanged' : 'changed';
}
