/**
 * Migration 233: Canonical pin flag on contexts
 *
 * A pinned context is human-curated and must survive a wholesale rebuild
 * (`deleteAllContextsByProject`) instead of being deleted and regenerated.
 * Adopts ktx's "canonical pins" idea (shared with Personas) to fix the risk
 * that a full context-map reset silently destroys hand-curation.
 * Boolean stored as INTEGER; existing rows default to unpinned.
 */

import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate233ContextPinned(db: DbConnection, logger: MigrationLogger) {
  addColumnIfNotExists(db, 'contexts', 'pinned', 'INTEGER NOT NULL DEFAULT 0', logger);
  logger.info('[Migration 233] contexts.pinned column ensured');
}
