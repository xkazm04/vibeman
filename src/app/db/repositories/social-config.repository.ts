import { getDatabase } from '../connection';
import { DbSocialChannelConfig, SocialChannelType, ConnectionStatus } from '../models/social-config.types';

/**
 * Database type for social feedback items
 */
export interface DbSocialFeedbackItem {
  id: string;
  config_id: string;
  external_id: string;
  channel_type: string;
  content_preview: string | null;
  author_name: string | null;
  author_id: string | null;
  external_created_at: string | null;
  fetched_at: string;
  is_processed: number;
  processed_at: string | null;
}

/**
 * Social Channel Config Repository
 * Handles all database operations for social channel configurations
 */
export const socialConfigRepository = {
  /**
   * Get all configs for a project
   */
  getConfigsByProject: (projectId: string): DbSocialChannelConfig[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_channel_configs
      WHERE project_id = ?
      ORDER BY channel_type, created_at DESC
    `);
    return stmt.all(projectId) as DbSocialChannelConfig[];
  },

  /**
   * Get configs by project and channel type
   */
  getConfigsByChannel: (projectId: string, channelType: SocialChannelType): DbSocialChannelConfig[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_channel_configs
      WHERE project_id = ? AND channel_type = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, channelType) as DbSocialChannelConfig[];
  },

  /**
   * Get a config by ID
   */
  getConfigById: (id: string): DbSocialChannelConfig | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM social_channel_configs WHERE id = ?');
    const config = stmt.get(id) as DbSocialChannelConfig | undefined;
    return config || null;
  },

  /**
   * Get enabled configs for a project
   */
  getEnabledConfigs: (projectId: string): DbSocialChannelConfig[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_channel_configs
      WHERE project_id = ? AND is_enabled = 1
      ORDER BY channel_type, name
    `);
    return stmt.all(projectId) as DbSocialChannelConfig[];
  },

  /**
   * Create a new config
   */
  createConfig: (config: Omit<DbSocialChannelConfig, 'created_at' | 'updated_at'>): DbSocialChannelConfig => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO social_channel_configs (
        id, project_id, channel_type, name, is_enabled,
        credentials_encrypted, config_json,
        connection_status, last_connection_test, last_error,
        last_fetch_at, items_fetched_count,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      config.id,
      config.project_id,
      config.channel_type,
      config.name,
      config.is_enabled,
      config.credentials_encrypted,
      config.config_json,
      config.connection_status,
      config.last_connection_test,
      config.last_error,
      config.last_fetch_at,
      config.items_fetched_count,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM social_channel_configs WHERE id = ?');
    return selectStmt.get(config.id) as DbSocialChannelConfig;
  },

  /**
   * Update a config
   */
  updateConfig: (
    id: string,
    updates: Partial<Omit<DbSocialChannelConfig, 'id' | 'project_id' | 'created_at'>>
  ): DbSocialChannelConfig | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.channel_type !== undefined) {
      updateFields.push('channel_type = ?');
      values.push(updates.channel_type);
    }
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.is_enabled !== undefined) {
      updateFields.push('is_enabled = ?');
      values.push(updates.is_enabled);
    }
    if (updates.credentials_encrypted !== undefined) {
      updateFields.push('credentials_encrypted = ?');
      values.push(updates.credentials_encrypted);
    }
    if (updates.config_json !== undefined) {
      updateFields.push('config_json = ?');
      values.push(updates.config_json);
    }
    if (updates.connection_status !== undefined) {
      updateFields.push('connection_status = ?');
      values.push(updates.connection_status);
    }
    if (updates.last_connection_test !== undefined) {
      updateFields.push('last_connection_test = ?');
      values.push(updates.last_connection_test);
    }
    if (updates.last_error !== undefined) {
      updateFields.push('last_error = ?');
      values.push(updates.last_error);
    }
    if (updates.last_fetch_at !== undefined) {
      updateFields.push('last_fetch_at = ?');
      values.push(updates.last_fetch_at);
    }
    if (updates.items_fetched_count !== undefined) {
      updateFields.push('items_fetched_count = ?');
      values.push(updates.items_fetched_count);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE social_channel_configs
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    const selectStmt = db.prepare('SELECT * FROM social_channel_configs WHERE id = ?');
    return selectStmt.get(id) as DbSocialChannelConfig | null;
  },

  /**
   * Update connection status
   */
  updateConnectionStatus: (
    id: string,
    status: ConnectionStatus,
    error?: string | null
  ): DbSocialChannelConfig | null => {
    return socialConfigRepository.updateConfig(id, {
      connection_status: status,
      last_connection_test: new Date().toISOString(),
      last_error: error ?? null,
    });
  },

  /**
   * Update fetch tracking
   */
  updateFetchTracking: (
    id: string,
    itemsFetched: number
  ): DbSocialChannelConfig | null => {
    const current = socialConfigRepository.getConfigById(id);
    if (!current) return null;

    return socialConfigRepository.updateConfig(id, {
      last_fetch_at: new Date().toISOString(),
      items_fetched_count: current.items_fetched_count + itemsFetched,
    });
  },

  /**
   * Toggle enabled status
   */
  toggleEnabled: (id: string): DbSocialChannelConfig | null => {
    const current = socialConfigRepository.getConfigById(id);
    if (!current) return null;

    return socialConfigRepository.updateConfig(id, {
      is_enabled: current.is_enabled === 1 ? 0 : 1,
    });
  },

  /**
   * Delete a config
   */
  deleteConfig: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM social_channel_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all configs for a project
   */
  deleteAllForProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM social_channel_configs WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get config count by channel type for a project
   */
  getChannelCounts: (projectId: string): Record<SocialChannelType, number> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT channel_type, COUNT(*) as count
      FROM social_channel_configs
      WHERE project_id = ?
      GROUP BY channel_type
    `);
    const results = stmt.all(projectId) as Array<{ channel_type: SocialChannelType; count: number }>;

    const counts: Record<SocialChannelType, number> = {
      instagram: 0,
      facebook: 0,
      x: 0,
      gmail: 0,
      discord: 0,
    };

    for (const row of results) {
      counts[row.channel_type] = row.count;
    }

    return counts;
  },
};

/**
 * Social Channel Fetch Log Repository
 * Tracks fetch operations for debugging and monitoring
 */
export const socialFetchLogRepository = {
  /**
   * Create a fetch log entry
   */
  createLog: (log: {
    id: string;
    config_id: string;
    status: 'running' | 'completed' | 'failed';
  }): void => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO social_channel_fetch_log (
        id, config_id, fetch_started_at, status, created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(log.id, log.config_id, now, log.status, now);
  },

  /**
   * Complete a fetch log
   */
  completeLog: (id: string, itemsFetched: number): void => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE social_channel_fetch_log
      SET fetch_completed_at = ?, items_fetched = ?, status = 'completed'
      WHERE id = ?
    `);

    stmt.run(now, itemsFetched, id);
  },

  /**
   * Fail a fetch log
   */
  failLog: (id: string, errorMessage: string): void => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE social_channel_fetch_log
      SET fetch_completed_at = ?, status = 'failed', error_message = ?
      WHERE id = ?
    `);

    stmt.run(now, errorMessage, id);
  },

  /**
   * Get recent logs for a config
   */
  getLogsForConfig: (configId: string, limit: number = 10): Array<{
    id: string;
    config_id: string;
    fetch_started_at: string;
    fetch_completed_at: string | null;
    items_fetched: number;
    status: string;
    error_message: string | null;
    created_at: string;
  }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_channel_fetch_log
      WHERE config_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(configId, limit) as any[];
  },
};

/**
 * Social Feedback Items Repository
 * Tracks fetched feedback items for deduplication
 */
export const socialFeedbackItemsRepository = {
  /**
   * Check if an item exists by external ID
   */
  exists: (configId: string, externalId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 1 FROM social_feedback_items
      WHERE config_id = ? AND external_id = ?
      LIMIT 1
    `);
    const result = stmt.get(configId, externalId);
    return !!result;
  },

  /**
   * Check multiple external IDs at once
   * Returns a Set of IDs that already exist
   */
  existingIds: (configId: string, externalIds: string[]): Set<string> => {
    if (externalIds.length === 0) return new Set();

    const db = getDatabase();
    const placeholders = externalIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT external_id FROM social_feedback_items
      WHERE config_id = ? AND external_id IN (${placeholders})
    `);
    const results = stmt.all(configId, ...externalIds) as Array<{ external_id: string }>;
    return new Set(results.map(r => r.external_id));
  },

  /**
   * Insert a new feedback item
   */
  insert: (item: {
    id: string;
    config_id: string;
    external_id: string;
    channel_type: string;
    content_preview?: string;
    author_name?: string;
    author_id?: string;
    external_created_at?: string;
  }): DbSocialFeedbackItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO social_feedback_items (
        id, config_id, external_id, channel_type,
        content_preview, author_name, author_id,
        external_created_at, fetched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.config_id,
      item.external_id,
      item.channel_type,
      item.content_preview || null,
      item.author_name || null,
      item.author_id || null,
      item.external_created_at || null,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM social_feedback_items WHERE id = ?');
    return selectStmt.get(item.id) as DbSocialFeedbackItem;
  },

  /**
   * Insert multiple items, skipping duplicates
   * Returns the number of new items inserted
   */
  insertMany: (items: Array<{
    id: string;
    config_id: string;
    external_id: string;
    channel_type: string;
    content_preview?: string;
    author_name?: string;
    author_id?: string;
    external_created_at?: string;
  }>): number => {
    if (items.length === 0) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO social_feedback_items (
        id, config_id, external_id, channel_type,
        content_preview, author_name, author_id,
        external_created_at, fetched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let insertedCount = 0;
    for (const item of items) {
      try {
        const result = stmt.run(
          item.id,
          item.config_id,
          item.external_id,
          item.channel_type,
          item.content_preview || null,
          item.author_name || null,
          item.author_id || null,
          item.external_created_at || null,
          now
        );
        if (result.changes > 0) insertedCount++;
      } catch {
        // Ignore duplicate key errors
      }
    }

    return insertedCount;
  },

  /**
   * Get recent items for a config
   */
  getRecentItems: (configId: string, limit: number = 10): DbSocialFeedbackItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_feedback_items
      WHERE config_id = ?
      ORDER BY fetched_at DESC
      LIMIT ?
    `);
    return stmt.all(configId, limit) as DbSocialFeedbackItem[];
  },

  /**
   * Get unprocessed items
   */
  getUnprocessedItems: (configId: string, limit: number = 50): DbSocialFeedbackItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_feedback_items
      WHERE config_id = ? AND is_processed = 0
      ORDER BY fetched_at ASC
      LIMIT ?
    `);
    return stmt.all(configId, limit) as DbSocialFeedbackItem[];
  },

  /**
   * Mark items as processed
   */
  markProcessed: (itemIds: string[]): void => {
    if (itemIds.length === 0) return;

    const db = getDatabase();
    const now = new Date().toISOString();
    const placeholders = itemIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE social_feedback_items
      SET is_processed = 1, processed_at = ?
      WHERE id IN (${placeholders})
    `);
    stmt.run(now, ...itemIds);
  },

  /**
   * Get item count for a config
   */
  getItemCount: (configId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM social_feedback_items
      WHERE config_id = ?
    `);
    const result = stmt.get(configId) as { count: number };
    return result.count;
  },

  /**
   * Delete old items (cleanup)
   */
  deleteOlderThan: (days: number): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stmt = db.prepare(`
      DELETE FROM social_feedback_items
      WHERE fetched_at < ?
    `);
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  },
};
