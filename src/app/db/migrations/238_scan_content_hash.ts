/**
 * Migration 238: per-scan content hash + context link for scan freshness
 *
 * Adds two nullable columns to `scans`:
 *   - `content_hash` — the hash of the exact code the scan analyzed, so a later
 *     scan can prove whether the context's content has moved since. This is what
 *     makes "scan only what drifted" auditable rather than a silent skip.
 *   - `context_id` — which context a scan targeted. The scans table previously
 *     recorded only project_id + scan_type, so there was no way to look up "the
 *     last scan of this type for THIS context" without joining through ideas
 *     (which fails for a scan that produced zero ideas).
 *
 * Both are additive + nullable, so existing rows are untouched and pre-feature
 * scans simply have a NULL hash (treated as "no prior hash" → always scans).
 */

import type { MigrationLogger } from './migration.utils';

export function migrate238ScanContentHash(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec('ALTER TABLE scans ADD COLUMN content_hash TEXT');
    logger.info('[Migration 238] Added content_hash to scans');
  } catch {
    // Column already exists (re-run) or table absent — safe no-op.
    logger.info('[Migration 238] content_hash column already present or table missing');
  }

  try {
    db.exec('ALTER TABLE scans ADD COLUMN context_id TEXT');
    logger.info('[Migration 238] Added context_id to scans');
  } catch {
    logger.info('[Migration 238] context_id column already present or table missing');
  }

  try {
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_scans_freshness ON scans(project_id, scan_type, context_id)'
    ).run();
  } catch {
    // Index might already exist
  }

  logger.info('[Migration 238] scan content-hash migration complete');
}
