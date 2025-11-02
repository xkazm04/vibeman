import { getDatabase } from '../connection';
import { DbTestSelector } from '../models/types';

/**
 * Test Selector Repository
 * Handles all database operations for test selectors
 */
export const testSelectorRepository = {
  /**
   * Get all test selectors for a context
   */
  getSelectorsByContext: (contextId: string): DbTestSelector[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_selectors
      WHERE context_id = ?
      ORDER BY filepath ASC, title ASC
    `);
    return stmt.all(contextId) as DbTestSelector[];
  },

  /**
   * Get a single test selector by ID
   */
  getSelectorById: (id: string): DbTestSelector | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_selectors
      WHERE id = ?
    `);
    const selector = stmt.get(id) as DbTestSelector | undefined;
    return selector || null;
  },

  /**
   * Create a new test selector
   */
  createSelector: (selector: {
    id: string;
    context_id: string;
    data_testid: string;
    title: string;
    filepath: string;
  }): DbTestSelector => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_selectors (id, context_id, data_testid, title, filepath, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      selector.id,
      selector.context_id,
      selector.data_testid,
      selector.title,
      selector.filepath,
      now,
      now
    );

    // Return the created selector
    const selectStmt = db.prepare('SELECT * FROM test_selectors WHERE id = ?');
    return selectStmt.get(selector.id) as DbTestSelector;
  },

  /**
   * Update a test selector
   */
  updateSelector: (id: string, updates: {
    data_testid?: string;
    title?: string;
    filepath?: string;
  }): DbTestSelector | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.data_testid !== undefined) {
      updateFields.push('data_testid = ?');
      values.push(updates.data_testid);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.filepath !== undefined) {
      updateFields.push('filepath = ?');
      values.push(updates.filepath);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM test_selectors WHERE id = ?');
      return selectStmt.get(id) as DbTestSelector | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE test_selectors
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Selector not found
    }

    // Return the updated selector
    const selectStmt = db.prepare('SELECT * FROM test_selectors WHERE id = ?');
    return selectStmt.get(id) as DbTestSelector;
  },

  /**
   * Delete a test selector
   */
  deleteSelector: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_selectors WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all selectors for a context
   */
  deleteSelectorsByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_selectors WHERE context_id = ?');
    const result = stmt.run(contextId);
    return result.changes;
  },

  /**
   * Get count of selectors for a context
   */
  getSelectorCountByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM test_selectors
      WHERE context_id = ?
    `);
    const result = stmt.get(contextId) as { count: number };
    return result.count;
  }
};
