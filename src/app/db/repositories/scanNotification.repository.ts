import { getDatabase } from '../connection';
import { DbScanNotification } from '../models/types';

/**
 * Scan Notification Repository
 * Handles CRUD operations for scan completion notifications
 */
export const scanNotificationRepository = {
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
};
