/**
 * Migration 114: Question Tree Structure
 *
 * Adds columns to support recursive strategic question trees:
 * - parent_id: links child questions to their parent (NULL = root question)
 * - tree_depth: 0 = root, 1 = first follow-up, etc.
 * - strategic_brief: auto-generated synthesis when tree reaches 3+ levels
 */

import { addColumnIfNotExists } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate114QuestionTree(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    addColumnIfNotExists(db as any, 'questions', 'parent_id', 'TEXT REFERENCES questions(id) ON DELETE SET NULL');
    addColumnIfNotExists(db as any, 'questions', 'tree_depth', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfNotExists(db as any, 'questions', 'strategic_brief', 'TEXT');

    // Index for efficient tree queries
    try {
      (db as any).prepare('CREATE INDEX IF NOT EXISTS idx_questions_parent_id ON questions(parent_id)').run();
    } catch {
      // Index may already exist
    }

    try {
      (db as any).prepare('CREATE INDEX IF NOT EXISTS idx_questions_tree_depth ON questions(tree_depth)').run();
    } catch {
      // Index may already exist
    }

    logger.info('[Migration 114] Added question tree columns (parent_id, tree_depth, strategic_brief)');
  } catch (e: any) {
    logger.info('[Migration 114] Question tree columns: ' + e.message);
  }
}
