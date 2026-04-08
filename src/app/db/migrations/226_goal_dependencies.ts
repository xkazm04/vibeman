/**
 * Migration 226: Goal Dependencies
 *
 * Adds goal_dependencies table to track blocks/blocked-by relationships
 * between goals. Enables DAG-based dependency graph and blocking propagation
 * in the lifecycle engine and predictive standup.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate226GoalDependencies(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  // 1. Create goal_dependencies table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_dependencies (
        id TEXT PRIMARY KEY,
        parent_goal_id TEXT NOT NULL,
        child_goal_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL DEFAULT 'blocks' CHECK (relationship_type IN ('blocks', 'depends_on', 'related')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (child_goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        UNIQUE(parent_goal_id, child_goal_id, relationship_type)
      )
    `);
    logger.info('[Migration 226] Created goal_dependencies table');
  } catch (e: any) {
    logger.info('[Migration 226] goal_dependencies table may already exist');
  }

  // 2. Indexes for efficient traversal
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_goal_deps_parent ON goal_dependencies(parent_goal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_deps_child ON goal_dependencies(child_goal_id)`,
    `CREATE INDEX IF NOT EXISTS idx_goal_deps_type ON goal_dependencies(relationship_type)`,
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch {
      // Index might already exist
    }
  }

  logger.info('[Migration 226] Goal dependencies migration complete');
}
