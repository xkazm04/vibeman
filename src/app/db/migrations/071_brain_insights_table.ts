/**
 * Migration 071: Brain Insights Table
 * Extracts insights from JSON blobs in brain_reflections.insights_generated
 * into a proper relational table with indexes for fast querying.
 */

import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate071BrainInsightsTable(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('brainInsightsTable', () => {
    const created = createTableIfNotExists(db, 'brain_insights', `
      CREATE TABLE IF NOT EXISTS brain_insights (
        id TEXT PRIMARY KEY,
        reflection_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('preference_learned', 'pattern_detected', 'warning', 'recommendation')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 50,
        evidence TEXT NOT NULL DEFAULT '[]',
        evolves_from_id TEXT,
        evolves_title TEXT,
        conflict_with_id TEXT,
        conflict_with_title TEXT,
        conflict_type TEXT CHECK(conflict_type IN ('semantic', 'keyword', 'direct') OR conflict_type IS NULL),
        conflict_resolved INTEGER NOT NULL DEFAULT 0,
        conflict_resolution TEXT CHECK(conflict_resolution IN ('keep_both', 'keep_this', 'keep_other', 'merge') OR conflict_resolution IS NULL),
        auto_pruned INTEGER NOT NULL DEFAULT 0,
        auto_prune_reason TEXT,
        original_confidence INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (reflection_id) REFERENCES brain_reflections(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_bi_reflection ON brain_insights(reflection_id);
      CREATE INDEX idx_bi_project ON brain_insights(project_id);
      CREATE INDEX idx_bi_type ON brain_insights(type);
      CREATE INDEX idx_bi_project_created ON brain_insights(project_id, created_at DESC);
      CREATE INDEX idx_bi_conflict ON brain_insights(conflict_with_id) WHERE conflict_with_id IS NOT NULL;
      CREATE INDEX idx_bi_evolves ON brain_insights(evolves_from_id) WHERE evolves_from_id IS NOT NULL;
    `);

    if (created) {
      logger?.info?.('Created brain_insights table with indexes');

      // Migrate existing data from brain_reflections.insights_generated
      migrateExistingInsights(db, logger);
    }
  }, logger);
}

/**
 * Migrate existing insights from JSON blobs to the new table.
 * This is idempotent — skips reflections that already have migrated insights.
 */
function migrateExistingInsights(db: DbConnection, logger?: MigrationLogger): void {
  try {
    const rows = db.prepare(`
      SELECT id, project_id, insights_generated, completed_at
      FROM brain_reflections
      WHERE status = 'completed' AND insights_generated IS NOT NULL
      ORDER BY completed_at ASC
    `).all() as Array<{
      id: string;
      project_id: string;
      insights_generated: string;
      completed_at: string;
    }>;

    let totalMigrated = 0;

    for (const row of rows) {
      try {
        const insights = JSON.parse(row.insights_generated);
        if (!Array.isArray(insights) || insights.length === 0) continue;

        // Check if already migrated
        const existing = db.prepare(
          'SELECT COUNT(*) as count FROM brain_insights WHERE reflection_id = ?'
        ).get(row.id) as { count: number };
        if (existing.count > 0) continue;

        const now = row.completed_at || new Date().toISOString();
        const insertStmt = db.prepare(`
          INSERT INTO brain_insights (
            id, reflection_id, project_id, type, title, description,
            confidence, evidence, evolves_from_id, evolves_title,
            conflict_with_id, conflict_with_title, conflict_type,
            conflict_resolved, conflict_resolution,
            auto_pruned, auto_prune_reason, original_confidence,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const insight of insights) {
          const id = `bi_${row.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          insertStmt.run(
            id,
            row.id,
            row.project_id,
            insight.type || 'recommendation',
            insight.title || 'Untitled',
            insight.description || '',
            insight.confidence ?? 50,
            JSON.stringify(insight.evidence || []),
            null, // evolves_from_id — can't resolve IDs from title-based evolves
            insight.evolves || null,
            null, // conflict_with_id — can't resolve from title
            insight.conflict_with || null,
            insight.conflict_type || null,
            insight.conflict_resolved ? 1 : 0,
            insight.conflict_resolution || null,
            insight.auto_pruned ? 1 : 0,
            insight.auto_prune_reason || null,
            insight.original_confidence ?? null,
            now,
            now
          );
          totalMigrated++;
        }
      } catch {
        // Skip corrupted rows
      }
    }

    if (totalMigrated > 0) {
      logger?.info?.(`Migrated ${totalMigrated} insights from JSON blobs to brain_insights table`);
    }
  } catch (err) {
    logger?.error?.(`Failed to migrate existing insights: ${err}`);
  }
}
