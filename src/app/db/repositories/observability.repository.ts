import { getDatabase } from '../connection';
import { getHotWritesDatabase } from '../hot-writes';
import { v4 as uuidv4 } from 'uuid';
import {
  DbObsApiCall,
  DbObsEndpointStats,
  DbObsConfig,
  CreateObsApiCall,
  CreateObsEndpointStats,
  UpdateObsEndpointStats,
  CreateObsConfig,
  UpdateObsConfig,
  ObsEndpointSummary,
  ObsConfigResponse
} from '../models/observability.types';

/**
 * Observability Repository
 * Handles API endpoint usage tracking and statistics
 */
export const observabilityRepository = {
  // ===== API Calls =====

  /**
   * Log a single API call (writes to hot-writes DB for reduced contention)
   */
  logApiCall: (data: CreateObsApiCall): DbObsApiCall => {
    const hotDb = getHotWritesDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const calledAt = data.called_at || now;

    const stmt = hotDb.prepare(`
      INSERT INTO obs_api_calls (
        id, project_id, endpoint, method, status_code, response_time_ms,
        request_size_bytes, response_size_bytes, user_agent, error_message,
        called_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.endpoint,
      data.method,
      data.status_code ?? null,
      data.response_time_ms ?? null,
      data.request_size_bytes ?? null,
      data.response_size_bytes ?? null,
      data.user_agent ?? null,
      data.error_message ?? null,
      calledAt,
      now
    );

    const selectStmt = hotDb.prepare('SELECT * FROM obs_api_calls WHERE id = ?');
    return selectStmt.get(id) as DbObsApiCall;
  },

  /**
   * Get API calls for an endpoint within a date range (reads from hot-writes DB)
   */
  getApiCallsByEndpoint: (
    projectId: string,
    endpoint: string,
    startDate?: string,
    endDate?: string
  ): DbObsApiCall[] => {
    const db = getHotWritesDatabase();
    let query = `
      SELECT * FROM obs_api_calls
      WHERE project_id = ? AND endpoint = ?
    `;
    const params: (string | undefined)[] = [projectId, endpoint];

    if (startDate) {
      query += ' AND called_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND called_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY called_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbObsApiCall[];
  },

  /**
   * Get recent API calls for a project (reads from hot-writes DB)
   */
  getRecentApiCalls: (projectId: string, limit: number = 100): DbObsApiCall[] => {
    const db = getHotWritesDatabase();
    const stmt = db.prepare(`
      SELECT * FROM obs_api_calls
      WHERE project_id = ?
      ORDER BY called_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbObsApiCall[];
  },

  /**
   * Delete old API call logs (for cleanup, deletes from hot-writes DB)
   */
  deleteOldApiCalls: (projectId: string, beforeDate: string): number => {
    const db = getHotWritesDatabase();
    const stmt = db.prepare(`
      DELETE FROM obs_api_calls
      WHERE project_id = ? AND called_at < ?
    `);
    const result = stmt.run(projectId, beforeDate);
    return result.changes;
  },

  // ===== Endpoint Stats =====

  /**
   * Get or create endpoint stats for a time period
   */
  upsertEndpointStats: (data: CreateObsEndpointStats): DbObsEndpointStats => {
    const db = getDatabase();

    // Check if stats exist for this period
    const existingStmt = db.prepare(`
      SELECT * FROM obs_endpoint_stats
      WHERE project_id = ? AND endpoint = ? AND method = ? AND period_start = ?
    `);
    const existing = existingStmt.get(
      data.project_id,
      data.endpoint,
      data.method,
      data.period_start
    ) as DbObsEndpointStats | undefined;

    if (existing) {
      // Update existing stats
      const updateStmt = db.prepare(`
        UPDATE obs_endpoint_stats
        SET call_count = call_count + ?,
            avg_response_time_ms = ((avg_response_time_ms * call_count) + ?) / (call_count + 1),
            max_response_time_ms = MAX(COALESCE(max_response_time_ms, 0), ?),
            error_count = error_count + ?,
            total_request_bytes = total_request_bytes + ?,
            total_response_bytes = total_response_bytes + ?
        WHERE id = ?
      `);
      updateStmt.run(
        data.call_count,
        data.avg_response_time_ms ?? 0,
        data.max_response_time_ms ?? 0,
        data.error_count ?? 0,
        data.total_request_bytes ?? 0,
        data.total_response_bytes ?? 0,
        existing.id
      );

      const selectStmt = db.prepare('SELECT * FROM obs_endpoint_stats WHERE id = ?');
      return selectStmt.get(existing.id) as DbObsEndpointStats;
    }

    // Create new stats
    const id = uuidv4();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO obs_endpoint_stats (
        id, project_id, endpoint, method, period_start, period_end,
        call_count, avg_response_time_ms, max_response_time_ms,
        error_count, total_request_bytes, total_response_bytes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      data.project_id,
      data.endpoint,
      data.method,
      data.period_start,
      data.period_end,
      data.call_count,
      data.avg_response_time_ms ?? null,
      data.max_response_time_ms ?? null,
      data.error_count ?? 0,
      data.total_request_bytes ?? 0,
      data.total_response_bytes ?? 0,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM obs_endpoint_stats WHERE id = ?');
    return selectStmt.get(id) as DbObsEndpointStats;
  },

  /**
   * Get endpoint stats for a project within a date range
   */
  getEndpointStats: (
    projectId: string,
    startDate?: string,
    endDate?: string
  ): DbObsEndpointStats[] => {
    const db = getDatabase();
    let query = `
      SELECT * FROM obs_endpoint_stats
      WHERE project_id = ?
    `;
    const params: (string | undefined)[] = [projectId];

    if (startDate) {
      query += ' AND period_start >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND period_end <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY period_start DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbObsEndpointStats[];
  },

  /**
   * Get aggregated endpoint summary with totals
   */
  getEndpointSummary: (projectId: string, days: number = 7): ObsEndpointSummary[] => {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(`
      SELECT
        endpoint,
        method,
        SUM(call_count) as total_calls,
        ROUND(AVG(avg_response_time_ms), 2) as avg_response_time_ms,
        MAX(max_response_time_ms) as max_response_time_ms,
        SUM(error_count) as error_count,
        ROUND(CAST(SUM(error_count) AS REAL) / NULLIF(SUM(call_count), 0) * 100, 2) as error_rate,
        MAX(period_end) as last_called_at
      FROM obs_endpoint_stats
      WHERE project_id = ? AND period_start >= ?
      GROUP BY endpoint, method
      ORDER BY total_calls DESC
    `);

    return stmt.all(projectId, startDate.toISOString()) as ObsEndpointSummary[];
  },

  /**
   * Get top N most used endpoints
   */
  getTopEndpoints: (projectId: string, limit: number = 10, days: number = 7): ObsEndpointSummary[] => {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(`
      SELECT
        endpoint,
        method,
        SUM(call_count) as total_calls,
        ROUND(AVG(avg_response_time_ms), 2) as avg_response_time_ms,
        MAX(max_response_time_ms) as max_response_time_ms,
        SUM(error_count) as error_count,
        ROUND(CAST(SUM(error_count) AS REAL) / NULLIF(SUM(call_count), 0) * 100, 2) as error_rate,
        MAX(period_end) as last_called_at
      FROM obs_endpoint_stats
      WHERE project_id = ? AND period_start >= ?
      GROUP BY endpoint, method
      ORDER BY total_calls DESC
      LIMIT ?
    `);

    return stmt.all(projectId, startDate.toISOString(), limit) as ObsEndpointSummary[];
  },

  /**
   * Get endpoints with highest error rates
   */
  getHighErrorEndpoints: (projectId: string, minErrorRate: number = 5, days: number = 7): ObsEndpointSummary[] => {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(`
      SELECT
        endpoint,
        method,
        SUM(call_count) as total_calls,
        ROUND(AVG(avg_response_time_ms), 2) as avg_response_time_ms,
        MAX(max_response_time_ms) as max_response_time_ms,
        SUM(error_count) as error_count,
        ROUND(CAST(SUM(error_count) AS REAL) / NULLIF(SUM(call_count), 0) * 100, 2) as error_rate,
        MAX(period_end) as last_called_at
      FROM obs_endpoint_stats
      WHERE project_id = ? AND period_start >= ?
      GROUP BY endpoint, method
      HAVING error_rate >= ?
      ORDER BY error_rate DESC
    `);

    return stmt.all(projectId, startDate.toISOString(), minErrorRate) as ObsEndpointSummary[];
  },

  /**
   * Get usage trends (comparing current period to previous)
   */
  getUsageTrends: (projectId: string, days: number = 7): Array<{
    endpoint: string;
    method: string;
    current_calls: number;
    previous_calls: number;
    direction: 'increasing' | 'decreasing' | 'stable';
    change_percent: number;
  }> => {
    const db = getDatabase();
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - days);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const stmt = db.prepare(`
      WITH current_period AS (
        SELECT endpoint, method, SUM(call_count) as calls
        FROM obs_endpoint_stats
        WHERE project_id = ? AND period_start >= ?
        GROUP BY endpoint, method
      ),
      previous_period AS (
        SELECT endpoint, method, SUM(call_count) as calls
        FROM obs_endpoint_stats
        WHERE project_id = ? AND period_start >= ? AND period_start < ?
        GROUP BY endpoint, method
      )
      SELECT
        COALESCE(c.endpoint, p.endpoint) as endpoint,
        COALESCE(c.method, p.method) as method,
        COALESCE(c.calls, 0) as current_calls,
        COALESCE(p.calls, 0) as previous_calls,
        CASE
          WHEN COALESCE(p.calls, 0) = 0 THEN 'increasing'
          WHEN COALESCE(c.calls, 0) = 0 THEN 'decreasing'
          WHEN c.calls > p.calls * 1.1 THEN 'increasing'
          WHEN c.calls < p.calls * 0.9 THEN 'decreasing'
          ELSE 'stable'
        END as direction,
        CASE
          WHEN COALESCE(p.calls, 0) = 0 THEN 100
          ELSE ROUND((CAST(COALESCE(c.calls, 0) - COALESCE(p.calls, 0) AS REAL) / p.calls) * 100, 1)
        END as change_percent
      FROM current_period c
      FULL OUTER JOIN previous_period p ON c.endpoint = p.endpoint AND c.method = p.method
      ORDER BY ABS(change_percent) DESC
    `);

    return stmt.all(
      projectId,
      currentStart.toISOString(),
      projectId,
      previousStart.toISOString(),
      currentStart.toISOString()
    ) as Array<{
      endpoint: string;
      method: string;
      current_calls: number;
      previous_calls: number;
      direction: 'increasing' | 'decreasing' | 'stable';
      change_percent: number;
    }>;
  },

  /**
   * Aggregate raw API calls into hourly stats.
   * Reads from hot-writes DB, writes rollups to main DB.
   */
  aggregateHourlyStats: (projectId: string): number => {
    const hotDb = getHotWritesDatabase();

    // Get unprocessed calls from hot-writes DB
    const callsStmt = hotDb.prepare(`
      SELECT
        endpoint,
        method,
        strftime('%Y-%m-%dT%H:00:00', called_at) as hour_bucket,
        COUNT(*) as call_count,
        AVG(response_time_ms) as avg_response_time_ms,
        MAX(response_time_ms) as max_response_time_ms,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(COALESCE(request_size_bytes, 0)) as total_request_bytes,
        SUM(COALESCE(response_size_bytes, 0)) as total_response_bytes
      FROM obs_api_calls
      WHERE project_id = ?
      GROUP BY endpoint, method, hour_bucket
    `);

    const aggregates = callsStmt.all(projectId) as Array<{
      endpoint: string;
      method: string;
      hour_bucket: string;
      call_count: number;
      avg_response_time_ms: number;
      max_response_time_ms: number;
      error_count: number;
      total_request_bytes: number;
      total_response_bytes: number;
    }>;

    let upsertCount = 0;
    for (const agg of aggregates) {
      const periodEnd = new Date(agg.hour_bucket);
      periodEnd.setHours(periodEnd.getHours() + 1);

      observabilityRepository.upsertEndpointStats({
        project_id: projectId,
        endpoint: agg.endpoint,
        method: agg.method,
        period_start: agg.hour_bucket,
        period_end: periodEnd.toISOString(),
        call_count: agg.call_count,
        avg_response_time_ms: agg.avg_response_time_ms,
        max_response_time_ms: agg.max_response_time_ms,
        error_count: agg.error_count,
        total_request_bytes: agg.total_request_bytes,
        total_response_bytes: agg.total_response_bytes
      });
      upsertCount++;
    }

    return upsertCount;
  },

  // ===== Configuration =====

  /**
   * Get observability config for a project
   */
  getConfig: (projectId: string): ObsConfigResponse | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM obs_config WHERE project_id = ?');
    const config = stmt.get(projectId) as DbObsConfig | undefined;

    if (!config) return null;

    return {
      ...config,
      enabled: config.enabled === 1,
      endpoints_to_track: config.endpoints_to_track
        ? JSON.parse(config.endpoints_to_track)
        : null
    };
  },

  /**
   * Create observability config for a project
   */
  createConfig: (data: CreateObsConfig): ObsConfigResponse => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO obs_config (
        id, project_id, enabled, provider, sentry_dsn,
        sample_rate, endpoints_to_track, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.enabled !== false ? 1 : 0,
      data.provider || 'local',
      data.sentry_dsn ?? null,
      data.sample_rate ?? 1.0,
      data.endpoints_to_track ? JSON.stringify(data.endpoints_to_track) : null,
      now
    );

    return observabilityRepository.getConfig(data.project_id)!;
  },

  /**
   * Update observability config
   */
  updateConfig: (projectId: string, data: UpdateObsConfig): ObsConfigResponse | null => {
    const db = getDatabase();
    const existing = observabilityRepository.getConfig(projectId);

    if (!existing) return null;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(data.enabled ? 1 : 0);
    }
    if (data.provider !== undefined) {
      updates.push('provider = ?');
      params.push(data.provider);
    }
    if (data.sentry_dsn !== undefined) {
      updates.push('sentry_dsn = ?');
      params.push(data.sentry_dsn);
    }
    if (data.sample_rate !== undefined) {
      updates.push('sample_rate = ?');
      params.push(data.sample_rate);
    }
    if (data.endpoints_to_track !== undefined) {
      updates.push('endpoints_to_track = ?');
      params.push(data.endpoints_to_track ? JSON.stringify(data.endpoints_to_track) : null);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(projectId);

    const stmt = db.prepare(`
      UPDATE obs_config
      SET ${updates.join(', ')}
      WHERE project_id = ?
    `);

    stmt.run(...params);

    return observabilityRepository.getConfig(projectId);
  },

  /**
   * Delete observability config and all related data
   */
  deleteConfig: (projectId: string): boolean => {
    const db = getDatabase();
    const hotDb = getHotWritesDatabase();

    // Delete calls from hot-writes DB
    hotDb.prepare('DELETE FROM obs_api_calls WHERE project_id = ?').run(projectId);
    // Delete stats and config from main DB
    db.prepare('DELETE FROM obs_endpoint_stats WHERE project_id = ?').run(projectId);
    const result = db.prepare('DELETE FROM obs_config WHERE project_id = ?').run(projectId);

    return result.changes > 0;
  },

  // ===== Dashboard Stats =====

  /**
   * Get overall stats for dashboard
   */
  getDashboardStats: (projectId: string, days: number = 7): {
    total_calls: number;
    unique_endpoints: number;
    avg_response_time_ms: number;
    total_errors: number;
    error_rate: number;
  } => {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(`
      SELECT
        COALESCE(SUM(call_count), 0) as total_calls,
        COUNT(DISTINCT endpoint) as unique_endpoints,
        ROUND(AVG(avg_response_time_ms), 2) as avg_response_time_ms,
        COALESCE(SUM(error_count), 0) as total_errors
      FROM obs_endpoint_stats
      WHERE project_id = ? AND period_start >= ?
    `);

    const result = stmt.get(projectId, startDate.toISOString()) as {
      total_calls: number;
      unique_endpoints: number;
      avg_response_time_ms: number;
      total_errors: number;
    };

    return {
      ...result,
      error_rate: result.total_calls > 0
        ? Math.round((result.total_errors / result.total_calls) * 10000) / 100
        : 0
    };
  },

  /**
   * Check if a project has observability data
   */
  hasData: (projectId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM obs_endpoint_stats WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number };
    return result.count > 0;
  }
};
