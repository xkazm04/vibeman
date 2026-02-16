/**
 * Persona Metrics Repository
 * Manages metrics snapshots for observability dashboard
 */

import { getConnection } from '../drivers';

function generateId(): string {
  return 'pmet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const personaMetricsRepository = {
  createSnapshot(data: {
    persona_id: string;
    snapshot_date: string;
    total_executions?: number;
    successful_executions?: number;
    failed_executions?: number;
    total_cost_usd?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    avg_duration_ms?: number;
    tools_used?: string[];
    events_emitted?: number;
    events_consumed?: number;
    messages_sent?: number;
  }) {
    const db = getConnection();
    const id = generateId();
    db.prepare(`
      INSERT INTO persona_metrics_snapshots (id, persona_id, snapshot_date, total_executions, successful_executions, failed_executions, total_cost_usd, total_input_tokens, total_output_tokens, avg_duration_ms, tools_used, events_emitted, events_consumed, messages_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.persona_id,
      data.snapshot_date,
      data.total_executions ?? 0,
      data.successful_executions ?? 0,
      data.failed_executions ?? 0,
      data.total_cost_usd ?? 0,
      data.total_input_tokens ?? 0,
      data.total_output_tokens ?? 0,
      data.avg_duration_ms ?? 0,
      data.tools_used ? JSON.stringify(data.tools_used) : null,
      data.events_emitted ?? 0,
      data.events_consumed ?? 0,
      data.messages_sent ?? 0
    );
    return id;
  },

  getSnapshots(personaId?: string, startDate?: string, endDate?: string) {
    const db = getConnection();
    let sql = 'SELECT * FROM persona_metrics_snapshots WHERE 1=1';
    const params: (string | number | boolean | null)[] = [];
    if (personaId) { sql += ' AND persona_id = ?'; params.push(personaId); }
    if (startDate) { sql += ' AND snapshot_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND snapshot_date <= ?'; params.push(endDate); }
    sql += ' ORDER BY snapshot_date DESC';
    return db.prepare(sql).all(...params) as Record<string, unknown>[];
  },

  getAggregated(startDate?: string, endDate?: string) {
    const db = getConnection();
    let sql = `
      SELECT
        persona_id,
        SUM(total_executions) as total_executions,
        SUM(successful_executions) as successful_executions,
        SUM(failed_executions) as failed_executions,
        SUM(total_cost_usd) as total_cost_usd,
        SUM(total_input_tokens) as total_input_tokens,
        SUM(total_output_tokens) as total_output_tokens,
        AVG(avg_duration_ms) as avg_duration_ms,
        SUM(events_emitted) as events_emitted,
        SUM(events_consumed) as events_consumed,
        SUM(messages_sent) as messages_sent
      FROM persona_metrics_snapshots
      WHERE 1=1
    `;
    const params: (string | number | boolean | null)[] = [];
    if (startDate) { sql += ' AND snapshot_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND snapshot_date <= ?'; params.push(endDate); }
    sql += ' GROUP BY persona_id';
    return db.prepare(sql).all(...params) as Record<string, unknown>[];
  },

  /** Get live metrics by querying execution data directly */
  getLiveMetrics(personaId?: string, days: number = 30) {
    const db = getConnection();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    let sql = `
      SELECT
        pe.persona_id,
        p.name as persona_name,
        p.icon as persona_icon,
        p.color as persona_color,
        COUNT(*) as total_executions,
        SUM(CASE WHEN pe.status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN pe.status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
        COALESCE(SUM(pe.cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(pe.input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(pe.output_tokens), 0) as total_output_tokens,
        COALESCE(AVG(pe.duration_ms), 0) as avg_duration_ms,
        DATE(pe.created_at) as execution_date
      FROM persona_executions pe
      LEFT JOIN personas p ON pe.persona_id = p.id
      WHERE pe.created_at >= ?
    `;
    const params: (string | number | boolean | null)[] = [cutoff];
    if (personaId) { sql += ' AND pe.persona_id = ?'; params.push(personaId); }
    sql += ' GROUP BY pe.persona_id, DATE(pe.created_at) ORDER BY execution_date DESC';
    return db.prepare(sql).all(...params) as Record<string, unknown>[];
  },

  /** Get summary totals across all personas */
  getSummary(days: number = 30) {
    const db = getConnection();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const row = db.prepare(`
      SELECT
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
        COALESCE(SUM(cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COALESCE(AVG(duration_ms), 0) as avg_duration_ms
      FROM persona_executions
      WHERE created_at >= ?
    `).get(cutoff) as Record<string, unknown>;

    const activePersonas = db.prepare(`
      SELECT COUNT(DISTINCT persona_id) as count FROM persona_executions WHERE created_at >= ?
    `).get(cutoff) as Record<string, unknown>;

    return { ...row, active_personas: (activePersonas?.count as number) ?? 0 };
  },
};
