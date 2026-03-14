/**
 * Migration 146: Template Status Tracking
 * Adds status and parse_error columns to discovered_templates table
 * for tracking stale/error states instead of destructive deletion.
 */

import { addColumnsIfNotExist, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate146TemplateStatus(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('templateStatus146', () => {
    addColumnsIfNotExist(db, 'discovered_templates', [
      { name: 'status', definition: "TEXT NOT NULL DEFAULT 'active'" },
      { name: 'parse_error', definition: 'TEXT DEFAULT NULL' },
    ], logger);

    logger?.info?.('Template status and parse_error columns added');
  }, logger);
}
