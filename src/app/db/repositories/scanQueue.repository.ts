import { getDatabase } from '../connection';
import { DbScanQueueItem, DbScanNotification, DbFileWatchConfig } from '../models/types';

/**
 * Scan Queue Repository
 * Handles all database operations for scan queue, notifications, and file watch config
 */
export const scanQueueRepository = {
  /**
   * Get all queue items for a project
   */
  getQueueByProject: (projectId: string): DbScanQueueItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_queue
      WHERE project_id = ?
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId) as DbScanQueueItem[];
  },

  /**
   * Get queue items by status
   */
  getQueueByStatus: (projectId: string, status: DbScanQueueItem['status']): DbScanQueueItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_queue
      WHERE project_id = ? AND status = ?
      ORDER BY priority DESC, created_at ASC
    `);
    return stmt.all(projectId, status) as DbScanQueueItem[];
  },

  /**
   * Get next pending queue item (highest priority)
   */
  getNextPending: (projectId?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    let stmt;
    let result;

    if (projectId) {
      stmt = db.prepare(`
        SELECT * FROM scan_queue
        WHERE project_id = ? AND status = 'queued'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `);
      result = stmt.get(projectId) as DbScanQueueItem | undefined;
    } else {
      stmt = db.prepare(`
        SELECT * FROM scan_queue
        WHERE status = 'queued'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `);
      result = stmt.get() as DbScanQueueItem | undefined;
    }

    return result || null;
  },

  /**
   * Get a single queue item by ID
   */
  getQueueItemById: (id: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    const item = stmt.get(id) as DbScanQueueItem | undefined;
    return item || null;
  },

  /**
   * Create a new queue item
   */
  createQueueItem: (item: {
    id: string;
    project_id: string;
    scan_type: string;
    context_id?: string | null;
    trigger_type: DbScanQueueItem['trigger_type'];
    trigger_metadata?: Record<string, unknown>;
    priority?: number;
    auto_merge_enabled?: boolean;
  }): DbScanQueueItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scan_queue (
        id, project_id, scan_type, context_id, trigger_type, trigger_metadata,
        status, priority, progress, auto_merge_enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.scan_type,
      item.context_id || null,
      item.trigger_type,
      item.trigger_metadata ? JSON.stringify(item.trigger_metadata) : null,
      item.priority || 0,
      item.auto_merge_enabled ? 1 : 0,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    return selectStmt.get(item.id) as DbScanQueueItem;
  },

  /**
   * Update queue item status
   */
  updateStatus: (id: string, status: DbScanQueueItem['status'], error_message?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    let updateFields = 'status = ?, updated_at = ?';
    const params: (string | number)[] = [status, now];

    if (status === 'running') {
      updateFields += ', started_at = ?';
      params.push(now);
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateFields += ', completed_at = ?';
      params.push(now);
    }

    if (error_message !== undefined) {
      updateFields += ', error_message = ?';
      params.push(error_message);
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET ${updateFields}
      WHERE id = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    return selectStmt.get(id) as DbScanQueueItem;
  },

  /**
   * Update queue item progress
   */
  updateProgress: (id: string, progress: number, message?: string, currentStep?: string, totalSteps?: number): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET progress = ?,
          progress_message = ?,
          current_step = ?,
          total_steps = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      Math.min(100, Math.max(0, progress)),
      message || null,
      currentStep || null,
      totalSteps || null,
      now,
      id
    );

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    return selectStmt.get(id) as DbScanQueueItem;
  },

  /**
   * Link completed scan to queue item
   */
  linkScan: (id: string, scanId: string, resultSummary?: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET scan_id = ?, result_summary = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(scanId, resultSummary || null, now, id);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    return selectStmt.get(id) as DbScanQueueItem;
  },

  /**
   * Update auto-merge status
   */
  updateAutoMergeStatus: (id: string, status: string): DbScanQueueItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scan_queue
      SET auto_merge_status = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, now, id);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM scan_queue WHERE id = ?');
    return selectStmt.get(id) as DbScanQueueItem;
  },

  /**
   * Delete a queue item
   */
  deleteQueueItem: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM scan_queue WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete old completed/failed queue items
   */
  cleanupOldItems: (projectId: string, daysOld: number = 30): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare(`
      DELETE FROM scan_queue
      WHERE project_id = ?
        AND status IN ('completed', 'failed', 'cancelled')
        AND completed_at < ?
    `);

    const result = stmt.run(projectId, cutoffDate.toISOString());
    return result.changes;
  },

  // ===== NOTIFICATIONS =====

  /**
   * Create a notification
   */
  createNotification: (notification: {
    id: string;
    queue_item_id: string;
    project_id: string;
    notification_type: DbScanNotification['notification_type'];
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): DbScanNotification => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scan_notifications (
        id, queue_item_id, project_id, notification_type, title, message, data, read, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(
      notification.id,
      notification.queue_item_id,
      notification.project_id,
      notification.notification_type,
      notification.title,
      notification.message,
      notification.data ? JSON.stringify(notification.data) : null,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM scan_notifications WHERE id = ?');
    return selectStmt.get(notification.id) as DbScanNotification;
  },

  /**
   * Get notifications for a project
   */
  getNotifications: (projectId: string, unreadOnly: boolean = false): DbScanNotification[] => {
    const db = getDatabase();
    let query = `
      SELECT * FROM scan_notifications
      WHERE project_id = ?
    `;

    if (unreadOnly) {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(projectId) as DbScanNotification[];
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE scan_notifications SET read = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE scan_notifications SET read = 1 WHERE project_id = ? AND read = 0');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Delete a notification
   */
  deleteNotification: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM scan_notifications WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // ===== FILE WATCH CONFIG =====

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
    const existing = scanQueueRepository.getFileWatchConfig(config.project_id);

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
