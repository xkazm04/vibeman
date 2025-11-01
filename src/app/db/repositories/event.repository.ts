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
  },

  /**
   * Get latest event by title
   */
  getLatestEventByTitle: (projectId: string, title: string): DbEvent | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE project_id = ? AND title = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return (stmt.get(projectId, title) as DbEvent) || null;
  },

  /**
   * Get latest events for multiple titles
   */
  getLatestEventsByTitles: (projectId: string, titles: string[]): Record<string, DbEvent | null> => {
    const db = getDatabase();
    const result: Record<string, DbEvent | null> = {};

    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE project_id = ? AND title = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    for (const title of titles) {
      const event = stmt.get(projectId, title) as DbEvent | undefined;
      result[title] = event || null;
    }

    return result;
  }
};
