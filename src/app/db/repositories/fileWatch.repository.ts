import { getDatabase } from '../connection';
import { DbFileWatchConfig } from '../models/types';

/**
 * File Watch Config Repository
 * Handles CRUD operations for file watcher settings
 */
export const fileWatchRepository = {
  /**
   * Get file watch config for a project
   */
  getFileWatchConfig: (projectId: string): DbFileWatchConfig | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM file_watch_config WHERE project_id = ?');
    const config = stmt.get(projectId) as DbFileWatchConfig | undefined;
    return config || null;
  },

  /**
   * Create or update file watch config
   */
  upsertFileWatchConfig: (config: {
    id: string;
    project_id: string;
    enabled?: boolean;
    watch_patterns: string[];
    ignore_patterns?: string[];
    scan_types: string[];
    debounce_ms?: number;
  }): DbFileWatchConfig => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Check if config exists
    const existing = fileWatchRepository.getFileWatchConfig(config.project_id);

    if (existing) {
      // Update
      const stmt = db.prepare(`
        UPDATE file_watch_config
        SET enabled = ?,
            watch_patterns = ?,
            ignore_patterns = ?,
            scan_types = ?,
            debounce_ms = ?,
            updated_at = ?
        WHERE project_id = ?
      `);

      stmt.run(
        config.enabled !== undefined ? (config.enabled ? 1 : 0) : existing.enabled,
        JSON.stringify(config.watch_patterns),
        config.ignore_patterns ? JSON.stringify(config.ignore_patterns) : existing.ignore_patterns,
        JSON.stringify(config.scan_types),
        config.debounce_ms !== undefined ? config.debounce_ms : existing.debounce_ms,
        now,
        config.project_id
      );
    } else {
      // Insert
      const stmt = db.prepare(`
        INSERT INTO file_watch_config (
          id, project_id, enabled, watch_patterns, ignore_patterns, scan_types, debounce_ms, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        config.id,
        config.project_id,
        config.enabled !== undefined ? (config.enabled ? 1 : 0) : 1,
        JSON.stringify(config.watch_patterns),
        config.ignore_patterns ? JSON.stringify(config.ignore_patterns) : null,
        JSON.stringify(config.scan_types),
        config.debounce_ms || 5000,
        now,
        now
      );
    }

    const selectStmt = db.prepare('SELECT * FROM file_watch_config WHERE project_id = ?');
    return selectStmt.get(config.project_id) as DbFileWatchConfig;
  },

  /**
   * Toggle file watch enabled status
   */
  toggleFileWatch: (projectId: string): DbFileWatchConfig | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE file_watch_config
      SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE project_id = ?
    `);

    const result = stmt.run(now, projectId);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM file_watch_config WHERE project_id = ?');
    return selectStmt.get(projectId) as DbFileWatchConfig;
  },

  /**
   * Delete file watch config
   */
  deleteFileWatchConfig: (projectId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM file_watch_config WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes > 0;
  }
};
