/**
 * Migration 119: Predictive Intent Engine
 *
 * Creates tables for storing context transition models and predictions.
 * - context_transitions: raw transition pairs (from → to) with timestamps
 * - intent_predictions: cached prediction results with confidence scores
 */

import type { MigrationLogger } from './migration.utils';

export function migrate119PredictiveIntent(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  // Table: context_transitions — stores observed from→to context switches
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS context_transitions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        from_context_id TEXT NOT NULL,
        from_context_name TEXT NOT NULL,
        to_context_id TEXT NOT NULL,
        to_context_name TEXT NOT NULL,
        transition_time_ms INTEGER NOT NULL,
        signal_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 119] Created context_transitions table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      throw e;
    }
    logger.info('[Migration 119] context_transitions table already exists');
  }

  // Indexes for efficient querying
  try {
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_ctx_transitions_project
        ON context_transitions(project_id, timestamp DESC)
    `).run();
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_ctx_transitions_from
        ON context_transitions(project_id, from_context_id)
    `).run();
    logger.info('[Migration 119] Created context_transitions indexes');
  } catch (e: any) {
    logger.info('[Migration 119] Indexes already exist or not supported');
  }

  // Table: intent_predictions — cached prediction snapshots
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS intent_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        predicted_context_id TEXT NOT NULL,
        predicted_context_name TEXT NOT NULL,
        confidence REAL NOT NULL,
        from_context_id TEXT,
        from_context_name TEXT,
        reasoning TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'dismissed', 'expired')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      )
    `).run();
    logger.info('[Migration 119] Created intent_predictions table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      throw e;
    }
    logger.info('[Migration 119] intent_predictions table already exists');
  }

  try {
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_intent_predictions_project
        ON intent_predictions(project_id, status, created_at DESC)
    `).run();
    logger.info('[Migration 119] Created intent_predictions indexes');
  } catch (e: any) {
    logger.info('[Migration 119] Prediction indexes already exist');
  }
}
