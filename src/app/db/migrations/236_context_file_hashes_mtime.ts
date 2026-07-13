/**
 * Migration 236: mtime baseline for the context file-hash cache
 *
 * Adds `mtime_ms` alongside the existing `sha256` + `size` in
 * context_file_hashes. The stale resolver uses (size, mtime_ms) as a cheap
 * short-circuit: when a file's current size and mtime both match the baseline,
 * its content is unchanged and the expensive sha256 re-hash is skipped. Rows
 * captured before this migration have a NULL mtime_ms and fall back to hashing
 * (identical verdict, just no speed-up), so the column is safe to add nullable.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate236ContextFileHashesMtime(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec('ALTER TABLE context_file_hashes ADD COLUMN mtime_ms INTEGER');
    logger.info('[Migration 236] Added mtime_ms to context_file_hashes');
  } catch {
    // Column already exists (re-run) or table absent — both are safe no-ops.
    logger.info('[Migration 236] mtime_ms column already present or table missing');
  }

  logger.info('[Migration 236] context file-hash mtime migration complete');
}
