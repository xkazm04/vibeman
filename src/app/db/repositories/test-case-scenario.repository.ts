import { getDatabase } from '../connection';
import { DbTestCaseScenario } from '../models/types';

/**
 * Test Case Scenario Repository
 * Handles all database operations for manual test case scenarios
 */
export const testCaseScenarioRepository = {
  /**
   * Get all test case scenarios for a context
   */
  getScenariosByContext: (contextId: string): DbTestCaseScenario[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_case_scenarios
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(contextId) as DbTestCaseScenario[];
  },

  /**
   * Get a single test case scenario by ID
   */
  getScenarioById: (id: string): DbTestCaseScenario | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_case_scenarios
      WHERE id = ?
    `);
    const scenario = stmt.get(id) as DbTestCaseScenario | undefined;
    return scenario || null;
  },

  /**
   * Create a new test case scenario
   */
  createScenario: (scenario: {
    id: string;
    context_id: string;
    name: string;
    description?: string | null;
  }): DbTestCaseScenario => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_case_scenarios (id, context_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scenario.id,
      scenario.context_id,
      scenario.name,
      scenario.description || null,
      now,
      now
    );

    // Return the created scenario
    const selectStmt = db.prepare('SELECT * FROM test_case_scenarios WHERE id = ?');
    return selectStmt.get(scenario.id) as DbTestCaseScenario;
  },

  /**
   * Update a test case scenario
   */
  updateScenario: (id: string, updates: {
    name?: string;
    description?: string | null;
  }): DbTestCaseScenario | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: Array<string | null> = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM test_case_scenarios WHERE id = ?');
      return selectStmt.get(id) as DbTestCaseScenario | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE test_case_scenarios
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Scenario not found
    }

    // Return the updated scenario
    const selectStmt = db.prepare('SELECT * FROM test_case_scenarios WHERE id = ?');
    return selectStmt.get(id) as DbTestCaseScenario;
  },

  /**
   * Delete a test case scenario (cascades to steps)
   */
  deleteScenario: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_case_scenarios WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all scenarios for a context
   */
  deleteScenariosByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_case_scenarios WHERE context_id = ?');
    const result = stmt.run(contextId);
    return result.changes;
  },

  /**
   * Get count of scenarios for a context
   */
  getScenarioCountByContext: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM test_case_scenarios
      WHERE context_id = ?
    `);
    const result = stmt.get(contextId) as { count: number };
    return result.count;
  }
};
