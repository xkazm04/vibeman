/**
 * Migration 116: Annette Rapport Model
 * Developer relationship tracking with personality adaptation axes
 */

import { MigrationLogger } from './migration.utils';

export function migrate116AnnetteRapport(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  logger.info('Running migration 116: Annette Rapport Model');

  db.exec(`
    CREATE TABLE IF NOT EXISTS annette_rapport (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tone_formal_casual REAL NOT NULL DEFAULT 0.5,
      depth_expert_teaching REAL NOT NULL DEFAULT 0.5,
      initiative_reactive_proactive REAL NOT NULL DEFAULT 0.5,
      humor_level REAL NOT NULL DEFAULT 0.2,
      detected_mood TEXT NOT NULL DEFAULT 'neutral',
      frustration_score REAL NOT NULL DEFAULT 0.0,
      total_turns_analyzed INTEGER NOT NULL DEFAULT 0,
      expertise_areas TEXT NOT NULL DEFAULT '[]',
      work_rhythm TEXT NOT NULL DEFAULT '{}',
      emotional_history TEXT NOT NULL DEFAULT '[]',
      communication_signals TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id)
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_annette_rapport_project ON annette_rapport(project_id)`);

  logger.success('Migration 116 complete: Annette Rapport Model');
}
