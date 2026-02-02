/**
 * Generation History Repository
 * Handles all database operations for generation history from template discovery
 */

import { getDatabase } from '../connection';
import type { DbGenerationHistory, DbGenerationHistoryWithTemplate } from '../models/types';
import { generateId, getCurrentTimestamp } from './repository.utils';

/**
 * Generation History Repository
 * Manages generation history CRUD operations with 30-day retention
 */
export const generationHistoryRepository = {
  /**
   * Get all generation history entries with template names
   * Ordered by created_at DESC (newest first)
   */
  getAll: (): DbGenerationHistoryWithTemplate[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        gh.id,
        gh.template_id,
        gh.query,
        gh.file_path,
        gh.created_at,
        dt.template_name
      FROM generation_history gh
      LEFT JOIN discovered_templates dt ON gh.template_id = dt.template_id
      ORDER BY gh.created_at DESC
    `);
    return stmt.all() as DbGenerationHistoryWithTemplate[];
  },

  /**
   * Create a new generation history entry
   * Automatically cleans up entries older than 30 days before insert
   */
  create: (entry: Omit<DbGenerationHistory, 'id' | 'created_at'>): DbGenerationHistory => {
    const db = getDatabase();

    // Clean up old entries first (30-day retention)
    db.prepare(`
      DELETE FROM generation_history
      WHERE created_at < datetime('now', '-30 days')
    `).run();

    // Insert new entry
    const id = generateId('genhist');
    const now = getCurrentTimestamp();

    const insertStmt = db.prepare(`
      INSERT INTO generation_history (id, template_id, query, file_path, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, entry.template_id, entry.query, entry.file_path, now);

    // Return the created entry
    return {
      id,
      template_id: entry.template_id,
      query: entry.query,
      file_path: entry.file_path,
      created_at: now,
    };
  },
};
