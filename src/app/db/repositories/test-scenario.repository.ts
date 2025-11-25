/**
 * Test Scenario Repository
 * Handles CRUD operations for AI-generated test scenarios
 */

import { getConnection } from '../drivers';
import type {
  DbTestScenario,
  TestScenario,
  CreateTestScenarioInput,
  UpdateTestScenarioInput,
  DbTestExecution,
  TestExecution,
  DbVisualDiff,
  VisualDiff,
  UserFlowStep,
  ComponentNode,
  ScreenshotMetadata
} from '../models/test-scenario.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse JSON fields from database model
 */
function parseTestScenario(db: DbTestScenario): TestScenario {
  return {
    ...db,
    user_flows: db.user_flows ? JSON.parse(db.user_flows) : [],
    component_tree: db.component_tree ? JSON.parse(db.component_tree) : null,
    data_testids: db.data_testids ? JSON.parse(db.data_testids) : []
  };
}

/**
 * Parse test execution from database model
 */
function parseTestExecution(db: DbTestExecution): TestExecution {
  return {
    ...db,
    screenshots: db.screenshots ? JSON.parse(db.screenshots) : [],
    coverage_data: db.coverage_data ? JSON.parse(db.coverage_data) : null
  };
}

/**
 * Parse visual diff from database model
 */
function parseVisualDiff(db: DbVisualDiff): VisualDiff {
  return {
    ...db,
    has_differences: Boolean(db.has_differences),
    reviewed: Boolean(db.reviewed),
    approved: Boolean(db.approved),
    metadata: db.metadata ? JSON.parse(db.metadata) : null
  };
}

// ========== Test Scenarios ==========

export const testScenarioRepository = {
  /**
   * Get all test scenarios for a project
   */
  getAllByProject(projectId: string): TestScenario[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_scenarios
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbTestScenario[];
    return rows.map(parseTestScenario);
  },

  /**
   * Get all test scenarios for a context
   */
  getAllByContext(contextId: string): TestScenario[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_scenarios
      WHERE context_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(contextId) as unknown as DbTestScenario[];
    return rows.map(parseTestScenario);
  },

  /**
   * Get test scenario by ID
   */
  getById(id: string): TestScenario | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM test_scenarios WHERE id = ?');
    const row = stmt.get(id) as DbTestScenario | undefined;
    return row ? parseTestScenario(row) : null;
  },

  /**
   * Create a new test scenario
   */
  create(input: CreateTestScenarioInput): TestScenario {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_scenarios (
        id, project_id, context_id, name, description, user_flows, component_tree,
        data_testids, status, ai_confidence_score, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.context_id || null,
      input.name,
      input.description || null,
      JSON.stringify(input.user_flows),
      input.component_tree ? JSON.stringify(input.component_tree) : null,
      input.data_testids ? JSON.stringify(input.data_testids) : null,
      'pending',
      input.ai_confidence_score || null,
      input.created_by,
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create test scenario');
    }
    return created;
  },

  /**
   * Update a test scenario
   */
  update(id: string, input: UpdateTestScenarioInput): TestScenario | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.user_flows !== undefined) {
      updates.push('user_flows = ?');
      values.push(JSON.stringify(input.user_flows));
    }
    if (input.component_tree !== undefined) {
      updates.push('component_tree = ?');
      values.push(JSON.stringify(input.component_tree));
    }
    if (input.test_skeleton !== undefined) {
      updates.push('test_skeleton = ?');
      values.push(input.test_skeleton);
    }
    if (input.data_testids !== undefined) {
      updates.push('data_testids = ?');
      values.push(JSON.stringify(input.data_testids));
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }
    if (input.ai_confidence_score !== undefined) {
      updates.push('ai_confidence_score = ?');
      values.push(input.ai_confidence_score);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE test_scenarios
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Delete a test scenario
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM test_scenarios WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get scenarios by status
   */
  getByStatus(projectId: string, status: string): TestScenario[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_scenarios
      WHERE project_id = ? AND status = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId, status) as unknown as DbTestScenario[];
    return rows.map(parseTestScenario);
  }
};

// ========== Test Executions ==========

export const testExecutionRepository = {
  /**
   * Get all executions for a scenario
   */
  getAllByScenario(scenarioId: string): TestExecution[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_executions
      WHERE scenario_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(scenarioId) as unknown as DbTestExecution[];
    return rows.map(parseTestExecution);
  },

  /**
   * Get execution by ID
   */
  getById(id: string): TestExecution | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM test_executions WHERE id = ?');
    const row = stmt.get(id) as DbTestExecution | undefined;
    return row ? parseTestExecution(row) : null;
  },

  /**
   * Create a new test execution
   */
  create(scenarioId: string, projectId: string): TestExecution {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_executions (
        id, scenario_id, project_id, status, started_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, scenarioId, projectId, 'queued', now, now);

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create test execution');
    }
    return created;
  },

  /**
   * Update execution
   */
  update(
    id: string,
    data: {
      status?: string;
      execution_time_ms?: number;
      error_message?: string;
      console_output?: string;
      screenshots?: ScreenshotMetadata[];
      coverage_data?: Record<string, unknown>;
      completed_at?: string;
    }
  ): TestExecution | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.execution_time_ms !== undefined) {
      updates.push('execution_time_ms = ?');
      values.push(data.execution_time_ms);
    }
    if (data.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(data.error_message);
    }
    if (data.console_output !== undefined) {
      updates.push('console_output = ?');
      values.push(data.console_output);
    }
    if (data.screenshots !== undefined) {
      updates.push('screenshots = ?');
      values.push(JSON.stringify(data.screenshots));
    }
    if (data.coverage_data !== undefined) {
      updates.push('coverage_data = ?');
      values.push(JSON.stringify(data.coverage_data));
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE test_executions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Get recent executions for a project
   */
  getRecentByProject(projectId: string, limit: number = 10): TestExecution[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_executions
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(projectId, limit) as unknown as DbTestExecution[];
    return rows.map(parseTestExecution);
  }
};

// ========== Visual Diffs ==========

export const visualDiffRepository = {
  /**
   * Get all diffs for an execution
   */
  getAllByExecution(executionId: string): VisualDiff[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM visual_diffs
      WHERE execution_id = ?
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(executionId) as unknown as DbVisualDiff[];
    return rows.map(parseVisualDiff);
  },

  /**
   * Get diff by ID
   */
  getById(id: string): VisualDiff | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM visual_diffs WHERE id = ?');
    const row = stmt.get(id) as DbVisualDiff | undefined;
    return row ? parseVisualDiff(row) : null;
  },

  /**
   * Create a new visual diff
   */
  create(data: {
    execution_id: string;
    baseline_screenshot: string;
    current_screenshot: string;
    diff_screenshot?: string;
    diff_percentage?: number;
    has_differences?: boolean;
    step_name: string;
    viewport_width?: number;
    viewport_height?: number;
    metadata?: Record<string, unknown>;
  }): VisualDiff {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO visual_diffs (
        id, execution_id, baseline_screenshot, current_screenshot, diff_screenshot,
        diff_percentage, has_differences, step_name, viewport_width, viewport_height,
        metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.execution_id,
      data.baseline_screenshot,
      data.current_screenshot,
      data.diff_screenshot || null,
      data.diff_percentage || null,
      data.has_differences ? 1 : 0,
      data.step_name,
      data.viewport_width || null,
      data.viewport_height || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create visual diff');
    }
    return created;
  },

  /**
   * Mark diff as reviewed
   */
  markReviewed(id: string, approved: boolean): VisualDiff | null {
    const db = getConnection();
    const stmt = db.prepare(`
      UPDATE visual_diffs
      SET reviewed = 1, approved = ?
      WHERE id = ?
    `);
    stmt.run(approved ? 1 : 0, id);
    return this.getById(id);
  },

  /**
   * Get unreviewed diffs
   */
  getUnreviewed(executionId: string): VisualDiff[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM visual_diffs
      WHERE execution_id = ? AND reviewed = 0
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(executionId) as unknown as DbVisualDiff[];
    return rows.map(parseVisualDiff);
  },

  /**
   * Get diffs with differences
   */
  getDiffsWithChanges(executionId: string): VisualDiff[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM visual_diffs
      WHERE execution_id = ? AND has_differences = 1
      ORDER BY diff_percentage DESC
    `);
    const rows = stmt.all(executionId) as unknown as DbVisualDiff[];
    return rows.map(parseVisualDiff);
  }
};
