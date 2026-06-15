/**
 * Migration 232: Drop orphaned schema left by the headless slim-down
 *
 * These tables are created by older migrations but have ZERO live readers or
 * writers anywhere in the codebase (verified by grep across src/**, excluding
 * the migration files themselves and the table-name allow-list):
 *
 * - annette_rapport      — the entire Annette/Commander subsystem was deleted in
 *                          the 2026-06-13 headless slim-down; this is its sole
 *                          surviving table.
 * - security_scans       — remnants of the deleted Dependencies & Security module
 * - security_patches       (the repository + every route that read/wrote them were
 * - security_prs           removed; see docs/harness scan, dependencies-security #2).
 *
 * Scope is deliberately conservative: security_alerts / security_intelligence
 * (from migration 032) are NOT dropped here — they were not part of the deleted
 * module and warrant separate verification before an irreversible drop.
 *
 * DROP TABLE IF EXISTS is a no-op on DBs where these were never created, so the
 * migration is safe to run anywhere. Children are dropped before parents.
 */

import { safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

const ORPHANED_TABLES = [
  // security_* — drop FK children before the parent scan table
  'security_prs',
  'security_patches',
  'security_scans',
  // annette_* — deleted subsystem
  'annette_rapport',
];

export function migrate232DropOrphanedSchema(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('dropOrphanedSchema', () => {
    for (const table of ORPHANED_TABLES) {
      db.exec(`DROP TABLE IF EXISTS ${table};`);
    }
    logger?.info?.(`Dropped ${ORPHANED_TABLES.length} orphaned table(s): ${ORPHANED_TABLES.join(', ')}`);
  }, logger);
}
