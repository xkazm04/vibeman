import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate215KnowledgeBase(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('knowledgeBase', () => {
    const created = createTableIfNotExists(db, 'knowledge_entries', `
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL,
        pattern_type TEXT NOT NULL CHECK(pattern_type IN ('best_practice','anti_pattern','convention','gotcha','optimization')),
        title TEXT NOT NULL,
        pattern TEXT NOT NULL,
        rationale TEXT,
        code_example TEXT,
        anti_pattern TEXT,
        applies_to TEXT NOT NULL DEFAULT '[]',
        file_patterns TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
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
      );

      CREATE INDEX idx_ke_domain ON knowledge_entries(domain);
      CREATE INDEX idx_ke_domain_confidence ON knowledge_entries(domain, confidence DESC);
      CREATE INDEX idx_ke_status ON knowledge_entries(status) WHERE status = 'active';
      CREATE INDEX idx_ke_canonical ON knowledge_entries(canonical_id);
      CREATE INDEX idx_ke_source_project ON knowledge_entries(source_project_id);
    `, logger);

    if (created) {
      logger?.info('Created knowledge_entries table with indexes');
    } else {
      logger?.info('knowledge_entries table already exists');
    }
  }, logger);
}
