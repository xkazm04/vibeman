/**
 * Automation Session Repository
 * Handles database operations for standup automation sessions executed via Claude Code
 */

import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import type { DbAutomationSession } from '../models/automation-session.types';
import type {
  AutomationSessionPhase,
  AutomationCycleResult,
  StandupAutomationConfig,
} from '@/lib/standupAutomation/types';

export const automationSessionRepository = {
  /**
   * Get all sessions for a project
   */
  getByProjectId(projectId: string): DbAutomationSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM automation_sessions
      WHERE project_id = ?
      ORDER BY started_at DESC
    `);
    return stmt.all(projectId) as DbAutomationSession[];
  },

  /**
   * Get active sessions for a project (not complete/failed)
   */
  getActive(projectId: string): DbAutomationSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM automation_sessions
      WHERE project_id = ? AND phase NOT IN ('complete', 'failed')
      ORDER BY started_at DESC
    `);
    return stmt.all(projectId) as DbAutomationSession[];
  },

  /**
   * Get all currently active sessions across all projects
   */
  getAllActive(): DbAutomationSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM automation_sessions
      WHERE phase NOT IN ('complete', 'failed')
      ORDER BY started_at DESC
    `);
    return stmt.all() as DbAutomationSession[];
  },

  /**
   * Get a session by ID
   */
  getById(id: string): DbAutomationSession | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM automation_sessions WHERE id = ?');
    return (stmt.get(id) as DbAutomationSession) || null;
  },

  /**
   * Get a session by task ID
   */
  getByTaskId(taskId: string): DbAutomationSession | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM automation_sessions
      WHERE task_id = ?
    `);
    return (stmt.get(taskId) as DbAutomationSession) || null;
  },

  /**
   * Create a new automation session
   */
  create(data: {
    projectId: string;
    projectPath: string;
    config: StandupAutomationConfig;
  }): DbAutomationSession {
    const db = getDatabase();
    const now = new Date().toISOString();
    const sessionId = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO automation_sessions (
        id, project_id, project_path, phase, config, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      data.projectId,
      data.projectPath,
      'pending',
      JSON.stringify(data.config),
      now,
      now,
      now
    );

    return this.getById(sessionId)!;
  },

  /**
   * Update session phase
   */
  updatePhase(id: string, phase: AutomationSessionPhase): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE automation_sessions
      SET phase = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(phase, now, id);
    return result.changes > 0;
  },

  /**
   * Update task ID (after queueing Claude Code execution)
   */
  updateTaskId(id: string, taskId: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE automation_sessions
      SET task_id = ?, phase = 'running', updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(taskId, now, id);
    return result.changes > 0;
  },

  /**
   * Update Claude session ID (captured from CLI execution)
   */
  updateClaudeSessionId(id: string, claudeSessionId: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE automation_sessions
      SET claude_session_id = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(claudeSessionId, now, id);
    return result.changes > 0;
  },

  /**
   * Complete a session with result
   */
  complete(id: string, result: AutomationCycleResult): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE automation_sessions
      SET phase = 'complete', result = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `);

    const dbResult = stmt.run(JSON.stringify(result), now, now, id);
    return dbResult.changes > 0;
  },

  /**
   * Fail a session with error message
   */
  fail(id: string, errorMessage: string): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE automation_sessions
      SET phase = 'failed', error_message = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(errorMessage, now, now, id);
    return result.changes > 0;
  },

  /**
   * Get recent sessions for history
   */
  getRecent(limit: number = 20): DbAutomationSession[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM automation_sessions
      ORDER BY started_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DbAutomationSession[];
  },

  /**
   * Delete old completed sessions (cleanup)
   */
  deleteOlderThan(daysOld: number): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoff = cutoffDate.toISOString();

    const stmt = db.prepare(`
      DELETE FROM automation_sessions
      WHERE phase IN ('complete', 'failed') AND completed_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  },

  /**
   * Parse stored config JSON
   */
  parseConfig(session: DbAutomationSession): StandupAutomationConfig {
    try {
      return JSON.parse(session.config);
    } catch {
      throw new Error(`Failed to parse config for session ${session.id}`);
    }
  },

  /**
   * Parse stored result JSON
   */
  parseResult(session: DbAutomationSession): AutomationCycleResult | null {
    if (!session.result) return null;
    try {
      return JSON.parse(session.result);
    } catch {
      return null;
    }
  },
};
