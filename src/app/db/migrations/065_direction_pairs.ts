/**
 * Migration 065: Direction Pairs
 * Adds support for paired directions - two alternative solutions for the same problem
 * Users can compare and pick the best variant, or decline/delete both
 */

import { getConnection } from '../drivers';
import { tableExists, addColumnIfNotExists } from './migration.utils';

export function migrate065DirectionPairs(): void {
  const db = getConnection();

  if (!tableExists(db, 'directions')) {
    console.log('[Migration 065] Directions table does not exist, skipping');
    return;
  }

  // Add pair_id column - shared ID between two paired directions
  addColumnIfNotExists(db, 'directions', 'pair_id', 'TEXT');

  // Add pair_label column - 'A' or 'B' to distinguish paired directions
  addColumnIfNotExists(db, 'directions', 'pair_label', 'TEXT');

  // Add problem_statement column - the problem that both directions solve
  addColumnIfNotExists(db, 'directions', 'problem_statement', 'TEXT');

  // Create index for efficient pair lookup
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_directions_pair ON directions(pair_id)`);
  } catch (e) {
    // Index might already exist
  }
}
