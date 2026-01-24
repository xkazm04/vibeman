import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { DbXRayEvent } from '../models/types';

/**
 * Create input type for X-Ray events
 */
export interface CreateXRayEvent {
  api_call_id?: string | null;
  context_id?: string | null;
  context_group_id?: string | null;
  source_layer?: 'pages' | 'client' | 'server' | null;
  target_layer?: 'server' | 'external' | null;
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: number;
}

/**
 * X-Ray Event filters
 */
export interface XRayEventFilters {
  context_id?: string;
  context_group_id?: string;
  source_layer?: 'pages' | 'client' | 'server';
  target_layer?: 'server' | 'external';
  status_min?: number;
  status_max?: number;
  since?: number;
  limit?: number;
}

/**
 * X-Ray Statistics
 */
export interface XRayStats {
  total_events: number;
  by_layer: Record<string, number>;
  by_context: Array<{ context_id: string; count: number }>;
  avg_duration: number;
  error_count: number;
  error_rate: number;
}

/**
 * X-Ray Repository
 * Persists API traffic events with context mapping for real-time visualization
 */
export const xrayRepository = {
  /**
   * Log a new X-Ray event
   */
  logEvent: (data: CreateXRayEvent): DbXRayEvent => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO obs_xray_events (
        id, api_call_id, context_id, context_group_id,
        source_layer, target_layer, method, path, status, duration, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.api_call_id ?? null,
      data.context_id ?? null,
      data.context_group_id ?? null,
      data.source_layer ?? null,
      data.target_layer ?? null,
      data.method,
      data.path,
      data.status,
      data.duration,
      data.timestamp,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM obs_xray_events WHERE id = ?');
    return selectStmt.get(id) as DbXRayEvent;
  },

  /**
   * Get X-Ray event by ID
   */
  getById: (id: string): DbXRayEvent | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM obs_xray_events WHERE id = ?');
    return (stmt.get(id) as DbXRayEvent) || null;
  },

  /**
   * Get recent X-Ray events
   */
  getRecent: (limit: number = 100, since?: number): DbXRayEvent[] => {
    const db = getDatabase();

    if (since) {
      const stmt = db.prepare(`
        SELECT * FROM obs_xray_events
        WHERE timestamp > ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      return stmt.all(since, limit) as DbXRayEvent[];
    }

    const stmt = db.prepare(`
      SELECT * FROM obs_xray_events
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DbXRayEvent[];
  },

  /**
   * Get X-Ray events with filters
   */
  getFiltered: (filters: XRayEventFilters): DbXRayEvent[] => {
    const db = getDatabase();

    let query = 'SELECT * FROM obs_xray_events WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters.context_id) {
      query += ' AND context_id = ?';
      params.push(filters.context_id);
    }
    if (filters.context_group_id) {
      query += ' AND context_group_id = ?';
      params.push(filters.context_group_id);
    }
    if (filters.source_layer) {
      query += ' AND source_layer = ?';
      params.push(filters.source_layer);
    }
    if (filters.target_layer) {
      query += ' AND target_layer = ?';
      params.push(filters.target_layer);
    }
    if (filters.status_min !== undefined) {
      query += ' AND status >= ?';
      params.push(filters.status_min);
    }
    if (filters.status_max !== undefined) {
      query += ' AND status <= ?';
      params.push(filters.status_max);
    }
    if (filters.since !== undefined) {
      query += ' AND timestamp > ?';
      params.push(filters.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbXRayEvent[];
  },

  /**
   * Get X-Ray events by context ID
   */
  getByContextId: (contextId: string, limit: number = 100): DbXRayEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM obs_xray_events
      WHERE context_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(contextId, limit) as DbXRayEvent[];
  },

  /**
   * Get X-Ray events by context group ID
   */
  getByContextGroupId: (contextGroupId: string, limit: number = 100): DbXRayEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM obs_xray_events
      WHERE context_group_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(contextGroupId, limit) as DbXRayEvent[];
  },

  /**
   * Get X-Ray events with context and group details
   */
  getWithContextDetails: (limit: number = 100): Array<DbXRayEvent & {
    context_name: string | null;
    context_group_name: string | null;
  }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        xe.*,
        c.name as context_name,
        cg.name as context_group_name
      FROM obs_xray_events xe
      LEFT JOIN contexts c ON xe.context_id = c.id
      LEFT JOIN context_groups cg ON xe.context_group_id = cg.id
      ORDER BY xe.timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<DbXRayEvent & {
      context_name: string | null;
      context_group_name: string | null;
    }>;
  },

  /**
   * Get X-Ray statistics
   */
  getStats: (since?: number): XRayStats => {
    const db = getDatabase();

    let whereClause = '';
    const params: number[] = [];
    if (since) {
      whereClause = 'WHERE timestamp > ?';
      params.push(since);
    }

    // Total events and averages
    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total_events,
        AVG(duration) as avg_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count
      FROM obs_xray_events
      ${whereClause}
    `);
    const stats = statsStmt.get(...params) as {
      total_events: number;
      avg_duration: number;
      error_count: number;
    };

    // By layer
    const layerStmt = db.prepare(`
      SELECT target_layer, COUNT(*) as count
      FROM obs_xray_events
      ${whereClause}
      GROUP BY target_layer
    `);
    const layerCounts = layerStmt.all(...params) as Array<{ target_layer: string; count: number }>;
    const by_layer: Record<string, number> = {};
    for (const row of layerCounts) {
      by_layer[row.target_layer || 'unknown'] = row.count;
    }

    // By context (top 10)
    const contextStmt = db.prepare(`
      SELECT context_id, COUNT(*) as count
      FROM obs_xray_events
      ${whereClause ? whereClause + ' AND context_id IS NOT NULL' : 'WHERE context_id IS NOT NULL'}
      GROUP BY context_id
      ORDER BY count DESC
      LIMIT 10
    `);
    const by_context = contextStmt.all(...params) as Array<{ context_id: string; count: number }>;

    return {
      total_events: stats.total_events,
      by_layer,
      by_context,
      avg_duration: Math.round(stats.avg_duration || 0),
      error_count: stats.error_count,
      error_rate: stats.total_events > 0
        ? Math.round((stats.error_count / stats.total_events) * 10000) / 100
        : 0
    };
  },

  /**
   * Delete old X-Ray events (retention policy)
   */
  deleteOldEvents: (beforeTimestamp: number): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM obs_xray_events WHERE timestamp < ?');
    const result = stmt.run(beforeTimestamp);
    return result.changes;
  },

  /**
   * Clean up events older than specified days
   */
  cleanupOlderThan: (days: number = 7): number => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return xrayRepository.deleteOldEvents(cutoff);
  },

  /**
   * Delete all X-Ray events
   */
  deleteAll: (): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM obs_xray_events');
    const result = stmt.run();
    return result.changes;
  },

  /**
   * Count events
   */
  count: (since?: number): number => {
    const db = getDatabase();

    if (since) {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM obs_xray_events WHERE timestamp > ?');
      const result = stmt.get(since) as { count: number };
      return result.count;
    }

    const stmt = db.prepare('SELECT COUNT(*) as count FROM obs_xray_events');
    const result = stmt.get() as { count: number };
    return result.count;
  },

  /**
   * Get traffic between layers (for X-Ray visualization)
   */
  getLayerTraffic: (since?: number): Array<{
    source_layer: string | null;
    target_layer: string | null;
    count: number;
    avg_duration: number;
    error_count: number;
  }> => {
    const db = getDatabase();

    let whereClause = '';
    const params: number[] = [];
    if (since) {
      whereClause = 'WHERE timestamp > ?';
      params.push(since);
    }

    const stmt = db.prepare(`
      SELECT
        source_layer,
        target_layer,
        COUNT(*) as count,
        ROUND(AVG(duration), 0) as avg_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count
      FROM obs_xray_events
      ${whereClause}
      GROUP BY source_layer, target_layer
      ORDER BY count DESC
    `);

    return stmt.all(...params) as Array<{
      source_layer: string | null;
      target_layer: string | null;
      count: number;
      avg_duration: number;
      error_count: number;
    }>;
  },

  /**
   * Get traffic between contexts (for detailed X-Ray visualization)
   */
  getContextTraffic: (since?: number, limit: number = 20): Array<{
    context_id: string;
    context_name: string | null;
    target_layer: string | null;
    count: number;
    avg_duration: number;
    error_rate: number;
  }> => {
    const db = getDatabase();

    let whereClause = 'WHERE xe.context_id IS NOT NULL';
    const params: (number | undefined)[] = [];
    if (since) {
      whereClause += ' AND xe.timestamp > ?';
      params.push(since);
    }

    const stmt = db.prepare(`
      SELECT
        xe.context_id,
        c.name as context_name,
        xe.target_layer,
        COUNT(*) as count,
        ROUND(AVG(xe.duration), 0) as avg_duration,
        ROUND(CAST(SUM(CASE WHEN xe.status >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as error_rate
      FROM obs_xray_events xe
      LEFT JOIN contexts c ON xe.context_id = c.id
      ${whereClause}
      GROUP BY xe.context_id, xe.target_layer
      ORDER BY count DESC
      LIMIT ?
    `);
    params.push(limit);

    return stmt.all(...params) as Array<{
      context_id: string;
      context_name: string | null;
      target_layer: string | null;
      count: number;
      avg_duration: number;
      error_rate: number;
    }>;
  }
};
