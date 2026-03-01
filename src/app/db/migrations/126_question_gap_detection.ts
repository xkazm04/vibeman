/**
 * Migration 126: Question Gap Detection
 *
 * Adds columns to support auto-deepening via answer gap detection:
 * - gap_score: 0-1 aggregate ambiguity score from gap analysis
 * - gap_analysis: JSON blob with detected gaps array
 * - auto_deepened: boolean flag indicating question was auto-generated from gap detection
 */

import { addColumnIfNotExists } from './migration.utils';
import type { MigrationLogger } from './migration.utils';

export function migrate126QuestionGapDetection(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    addColumnIfNotExists(db as any, 'questions', 'gap_score', 'REAL');
    addColumnIfNotExists(db as any, 'questions', 'gap_analysis', 'TEXT');
    addColumnIfNotExists(db as any, 'questions', 'auto_deepened', 'INTEGER NOT NULL DEFAULT 0');

    logger.info('[Migration 126] Added question gap detection columns (gap_score, gap_analysis, auto_deepened)');
  } catch (e: any) {
    logger.info('[Migration 126] Question gap detection columns: ' + e.message);
  }
}
