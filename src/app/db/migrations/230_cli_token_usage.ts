/**
 * Migration 230: CLI Token Usage (measurement baseline)
 *
 * One row per CLI execution, written by the Rust stdout reader
 * (`persist_token_usage_blocking` in src-tauri/src/commands/claude_cmds.rs).
 * The Rust side is the only place that sees the CLI's stream-json, so it is
 * where each invocation's real token cost is tallied.
 *
 * This table is the prerequisite for proving any token optimization: it records
 * authoritative `usage` totals (input/output + prompt-cache read/creation tokens)
 * plus the tool-result volume that compression ultimately targets.
 *
 * Per-project isolation: this table lives in each project's own goals.db, so
 * rows are physically partitioned per project — Rust opens
 * `<project_path>/database/goals.db` to write, never a shared store.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate230CliTokenUsage(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cli_token_usage (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        project_id TEXT,
        session_id TEXT,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
        tool_use_count INTEGER NOT NULL DEFAULT 0,
        tool_result_count INTEGER NOT NULL DEFAULT 0,
        tool_result_bytes INTEGER NOT NULL DEFAULT 0,
        assistant_messages INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL,
        num_turns INTEGER,
        estimated INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    logger.info('[Migration 230] Created cli_token_usage table');
  } catch {
    logger.info('[Migration 230] cli_token_usage table may already exist');
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_cli_token_usage_exec ON cli_token_usage(execution_id)',
    'CREATE INDEX IF NOT EXISTS idx_cli_token_usage_project ON cli_token_usage(project_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cli_token_usage_session ON cli_token_usage(session_id)',
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch {
      // Index might already exist
    }
  }

  logger.info('[Migration 230] CLI token usage migration complete');
}
