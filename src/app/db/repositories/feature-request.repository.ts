/**
 * Feature Request Repository
 * Database operations for feature requests
 */

import { getDatabase } from '../connection';
import { DbFeatureRequest, FeatureRequestComment, FeatureRequestNotification } from '../models/feature-request.types';

export const featureRequestRepository = {
  /**
   * Create a new feature request
   */
  create(request: Omit<DbFeatureRequest, 'created_at' | 'updated_at'>): DbFeatureRequest {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO feature_requests (
        id, project_id, requester_name, requester_email, source, source_metadata,
        natural_language_description, status, priority, ai_analysis, generated_code,
        generated_tests, generated_documentation, commit_sha, commit_url,
        error_message, developer_notes, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      request.id,
      request.project_id,
      request.requester_name,
      request.requester_email || null,
      request.source,
      request.source_metadata || null,
      request.natural_language_description,
      request.status,
      request.priority,
      request.ai_analysis || null,
      request.generated_code || null,
      request.generated_tests || null,
      request.generated_documentation || null,
      request.commit_sha || null,
      request.commit_url || null,
      request.error_message || null,
      request.developer_notes || null,
      now,
      now,
      request.completed_at || null
    );

    return { ...request, created_at: now, updated_at: now };
  },

  /**
   * Get feature request by ID
   */
  getById(id: string): DbFeatureRequest | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM feature_requests WHERE id = ?');
    return stmt.get(id) as DbFeatureRequest | null;
  },

  /**
   * Get all feature requests for a project
   */
  getByProjectId(projectId: string): DbFeatureRequest[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM feature_requests
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbFeatureRequest[];
  },

  /**
   * Get feature requests by status
   */
  getByStatus(projectId: string, status: DbFeatureRequest['status']): DbFeatureRequest[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM feature_requests
      WHERE project_id = ? AND status = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, status) as DbFeatureRequest[];
  },

  /**
   * Update feature request
   */
  update(id: string, updates: Partial<DbFeatureRequest>): DbFeatureRequest | null {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE feature_requests
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Delete feature request
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM feature_requests WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get recent feature requests
   */
  getRecent(projectId: string, limit: number = 10): DbFeatureRequest[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM feature_requests
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbFeatureRequest[];
  },

  /**
   * Add comment to feature request
   */
  addComment(comment: Omit<FeatureRequestComment, 'created_at'>): FeatureRequestComment {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO feature_request_comments (
        id, feature_request_id, author_name, author_email, comment_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      comment.id,
      comment.feature_request_id,
      comment.author_name,
      comment.author_email || null,
      comment.comment_text,
      now
    );

    return { ...comment, created_at: now };
  },

  /**
   * Get comments for feature request
   */
  getComments(featureRequestId: string): FeatureRequestComment[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM feature_request_comments
      WHERE feature_request_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(featureRequestId) as FeatureRequestComment[];
  },

  /**
   * Create notification record
   */
  createNotification(notification: Omit<FeatureRequestNotification, 'sent_at'>): FeatureRequestNotification {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO feature_request_notifications (
        id, feature_request_id, recipient_email, notification_type,
        sent_at, delivery_status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      notification.id,
      notification.feature_request_id,
      notification.recipient_email,
      notification.notification_type,
      now,
      notification.delivery_status,
      notification.error_message || null
    );

    return { ...notification, sent_at: now };
  },

  /**
   * Update notification status
   */
  updateNotification(id: string, status: FeatureRequestNotification['delivery_status'], errorMessage?: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE feature_request_notifications
      SET delivery_status = ?, error_message = ?
      WHERE id = ?
    `);
    const result = stmt.run(status, errorMessage || null, id);
    return result.changes > 0;
  },

  /**
   * Get pending notifications
   */
  getPendingNotifications(): FeatureRequestNotification[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM feature_request_notifications
      WHERE delivery_status = 'pending'
      ORDER BY sent_at ASC
      LIMIT 100
    `);
    return stmt.all() as FeatureRequestNotification[];
  }
};
