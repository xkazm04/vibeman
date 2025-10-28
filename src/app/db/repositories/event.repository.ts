import { getDatabase } from '../connection';
import { DbEvent } from '../models/types';

/**
 * Event Repository
 * Handles all database operations for events
 */
export const eventRepository = {
  /**
   * Get all events for a project
   */
  getEventsByProject: (projectId: string, limit: number = 50): DbEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbEvent[];
  },

  /**
   * Create a new event
   */
  createEvent: (event: {
    id: string;
    project_id: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
    agent?: string;
    message?: string;
  }): DbEvent => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (id, project_id, title, description, type, agent, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.project_id,
      event.title,
      event.description,
      event.type,
      event.agent || null,
      event.message || null,
      now
    );

    // Return the created event
    const selectStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    return selectStmt.get(event.id) as DbEvent;
  },

  /**
   * Delete old events (keep only the latest N events)
   */
  cleanupOldEvents: (projectId: string, keepCount: number = 100): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM events
      WHERE project_id = ?
      AND id NOT IN (
        SELECT id FROM events
        WHERE project_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
    `);
    const result = stmt.run(projectId, projectId, keepCount);
    return result.changes;
  },

  /**
   * Get events by type
   */
  getEventsByType: (projectId: string, type: string, limit: number = 50): DbEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE project_id = ? AND type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, type, limit) as DbEvent[];
  }
};
