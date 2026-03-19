/**
 * Migration 217: Add layer column to knowledge_entries
 * Introduces the Language > Layer > Category hierarchy
 */

import { addColumnIfNotExists, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

/** Map existing domain values to their layer */
const DOMAIN_TO_LAYER: Record<string, string> = {
  ui: 'frontend',
  state_management: 'frontend',
  api: 'backend',
  database: 'data',
  testing: 'cross_cutting',
  performance: 'cross_cutting',
  architecture: 'cross_cutting',
  security: 'cross_cutting',
};

export function migrate217KnowledgeLayer(db: DbConnection, log: MigrationLogger) {
  log.info('m217: Adding layer column to knowledge_entries');

  addColumnIfNotExists(db, 'knowledge_entries', 'layer', "TEXT NOT NULL DEFAULT 'cross_cutting'", log);

  // Backfill layer based on existing domain values
  for (const [domain, layer] of Object.entries(DOMAIN_TO_LAYER)) {
    const result = db.prepare(
      `UPDATE knowledge_entries SET layer = ? WHERE domain = ? AND layer = 'cross_cutting'`
    ).run(layer, domain);
    if (result.changes > 0) {
      log.info(`  Backfilled ${result.changes} entries: domain=${domain} → layer=${layer}`);
    }
  }

  log.success('m217: Knowledge layer column added and backfilled');
}
