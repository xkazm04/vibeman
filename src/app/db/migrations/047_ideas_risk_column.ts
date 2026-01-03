/**
 * Migration 047: Add risk column to ideas table
 *
 * The schema includes effort, impact, and risk columns for ideas,
 * but databases created before this migration may be missing the risk column.
 */

import { addColumnIfNotExists } from './migration.utils';
import type { DbConnection } from '../drivers/types';

export function migrate047(db: DbConnection): void {
  console.log('[Migration 047] Checking for ideas.risk column...');

  // Add risk column if missing (uses internal hasColumn check)
  addColumnIfNotExists(
    db,
    'ideas',
    'risk',
    'INTEGER'
  );

  // Also ensure effort and impact columns exist (for completeness)
  addColumnIfNotExists(
    db,
    'ideas',
    'effort',
    'INTEGER'
  );

  addColumnIfNotExists(
    db,
    'ideas',
    'impact',
    'INTEGER'
  );

  console.log('[Migration 047] Complete');
}
