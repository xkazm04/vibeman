/**
 * Migration 098: Persona design patterns + review enhancements
 *
 * 1. Creates persona_design_patterns table (learned connector-agnostic patterns)
 * 2. Adds self-improvement columns to persona_design_reviews
 * 3. Clears existing review data for fresh baseline testing
 */

import type { MigrationLogger } from './migration.utils';

export function migrate098PersonaDesignPatterns(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  // 1. Create persona_design_patterns table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS persona_design_patterns (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,
      pattern_text TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 0,
      source_review_ids TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_validated_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_design_patterns_active ON persona_design_patterns(is_active)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_design_patterns_type ON persona_design_patterns(pattern_type)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_design_patterns_condition ON persona_design_patterns(trigger_condition)`).run();

  logger.info('[098] Created persona_design_patterns table');

  // 2. Add columns to persona_design_reviews
  const addColumn = (col: string, type: string, defaultVal?: string) => {
    try {
      const def = defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : '';
      db.prepare(`ALTER TABLE persona_design_reviews ADD COLUMN ${col} ${type}${def}`).run();
      logger.info(`[098] Added column ${col} to persona_design_reviews`);
    } catch {
      // Column already exists
    }
  };

  addColumn('had_references', 'INTEGER', '0');
  addColumn('suggested_adjustment', 'TEXT', 'NULL');
  addColumn('adjustment_generation', 'INTEGER', '0');

  logger.info('[098] Design patterns migration complete');
}
