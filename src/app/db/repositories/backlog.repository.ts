import { getDatabase } from '../connection';
import { DbBacklogItem, ImpactedFile } from '../models/types';

/**
 * Helper function to get a backlog item by ID
 */
function getBacklogItemById(id: string): DbBacklogItem | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM backlog_items WHERE id = ?');
  return stmt.get(id) as DbBacklogItem | null;
}

/**
 * Backlog Repository
 * Handles all database operations for backlog items
 */
export const backlogRepository = {
  /**
   * Get all backlog items for a project (excluding rejected)
   */
  getBacklogItemsByProject: (projectId: string): DbBacklogItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM backlog_items
      WHERE project_id = ? AND status != 'rejected'
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbBacklogItem[];
  },

  /**
   * Create a new backlog item
   */
  createBacklogItem: (item: {
    id: string;
    project_id: string;
    goal_id?: string | null;
    agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
    title: string;
    description: string;
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
    type: 'proposal' | 'custom';
    impacted_files?: ImpactedFile[];
  }): DbBacklogItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO backlog_items (
        id, project_id, goal_id, agent, title, description,
        status, type, impacted_files, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.goal_id || null,
      item.agent,
      item.title,
      item.description,
      item.status,
      item.type,
      item.impacted_files ? JSON.stringify(item.impacted_files) : null,
      now,
      now
    );

    // Return the created item
    return getBacklogItemById(item.id)!;
  },

  /**
   * Update a backlog item
   */
  updateBacklogItem: (id: string, updates: {
    status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
    goal_id?: string | null;
    title?: string;
    description?: string;
    impacted_files?: ImpactedFile[];
  }): DbBacklogItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: Array<string | null> = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      // Set accepted_at or rejected_at based on status
      if (updates.status === 'accepted') {
        updateFields.push('accepted_at = ?');
        values.push(now);
      } else if (updates.status === 'rejected') {
        updateFields.push('rejected_at = ?');
        values.push(now);
      }
    }
    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.impacted_files !== undefined) {
      updateFields.push('impacted_files = ?');
      values.push(updates.impacted_files ? JSON.stringify(updates.impacted_files) : null);
    }

    if (updateFields.length === 0) {
      // No updates to make
      return getBacklogItemById(id);
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE backlog_items
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Item not found
    }

    // Return the updated item
    return getBacklogItemById(id);
  },

  /**
   * Delete a backlog item
   */
  deleteBacklogItem: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM backlog_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
