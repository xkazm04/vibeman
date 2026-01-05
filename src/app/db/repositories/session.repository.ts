/**
 * Claude Code Session Repository
 * Handles database operations for session management with --resume flag support
 */

import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import {
  DbClaudeCodeSession,
  DbSessionTask,
  ClaudeCodeSessionStatus,
  ClaudeCodeSessionTaskStatus,
} from '../models/session.types';

// ============================================================================
// SESSION REPOSITORY
// ============================================================================

export const sessionRepository = {
  /**
   * Get all sessions for a project
   */
  getByProjectId(projectId: string): DbClaudeCodeSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbClaudeCodeSession[];
  },

  /**
   * Get active sessions for a project (not completed/failed)
   */
  getActive(projectId: string): DbClaudeCodeSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE project_id = ? AND status IN ('pending', 'running', 'paused')
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbClaudeCodeSession[];
  },

  /**
   * Get a session by ID
   */
  getById(id: string): DbClaudeCodeSession | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM claude_code_sessions WHERE id = ?');
    return (stmt.get(id) as DbClaudeCodeSession) || null;
  },

  /**
   * Get a session by Claude session ID
   */
  getByClaudeSessionId(claudeSessionId: string): DbClaudeCodeSession | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE claude_session_id = ?
    `);
    return (stmt.get(claudeSessionId) as DbClaudeCodeSession) || null;
  },

  /**
   * Create a new session
   */
  create(data: {
    projectId: string;
    name: string;
    taskId: string;
    requirementName: string;
  }): DbClaudeCodeSession {
    const db = getDatabase();
    const now = new Date().toISOString();
    const sessionId = uuidv4();
    const taskIds = JSON.stringify([data.taskId]);

    // Create session
    const sessionStmt = db.prepare(`
      INSERT INTO claude_code_sessions (
        id, project_id, name, task_ids, status, context_tokens, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sessionStmt.run(
      sessionId,
      data.projectId,
      data.name,
      taskIds,
      'pending',
      0,
      now,
      now
    );

    // Create first session task
    const taskStmtId = uuidv4();
    const taskStmt = db.prepare(`
      INSERT INTO session_tasks (
        id, session_id, task_id, requirement_name, order_index, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    taskStmt.run(
      taskStmtId,
      sessionId,
      data.taskId,
      data.requirementName,
      0,
      'pending',
      now
    );

    return this.getById(sessionId)!;
  },

  /**
   * Update Claude session ID (after first task execution)
   */
  updateClaudeSessionId(id: string, claudeSessionId: string): DbClaudeCodeSession | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE claude_code_sessions
      SET claude_session_id = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(claudeSessionId, now, id);
    if (result.changes === 0) return null;

    return this.getById(id);
  },

  /**
   * Update session status
   */
  updateStatus(id: string, status: ClaudeCodeSessionStatus): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE claude_code_sessions
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);
    return result.changes > 0;
  },

  /**
   * Update context tokens
   */
  updateContextTokens(id: string, tokens: number): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE claude_code_sessions
      SET context_tokens = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(tokens, now, id);
    return result.changes > 0;
  },

  /**
   * Add a task to session
   */
  addTask(sessionId: string, taskId: string, requirementName: string): DbSessionTask | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get current session
    const session = this.getById(sessionId);
    if (!session) return null;

    // Get next order index
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM session_tasks WHERE session_id = ?');
    const countResult = countStmt.get(sessionId) as { count: number };
    const orderIndex = countResult.count;

    // Create task
    const id = uuidv4();
    const taskStmt = db.prepare(`
      INSERT INTO session_tasks (
        id, session_id, task_id, requirement_name, order_index, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    taskStmt.run(id, sessionId, taskId, requirementName, orderIndex, 'pending', now);

    // Update session task_ids
    const currentTaskIds = JSON.parse(session.task_ids || '[]');
    currentTaskIds.push(taskId);

    const updateStmt = db.prepare(`
      UPDATE claude_code_sessions
      SET task_ids = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(currentTaskIds), now, sessionId);

    return sessionTaskRepository.getById(id);
  },

  /**
   * Remove a task from session
   */
  removeTask(sessionId: string, taskId: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Delete from session_tasks
    const deleteStmt = db.prepare(`
      DELETE FROM session_tasks
      WHERE session_id = ? AND task_id = ?
    `);
    const result = deleteStmt.run(sessionId, taskId);

    if (result.changes === 0) return false;

    // Update session task_ids
    const session = this.getById(sessionId);
    if (session) {
      const currentTaskIds = JSON.parse(session.task_ids || '[]');
      const updatedTaskIds = currentTaskIds.filter((id: string) => id !== taskId);

      const updateStmt = db.prepare(`
        UPDATE claude_code_sessions
        SET task_ids = ?, updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(updatedTaskIds), now, sessionId);
    }

    return true;
  },

  /**
   * Compact session - remove completed tasks but keep session
   */
  compact(id: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Delete completed tasks
    const deleteStmt = db.prepare(`
      DELETE FROM session_tasks
      WHERE session_id = ? AND status = 'completed'
    `);
    deleteStmt.run(id);

    // Get remaining task IDs
    const tasksStmt = db.prepare(`
      SELECT task_id FROM session_tasks
      WHERE session_id = ?
      ORDER BY order_index ASC
    `);
    const remainingTasks = tasksStmt.all(id) as Array<{ task_id: string }>;
    const taskIds = remainingTasks.map(t => t.task_id);

    // Update session
    const updateStmt = db.prepare(`
      UPDATE claude_code_sessions
      SET task_ids = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(taskIds), now, id);

    return true;
  },

  /**
   * Delete a session
   */
  delete(id: string): boolean {
    const db = getDatabase();
    // Session tasks are deleted via CASCADE
    const stmt = db.prepare('DELETE FROM claude_code_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Update heartbeat (touch updated_at timestamp)
   */
  updateHeartbeat(id: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE claude_code_sessions
      SET updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, id);
    return result.changes > 0;
  },

  /**
   * Get stale running sessions (no heartbeat for more than thresholdMinutes)
   */
  getStaleRunning(thresholdMinutes: number): DbClaudeCodeSession[] {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE status = 'running' AND updated_at < ?
      ORDER BY updated_at ASC
    `);

    return stmt.all(cutoffTime) as DbClaudeCodeSession[];
  },

  /**
   * Get stale paused sessions (paused for more than thresholdHours)
   */
  getStalePaused(thresholdHours: number): DbClaudeCodeSession[] {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE status = 'paused' AND updated_at < ?
      ORDER BY updated_at ASC
    `);

    return stmt.all(cutoffTime) as DbClaudeCodeSession[];
  },

  /**
   * Get stale pending sessions (never started for more than thresholdHours)
   */
  getStalePending(thresholdHours: number): DbClaudeCodeSession[] {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT * FROM claude_code_sessions
      WHERE status = 'pending' AND created_at < ?
      ORDER BY created_at ASC
    `);

    return stmt.all(cutoffTime) as DbClaudeCodeSession[];
  },

  /**
   * Get all orphaned sessions using thresholds
   */
  getAllOrphaned(thresholds: {
    runningMinutes: number;
    pausedHours: number;
    pendingHours: number;
  }): {
    staleRunning: DbClaudeCodeSession[];
    stalePaused: DbClaudeCodeSession[];
    stalePending: DbClaudeCodeSession[];
  } {
    return {
      staleRunning: this.getStaleRunning(thresholds.runningMinutes),
      stalePaused: this.getStalePaused(thresholds.pausedHours),
      stalePending: this.getStalePending(thresholds.pendingHours),
    };
  },

  /**
   * Bulk update status for multiple sessions
   */
  bulkUpdateStatus(sessionIds: string[], status: ClaudeCodeSessionStatus): number {
    if (sessionIds.length === 0) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();

    // Use placeholders for array of IDs
    const placeholders = sessionIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE claude_code_sessions
      SET status = ?, updated_at = ?
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(status, now, ...sessionIds);
    return result.changes;
  },

  /**
   * Delete multiple sessions by IDs
   */
  bulkDelete(sessionIds: string[]): number {
    if (sessionIds.length === 0) return 0;

    const db = getDatabase();
    const placeholders = sessionIds.map(() => '?').join(',');

    const stmt = db.prepare(`
      DELETE FROM claude_code_sessions
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...sessionIds);
    return result.changes;
  },

  /**
   * Get session statistics for a project
   */
  getStats(projectId: string): {
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM claude_code_sessions
      WHERE project_id = ?
      GROUP BY status
    `);
    const results = stmt.all(projectId) as Array<{ status: string; count: number }>;

    const stats = {
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of results) {
      if (row.status in stats) {
        (stats as Record<string, number>)[row.status] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  },
};

// ============================================================================
// SESSION TASK REPOSITORY
// ============================================================================

export const sessionTaskRepository = {
  /**
   * Get all tasks for a session
   */
  getBySessionId(sessionId: string): DbSessionTask[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM session_tasks
      WHERE session_id = ?
      ORDER BY order_index ASC
    `);
    return stmt.all(sessionId) as DbSessionTask[];
  },

  /**
   * Get next pending task for a session
   */
  getNextPending(sessionId: string): DbSessionTask | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM session_tasks
      WHERE session_id = ? AND status = 'pending'
      ORDER BY order_index ASC
      LIMIT 1
    `);
    return (stmt.get(sessionId) as DbSessionTask) || null;
  },

  /**
   * Get a task by ID
   */
  getById(id: string): DbSessionTask | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM session_tasks WHERE id = ?');
    return (stmt.get(id) as DbSessionTask) || null;
  },

  /**
   * Get a task by task_id within a session
   */
  getByTaskId(sessionId: string, taskId: string): DbSessionTask | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM session_tasks
      WHERE session_id = ? AND task_id = ?
    `);
    return (stmt.get(sessionId, taskId) as DbSessionTask) || null;
  },

  /**
   * Update task status
   */
  updateStatus(
    id: string,
    status: ClaudeCodeSessionTaskStatus,
    extras?: {
      claudeSessionId?: string;
      errorMessage?: string;
    }
  ): DbSessionTask | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    let query = 'UPDATE session_tasks SET status = ?';
    const values: (string | null)[] = [status];

    if (status === 'running') {
      query += ', started_at = ?';
      values.push(now);
    } else if (status === 'completed' || status === 'failed') {
      query += ', completed_at = ?';
      values.push(now);
    }

    if (extras?.claudeSessionId !== undefined) {
      query += ', claude_session_id = ?';
      values.push(extras.claudeSessionId);
    }

    if (extras?.errorMessage !== undefined) {
      query += ', error_message = ?';
      values.push(extras.errorMessage);
    }

    query += ' WHERE id = ?';
    values.push(id);

    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) return null;
    return this.getById(id);
  },

  /**
   * Get task statistics for a session
   */
  getStats(sessionId: string): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM session_tasks
      WHERE session_id = ?
      GROUP BY status
    `);
    const results = stmt.all(sessionId) as Array<{ status: string; count: number }>;

    const stats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of results) {
      if (row.status in stats) {
        (stats as Record<string, number>)[row.status] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  },
};
