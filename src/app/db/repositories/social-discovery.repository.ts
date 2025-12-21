import { getDatabase } from '../connection';
import type { DbDiscoveryConfig } from '@/app/features/Social/sub_SocDiscovery/lib/types';

/**
 * Social Discovery Config Repository
 * Handles database operations for discovery configurations
 */
export const discoveryConfigRepository = {
  /**
   * Get all configs for a project
   */
  getConfigsByProject: (projectId: string): DbDiscoveryConfig[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_discovery_configs
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDiscoveryConfig[];
  },

  /**
   * Get a config by ID
   */
  getConfigById: (id: string): DbDiscoveryConfig | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM social_discovery_configs WHERE id = ?');
    const config = stmt.get(id) as DbDiscoveryConfig | undefined;
    return config || null;
  },

  /**
   * Get active configs for a project
   */
  getActiveConfigs: (projectId: string): DbDiscoveryConfig[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM social_discovery_configs
      WHERE project_id = ? AND is_active = 1
      ORDER BY name
    `);
    return stmt.all(projectId) as DbDiscoveryConfig[];
  },

  /**
   * Create a new config
   */
  createConfig: (config: {
    id: string;
    project_id: string;
    name: string;
    channel: string;
    query: string;
  }): DbDiscoveryConfig => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO social_discovery_configs (
        id, project_id, name, channel, query,
        is_active, results_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
    `);

    stmt.run(
      config.id,
      config.project_id,
      config.name,
      config.channel,
      config.query,
      now,
      now
    );

    return discoveryConfigRepository.getConfigById(config.id)!;
  },

  /**
   * Update a config
   */
  updateConfig: (
    id: string,
    updates: Partial<Pick<DbDiscoveryConfig, 'name' | 'query' | 'is_active'>>
  ): DbDiscoveryConfig | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = ['updated_at = ?'];
    const values: (string | number)[] = [now];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.query !== undefined) {
      fields.push('query = ?');
      values.push(updates.query);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE social_discovery_configs
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return discoveryConfigRepository.getConfigById(id);
  },

  /**
   * Update search tracking
   */
  updateSearchTracking: (id: string, resultsCount: number): void => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE social_discovery_configs
      SET last_search_at = ?, results_count = results_count + ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, resultsCount, now, id);
  },

  /**
   * Delete a config
   */
  deleteConfig: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM social_discovery_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get config count for a project
   */
  getConfigCount: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM social_discovery_configs
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number };
    return result.count;
  },
};
