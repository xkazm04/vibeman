/**
 * Context file-hash baseline — content-hash freshness for the context map.
 *
 * A context's baseline is the sha256 of each of its files as-of when the context
 * metadata was last written. The on-demand audit compares the current on-disk
 * hash against this baseline to flag a context whose code changed since its
 * metadata was generated (content drift), distinct from a deleted file.
 *
 * Ports the Personas dev_context_file_hashes cache. All operations are
 * best-effort: a hashing/DB failure never throws into a caller.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { getDatabase } from '@/app/db/connection';
import { projectDb } from '@/lib/project_database';
import { logger } from '@/lib/logger';

/** Skip hashing files larger than this — generated bundles add no signal. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** A captured file fingerprint: content hash + the cheap stat signature. */
export interface FileFingerprint {
  sha256: string;
  size: number;
  /** Floored mtime in ms — integer so it round-trips through SQLite unchanged. */
  mtimeMs: number;
}

/** A stored baseline row. size/mtimeMs may be null for rows captured pre-migration. */
export interface BaselineEntry {
  sha256: string;
  size: number | null;
  mtimeMs: number | null;
}

export function hashFileAt(absPath: string): FileFingerprint | null {
  try {
    if (!existsSync(absPath)) return null;
    const st = statSync(absPath);
    if (st.size > MAX_FILE_BYTES) return null;
    const sha256 = createHash('sha256').update(readFileSync(absPath)).digest('hex');
    return { sha256, size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
  } catch {
    return null;
  }
}

/** Read the full baseline entries (`filePath → {sha256,size,mtimeMs}`) for a project. */
export function getBaselineEntries(projectId: string): Map<string, BaselineEntry> {
  const map = new Map<string, BaselineEntry>();
  try {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT file_path, sha256, size, mtime_ms FROM context_file_hashes WHERE project_id = ?')
      .all(projectId) as Array<{ file_path: string; sha256: string; size: number | null; mtime_ms: number | null }>;
    for (const r of rows) {
      map.set(r.file_path, { sha256: r.sha256, size: r.size, mtimeMs: r.mtime_ms });
    }
  } catch {
    // table/column may not exist yet (pre-migration) — treat as no baseline
  }
  return map;
}

function upsertHashes(
  projectId: string,
  entries: Array<{ filePath: string; sha256: string; size: number; mtimeMs: number }>
): void {
  if (entries.length === 0) return;
  const db = getDatabase();
  const stmt = db.prepare(
    `INSERT INTO context_file_hashes (project_id, file_path, sha256, size, mtime_ms, captured_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, file_path)
     DO UPDATE SET sha256 = excluded.sha256, size = excluded.size, mtime_ms = excluded.mtime_ms, captured_at = excluded.captured_at`
  );
  for (const e of entries) stmt.run(projectId, e.filePath, e.sha256, e.size, e.mtimeMs);
}

/**
 * Capture (baseline) the current hashes of a context's files. Call this when a
 * context is created or its files/metadata are (re)written — it records "the
 * code state this context reflects". Best-effort; resolves the project root
 * itself so callers only pass ids + relative paths.
 */
export function captureContextFileHashes(projectId: string, filePaths: string[]): void {
  try {
    if (!filePaths?.length) return;
    const projectPath = projectDb.getProject(projectId)?.path;
    if (!projectPath) return;
    const entries: Array<{ filePath: string; sha256: string; size: number; mtimeMs: number }> = [];
    for (const fp of filePaths) {
      const h = hashFileAt(path.join(projectPath, fp));
      if (h) entries.push({ filePath: fp, sha256: h.sha256, size: h.size, mtimeMs: h.mtimeMs });
    }
    upsertHashes(projectId, entries);
  } catch (e) {
    logger.warn?.(`[fileHashes] capture failed for ${projectId}: ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * Bootstrap baselines for files that have none yet (so freshness works for
 * contexts created before this feature), then return the full baseline map.
 * Never overwrites an existing baseline — that would erase drift.
 */
export function bootstrapMissingBaselines(
  projectId: string,
  projectPath: string,
  filePaths: string[]
): Map<string, BaselineEntry> {
  const baseline = getBaselineEntries(projectId);
  const missing = filePaths.filter((fp) => !baseline.has(fp));
  if (missing.length > 0) {
    const entries: Array<{ filePath: string; sha256: string; size: number; mtimeMs: number }> = [];
    for (const fp of missing) {
      const h = hashFileAt(path.join(projectPath, fp));
      if (h) {
        entries.push({ filePath: fp, sha256: h.sha256, size: h.size, mtimeMs: h.mtimeMs });
        baseline.set(fp, { sha256: h.sha256, size: h.size, mtimeMs: h.mtimeMs });
      }
    }
    try {
      upsertHashes(projectId, entries);
    } catch {
      /* best-effort bootstrap */
    }
  }
  return baseline;
}

/**
 * Build a resolver answering "has this file's content changed vs its baseline?"
 * A file with no baseline is treated as not-stale (unknown, not changed).
 *
 * Cheap short-circuit: when the current (size, mtime) both equal the baseline's,
 * the content is unchanged and the sha256 re-hash is skipped entirely. Only when
 * the stat signature differs (or the baseline predates the mtime column) do we
 * read + hash the file. The verdict is identical to hashing every time — this
 * only avoids reads for files that provably did not change.
 */
export function buildStaleResolver(
  projectPath: string,
  baseline: Map<string, BaselineEntry>
): (filePath: string) => boolean {
  return (filePath: string) => {
    const base = baseline.get(filePath);
    if (!base) return false;
    const abs = path.join(projectPath, filePath);
    // Stat first (cheap). Missing file → existence drift, handled elsewhere; not
    // "content-stale" here (mirrors the prior hashFileAt-null behaviour).
    let currentSize: number;
    let currentMtime: number;
    try {
      const st = statSync(abs);
      currentSize = st.size;
      currentMtime = Math.floor(st.mtimeMs);
    } catch {
      return false;
    }
    if (base.mtimeMs != null && base.size != null && currentSize === base.size && currentMtime === base.mtimeMs) {
      return false; // stat signature matches ⇒ unchanged, skip the hash
    }
    const h = hashFileAt(abs);
    return h != null && h.sha256 !== base.sha256;
  };
}
