/**
 * Migration 229: CLI Transcript Mirror
 *
 * Stores entries mirrored from the Claude Agent SDK's `sessionStore` adapter.
 * One row per JSONL transcript entry observed during an SDK query.
 *
 * The SDK already writes locally — this table is a durable copy so resuming
 * a session, searching transcripts, or restoring after a crash doesn't
 * depend on disk artifacts under CLAUDE_CONFIG_DIR.
 *
 * Idempotency: `uuid` is the SDK's stable per-entry key. UNIQUE on
 * (project_key, session_id, subpath, uuid) lets `append()` retries and
 * `importSessionToStore()` replays insert with ON CONFLICT IGNORE.
 * Entries without a uuid (titles, tags) are stored with NULL — duplicates
 * are allowed and ordered by `appended_at` per SDK contract.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate229CliTranscriptMirror(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cli_transcript_mirror (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_key TEXT NOT NULL,
        session_id TEXT NOT NULL,
        subpath TEXT NOT NULL DEFAULT '',
        uuid TEXT,
        entry_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        appended_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (project_key, session_id, subpath, uuid)
      )
    `);
    logger.info('[Migration 229] Created cli_transcript_mirror table');
  } catch {
    logger.info('[Migration 229] cli_transcript_mirror table may already exist');
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_cli_mirror_session ON cli_transcript_mirror(session_id, subpath, appended_at)',
    'CREATE INDEX IF NOT EXISTS idx_cli_mirror_project ON cli_transcript_mirror(project_key, session_id)',
    'CREATE INDEX IF NOT EXISTS idx_cli_mirror_type ON cli_transcript_mirror(entry_type)',
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch {
      // Index might already exist
    }
  }

  logger.info('[Migration 229] CLI transcript mirror migration complete');
}
