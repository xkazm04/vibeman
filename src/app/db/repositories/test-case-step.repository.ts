import { getDatabase } from '../connection';
import { DbTestCaseStep } from '../models/types';

/**
 * Test Case Step Repository
 * Handles all database operations for test case steps
 */
export const testCaseStepRepository = {
  /**
   * Get all test case steps for a scenario (ordered by step_order)
   */
  getStepsByScenario: (scenarioId: string): DbTestCaseStep[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_case_steps
      WHERE scenario_id = ?
      ORDER BY step_order ASC
    `);
    return stmt.all(scenarioId) as DbTestCaseStep[];
  },

  /**
   * Get a single test case step by ID
   */
  getStepById: (id: string): DbTestCaseStep | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM test_case_steps
      WHERE id = ?
    `);
    const step = stmt.get(id) as DbTestCaseStep | undefined;
    return step || null;
  },

  /**
   * Create a new test case step
   */
  createStep: (step: {
    id: string;
    scenario_id: string;
    step_order: number;
    step_name: string;
    expected_result: string;
    test_selector_id?: string | null;
  }): DbTestCaseStep => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_case_steps (id, scenario_id, step_order, step_name, expected_result, test_selector_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      step.id,
      step.scenario_id,
      step.step_order,
      step.step_name,
      step.expected_result,
      step.test_selector_id || null,
      now,
      now
    );

    // Return the created step
    const selectStmt = db.prepare('SELECT * FROM test_case_steps WHERE id = ?');
    return selectStmt.get(step.id) as DbTestCaseStep;
  },

  /**
   * Update a test case step
   */
  updateStep: (id: string, updates: {
    step_order?: number;
    step_name?: string;
    expected_result?: string;
    test_selector_id?: string | null;
  }): DbTestCaseStep | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: Array<string | number | null> = [];

    if (updates.step_order !== undefined) {
      updateFields.push('step_order = ?');
      values.push(updates.step_order);
    }
    if (updates.step_name !== undefined) {
      updateFields.push('step_name = ?');
      values.push(updates.step_name);
    }
    if (updates.expected_result !== undefined) {
      updateFields.push('expected_result = ?');
      values.push(updates.expected_result);
    }
    if (updates.test_selector_id !== undefined) {
      updateFields.push('test_selector_id = ?');
      values.push(updates.test_selector_id);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM test_case_steps WHERE id = ?');
      return selectStmt.get(id) as DbTestCaseStep | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE test_case_steps
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Step not found
    }

    // Return the updated step
    const selectStmt = db.prepare('SELECT * FROM test_case_steps WHERE id = ?');
    return selectStmt.get(id) as DbTestCaseStep;
  },

  /**
   * Delete a test case step
   */
  deleteStep: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_case_steps WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all steps for a scenario
   */
  deleteStepsByScenario: (scenarioId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_case_steps WHERE scenario_id = ?');
    const result = stmt.run(scenarioId);
    return result.changes;
  },

  /**
   * Reorder steps for a scenario
   * Updates step_order for all steps in a scenario
   */
  reorderSteps: (scenarioId: string, stepOrdering: { id: string; order: number }[]): boolean => {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      // Use a transaction for atomic reordering
      db.exec('BEGIN TRANSACTION');

      const stmt = db.prepare(`
        UPDATE test_case_steps
        SET step_order = ?, updated_at = ?
        WHERE id = ? AND scenario_id = ?
      `);

      for (const { id, order } of stepOrdering) {
        stmt.run(order, now, id, scenarioId);
      }

      db.exec('COMMIT');
      return true;
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('[TestCaseStepRepository] Error reordering steps:', error);
      return false;
    }
  },

  /**
   * Get count of steps for a scenario
   */
  getStepCountByScenario: (scenarioId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM test_case_steps
      WHERE scenario_id = ?
    `);
    const result = stmt.get(scenarioId) as { count: number };
    return result.count;
  },

  /**
   * Get next step order for a scenario
   */
  getNextStepOrder: (scenarioId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(step_order) as max_order
      FROM test_case_steps
      WHERE scenario_id = ?
    `);
    const result = stmt.get(scenarioId) as { max_order: number | null };
    return (result.max_order || 0) + 1;
  }
};
