/**
 * Integration Repository
 * Handles all database operations for external service integrations
 */

import { getDatabase } from '../connection';
import {
  DbIntegration,
  DbIntegrationEvent,
  DbWebhook,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationEventType,
} from '../models/integration.types';
import { generateId, getCurrentTimestamp, withTableCheck } from './repository.utils';

/**
 * Integration Repository
 * Manages integration configurations
 */
export const integrationRepository = {
  /**
   * Get all integrations for a project
   */
  getByProject: (projectId: string): DbIntegration[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integrations
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbIntegration[];
  }),

  /**
   * Get active integrations for a project
   */
  getActiveByProject: (projectId: string): DbIntegration[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integrations
      WHERE project_id = ? AND status = 'active'
      ORDER BY provider, name
    `);
    return stmt.all(projectId) as DbIntegration[];
  }),

  /**
   * Get integrations by provider
   */
  getByProvider: (projectId: string, provider: IntegrationProvider): DbIntegration[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integrations
      WHERE project_id = ? AND provider = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, provider) as DbIntegration[];
  }),

  /**
   * Get integration by ID
   */
  getById: (id: string): DbIntegration | null => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM integrations WHERE id = ?');
    const result = stmt.get(id) as DbIntegration | undefined;
    return result || null;
  }),

  /**
   * Get integrations subscribed to a specific event type
   */
  getByEventType: (projectId: string, eventType: IntegrationEventType): DbIntegration[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integrations
      WHERE project_id = ?
        AND status = 'active'
        AND enabled_events LIKE ?
    `);
    return stmt.all(projectId, `%"${eventType}"%`) as DbIntegration[];
  }),

  /**
   * Create a new integration
   */
  create: (
    integration: Omit<DbIntegration, 'id' | 'error_count' | 'created_at' | 'updated_at'>
  ): DbIntegration => withTableCheck('integrations', () => {
    const db = getDatabase();
    const id = generateId('int');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO integrations (
        id, project_id, provider, name, description, status,
        config, credentials, enabled_events,
        last_sync_at, last_error, error_count,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      integration.project_id,
      integration.provider,
      integration.name,
      integration.description,
      integration.status,
      integration.config,
      integration.credentials,
      integration.enabled_events,
      integration.last_sync_at,
      integration.last_error,
      now,
      now
    );

    return integrationRepository.getById(id)!;
  }),

  /**
   * Update an integration
   */
  update: (
    id: string,
    updates: Partial<Omit<DbIntegration, 'id' | 'project_id' | 'created_at'>>
  ): DbIntegration | null => withTableCheck('integrations', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.provider !== undefined) {
      updateFields.push('provider = ?');
      values.push(updates.provider);
    }
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.config !== undefined) {
      updateFields.push('config = ?');
      values.push(updates.config);
    }
    if (updates.credentials !== undefined) {
      updateFields.push('credentials = ?');
      values.push(updates.credentials);
    }
    if (updates.enabled_events !== undefined) {
      updateFields.push('enabled_events = ?');
      values.push(updates.enabled_events);
    }
    if (updates.last_sync_at !== undefined) {
      updateFields.push('last_sync_at = ?');
      values.push(updates.last_sync_at);
    }
    if (updates.last_error !== undefined) {
      updateFields.push('last_error = ?');
      values.push(updates.last_error);
    }
    if (updates.error_count !== undefined) {
      updateFields.push('error_count = ?');
      values.push(updates.error_count);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE integrations
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return integrationRepository.getById(id);
  }),

  /**
   * Update integration status
   */
  updateStatus: (id: string, status: IntegrationStatus, error?: string): void => withTableCheck('integrations', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    if (error) {
      const stmt = db.prepare(`
        UPDATE integrations
        SET status = ?, last_error = ?, error_count = error_count + 1, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(status, error, now, id);
    } else {
      const stmt = db.prepare(`
        UPDATE integrations
        SET status = ?, last_error = NULL, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(status, now, id);
    }
  }),

  /**
   * Record successful sync
   */
  recordSync: (id: string): void => withTableCheck('integrations', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE integrations
      SET last_sync_at = ?, last_error = NULL, error_count = 0, status = 'active', updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);
  }),

  /**
   * Delete an integration
   */
  delete: (id: string): boolean => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM integrations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }),

  /**
   * Delete all integrations for a project
   */
  deleteByProject: (projectId: string): number => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM integrations WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  }),
};

/**
 * Integration Event Repository
 * Manages integration event logs
 */
export const integrationEventRepository = {
  /**
   * Get events by integration
   */
  getByIntegration: (integrationId: string, limit: number = 100): DbIntegrationEvent[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integration_events
      WHERE integration_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(integrationId, limit) as DbIntegrationEvent[];
  }),

  /**
   * Get events by project
   */
  getByProject: (projectId: string, limit: number = 100): DbIntegrationEvent[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM integration_events
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbIntegrationEvent[];
  }),

  /**
   * Get pending events for retry
   */
  getPendingEvents: (limit: number = 50): DbIntegrationEvent[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT ie.* FROM integration_events ie
      JOIN integrations i ON ie.integration_id = i.id
      WHERE ie.status = 'pending' AND i.status = 'active'
      ORDER BY ie.created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit) as DbIntegrationEvent[];
  }),

  /**
   * Get failed events for retry
   */
  getFailedEvents: (maxRetries: number = 3, limit: number = 50): DbIntegrationEvent[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT ie.* FROM integration_events ie
      JOIN integrations i ON ie.integration_id = i.id
      WHERE ie.status = 'failed'
        AND ie.retry_count < ?
        AND i.status = 'active'
      ORDER BY ie.created_at ASC
      LIMIT ?
    `);
    return stmt.all(maxRetries, limit) as DbIntegrationEvent[];
  }),

  /**
   * Create an event
   */
  create: (
    event: Omit<DbIntegrationEvent, 'id' | 'retry_count' | 'processed_at' | 'created_at'>
  ): DbIntegrationEvent => withTableCheck('integrations', () => {
    const db = getDatabase();
    const id = generateId('iev');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO integration_events (
        id, integration_id, project_id, event_type,
        payload, status, response, error_message,
        retry_count, processed_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
    `);

    stmt.run(
      id,
      event.integration_id,
      event.project_id,
      event.event_type,
      event.payload,
      event.status,
      event.response,
      event.error_message,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM integration_events WHERE id = ?');
    return selectStmt.get(id) as DbIntegrationEvent;
  }),

  /**
   * Update event status
   */
  updateStatus: (
    id: string,
    status: 'pending' | 'sent' | 'failed' | 'skipped',
    response?: string,
    errorMessage?: string
  ): void => withTableCheck('integrations', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    if (status === 'failed') {
      const stmt = db.prepare(`
        UPDATE integration_events
        SET status = ?, response = ?, error_message = ?, retry_count = retry_count + 1, processed_at = ?
        WHERE id = ?
      `);
      stmt.run(status, response || null, errorMessage || null, now, id);
    } else {
      const stmt = db.prepare(`
        UPDATE integration_events
        SET status = ?, response = ?, error_message = NULL, processed_at = ?
        WHERE id = ?
      `);
      stmt.run(status, response || null, now, id);
    }
  }),

  /**
   * Get event statistics for an integration
   */
  getStats: (integrationId: string): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    skipped: number;
  } => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
      FROM integration_events
      WHERE integration_id = ?
    `);

    const result = stmt.get(integrationId) as {
      total: number;
      sent: number | null;
      failed: number | null;
      pending: number | null;
      skipped: number | null;
    };

    return {
      total: result.total,
      sent: result.sent || 0,
      failed: result.failed || 0,
      pending: result.pending || 0,
      skipped: result.skipped || 0,
    };
  }),

  /**
   * Clean up old events
   */
  cleanupOldEvents: (daysToKeep: number = 30): number => withTableCheck('integrations', () => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const stmt = db.prepare(`
      DELETE FROM integration_events
      WHERE created_at < ? AND status IN ('sent', 'skipped')
    `);
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  }),
};

/**
 * Webhook Repository
 * Manages webhook configurations
 */
export const webhookRepository = {
  /**
   * Get webhook by integration
   */
  getByIntegration: (integrationId: string): DbWebhook | null => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM webhooks WHERE integration_id = ?');
    const result = stmt.get(integrationId) as DbWebhook | undefined;
    return result || null;
  }),

  /**
   * Get webhooks by project
   */
  getByProject: (projectId: string): DbWebhook[] => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM webhooks
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbWebhook[];
  }),

  /**
   * Create a webhook
   */
  create: (
    webhook: Omit<DbWebhook, 'id' | 'created_at' | 'updated_at'>
  ): DbWebhook => withTableCheck('integrations', () => {
    const db = getDatabase();
    const id = generateId('whk');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO webhooks (
        id, integration_id, project_id, url, method,
        headers, secret, retry_on_failure, max_retries, timeout_ms,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      webhook.integration_id,
      webhook.project_id,
      webhook.url,
      webhook.method,
      webhook.headers,
      webhook.secret,
      webhook.retry_on_failure,
      webhook.max_retries,
      webhook.timeout_ms,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM webhooks WHERE id = ?');
    return selectStmt.get(id) as DbWebhook;
  }),

  /**
   * Update a webhook
   */
  update: (
    id: string,
    updates: Partial<Omit<DbWebhook, 'id' | 'integration_id' | 'project_id' | 'created_at'>>
  ): DbWebhook | null => withTableCheck('integrations', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.url !== undefined) {
      updateFields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.method !== undefined) {
      updateFields.push('method = ?');
      values.push(updates.method);
    }
    if (updates.headers !== undefined) {
      updateFields.push('headers = ?');
      values.push(updates.headers);
    }
    if (updates.secret !== undefined) {
      updateFields.push('secret = ?');
      values.push(updates.secret);
    }
    if (updates.retry_on_failure !== undefined) {
      updateFields.push('retry_on_failure = ?');
      values.push(updates.retry_on_failure);
    }
    if (updates.max_retries !== undefined) {
      updateFields.push('max_retries = ?');
      values.push(updates.max_retries);
    }
    if (updates.timeout_ms !== undefined) {
      updateFields.push('timeout_ms = ?');
      values.push(updates.timeout_ms);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE webhooks
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    const selectStmt = db.prepare('SELECT * FROM webhooks WHERE id = ?');
    return selectStmt.get(id) as DbWebhook | null;
  }),

  /**
   * Delete a webhook
   */
  delete: (id: string): boolean => withTableCheck('integrations', () => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM webhooks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }),
};
