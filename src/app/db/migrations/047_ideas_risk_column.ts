/**
 * Migration 047: Add risk column to ideas table
 *
 * The schema includes effort, impact, and risk columns for ideas,
 * but databases created before this migration may be missing the risk column.
 */

import { addColumnIfNotExists } from './migration.utils';
import type { DbConnection } from '../drivers/types';

export function migrate047(db: DbConnection): void {
  let columnsAdded = 0;

  // Add risk column if missing (uses internal hasColumn check)
  if (addColumnIfNotExists(db, 'ideas', 'risk', 'INTEGER')) {
    console.log('[Migration 047] Added risk column to ideas table');
    columnsAdded++;
  }

  // Also ensure effort and impact columns exist (for completeness)
  if (addColumnIfNotExists(db, 'ideas', 'effort', 'INTEGER')) {
    console.log('[Migration 047] Added effort column to ideas table');
    columnsAdded++;
  }

  if (addColumnIfNotExists(db, 'ideas', 'impact', 'INTEGER')) {
    console.log('[Migration 047] Added impact column to ideas table');
    columnsAdded++;
  }

  if (columnsAdded > 0) {
    console.log('[Migration 047] Complete');
  }
}
