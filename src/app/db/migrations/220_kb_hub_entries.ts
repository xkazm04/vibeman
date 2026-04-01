/**
 * Migration 220: KB Hub Entries (Maps of Content)
 *
 * 1. Creates kb_entry_links table for hub-to-entry relationships with ordering
 * 2. Updates knowledge_entries pattern_type CHECK to include 'hub'
 */

import { createTableIfNotExists, safeMigration, tableExists, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate220KbHubEntries(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('kbHubEntries', () => {
    // 1. Create kb_entry_links table
    const created = createTableIfNotExists(db, 'kb_entry_links', `
      CREATE TABLE IF NOT EXISTS kb_entry_links (
        id TEXT PRIMARY KEY,
        hub_entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
        linked_entry_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(hub_entry_id, linked_entry_id)
      );

      CREATE INDEX idx_kbel_hub ON kb_entry_links(hub_entry_id, sort_order);
      CREATE INDEX idx_kbel_linked ON kb_entry_links(linked_entry_id);
    `, logger);

    if (created) {
      logger?.info('Created kb_entry_links table');
    }

    // 2. Update pattern_type CHECK constraint to include 'hub'
    if (!tableExists(db, 'knowledge_entries')) {
      logger?.info('knowledge_entries table does not exist, skipping constraint update');
      return;
    }

    // Probe: try inserting with pattern_type='hub' to see if constraint allows it
    let needsConstraintUpdate = false;
    try {
      db.exec('PRAGMA foreign_keys = OFF');
      const probeStmt = db.prepare(`
        INSERT INTO knowledge_entries (id, domain, layer, pattern_type, title, pattern, applies_to, tags, source_type, status, created_at, updated_at)
        VALUES ('__probe_220__', 'architecture', 'cross_cutting', 'hub', '__probe__', '__probe__', '[]', '[]', 'manual', 'active', datetime('now'), datetime('now'))
      `);
      probeStmt.run();
      db.prepare(`DELETE FROM knowledge_entries WHERE id = '__probe_220__'`).run();
      db.exec('PRAGMA foreign_keys = ON');
      logger?.info('knowledge_entries already supports hub pattern_type');
      return;
    } catch (e: unknown) {
      db.exec('PRAGMA foreign_keys = ON');
      const error = e as Error;
      if (error.message?.includes('CHECK constraint')) {
        needsConstraintUpdate = true;
      } else {
        logger?.error?.('Unexpected error probing pattern_type constraint', e);
        return;
      }
    }

    if (!needsConstraintUpdate) return;

    logger?.info('Updating knowledge_entries CHECK constraint to include hub pattern_type...');

    db.exec('PRAGMA foreign_keys = OFF');

    try {
      db.exec('BEGIN TRANSACTION');

      db.exec(`ALTER TABLE knowledge_entries RENAME TO knowledge_entries_old_220`);

      db.exec(`
        CREATE TABLE knowledge_entries (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          layer TEXT NOT NULL DEFAULT 'cross_cutting',
          pattern_type TEXT NOT NULL CHECK(pattern_type IN ('best_practice','anti_pattern','convention','gotcha','optimization','hub')),
          title TEXT NOT NULL,
          pattern TEXT NOT NULL,
          rationale TEXT,
          code_example TEXT,
          anti_pattern TEXT,
          applies_to TEXT NOT NULL DEFAULT '[]',
          file_patterns TEXT,
          tags TEXT NOT NULL DEFAULT '[]',
          language TEXT NOT NULL DEFAULT 'universal',
          confidence INTEGER NOT NULL DEFAULT 50,
          source_project_id TEXT,
          source_type TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('scan','insight_graduation','cli_session','cross_project','manual')),
          source_insight_id TEXT,
          times_applied INTEGER NOT NULL DEFAULT 0,
          times_helpful INTEGER NOT NULL DEFAULT 0,
          last_applied_at TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','archived')),
          canonical_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      db.exec(`
        INSERT INTO knowledge_entries (
          id, domain, layer, pattern_type, title, pattern, rationale, code_example, anti_pattern,
          applies_to, file_patterns, tags, language, confidence,
          source_project_id, source_type, source_insight_id,
          times_applied, times_helpful, last_applied_at,
          status, canonical_id, created_at, updated_at
        )
        SELECT
          id, domain, layer, pattern_type, title, pattern, rationale, code_example, anti_pattern,
          applies_to, file_patterns, tags, language, confidence,
          source_project_id, source_type, source_insight_id,
          times_applied, times_helpful, last_applied_at,
          status, canonical_id, created_at, updated_at
        FROM knowledge_entries_old_220
      `);

      db.exec(`DROP TABLE knowledge_entries_old_220`);

      // Recreate indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ke_domain ON knowledge_entries(domain);
        CREATE INDEX IF NOT EXISTS idx_ke_domain_confidence ON knowledge_entries(domain, confidence DESC);
        CREATE INDEX IF NOT EXISTS idx_ke_status ON knowledge_entries(status) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_ke_canonical ON knowledge_entries(canonical_id);
        CREATE INDEX IF NOT EXISTS idx_ke_source_project ON knowledge_entries(source_project_id);
        CREATE INDEX IF NOT EXISTS idx_ke_pattern_type ON knowledge_entries(pattern_type) WHERE pattern_type = 'hub';
      `);

      db.exec('COMMIT');

      logger?.success?.('knowledge_entries CHECK constraint updated to include hub');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      logger?.error?.('Failed to update knowledge_entries constraint', error);
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }, logger);
}
