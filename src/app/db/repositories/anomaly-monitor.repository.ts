/**
 * Anomaly Monitor Repository
 * CRUD operations for persistent anomaly monitors and their triggered events.
 */

import { getDatabase } from '../connection';
import {
  selectOne,
  selectAll,
  getCurrentTimestamp,
  generateId,
  withTableCheck,
} from './repository.utils';
import type {
  DbAnomalyMonitor,
  DbAnomalyMonitorEvent,
  CreateAnomalyMonitorInput,
  MonitorEventStatus,
} from '../models/brain.types';

const FEATURE = 'anomaly-monitors';

// ── Monitors ────────────────────────────────────────────────────────────────

function createMonitor(input: CreateAnomalyMonitorInput): DbAnomalyMonitor {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      INSERT INTO anomaly_monitors (id, project_id, name, description, enabled, metric, condition, threshold, signal_type, context_id, cooldown_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      input.id,
      input.project_id,
      input.name,
      input.description ?? null,
      input.metric,
      input.condition,
      input.threshold,
      input.signal_type ?? null,
      input.context_id ?? null,
      input.cooldown_minutes ?? 60,
      now,
      now,
    );
    return getMonitorById(input.id)!;
  });
}

function getMonitorById(id: string): DbAnomalyMonitor | null {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    return selectOne<DbAnomalyMonitor>(db, 'SELECT * FROM anomaly_monitors WHERE id = ?', id);
  });
}

function getMonitorsByProject(projectId: string): DbAnomalyMonitor[] {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    return selectAll<DbAnomalyMonitor>(
      db,
      'SELECT * FROM anomaly_monitors WHERE project_id = ? ORDER BY created_at DESC',
      projectId,
    );
  });
}

function getEnabledMonitorsByProject(projectId: string): DbAnomalyMonitor[] {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    return selectAll<DbAnomalyMonitor>(
      db,
      'SELECT * FROM anomaly_monitors WHERE project_id = ? AND enabled = 1 ORDER BY created_at DESC',
      projectId,
    );
  });
}

function updateMonitor(
  id: string,
  updates: Partial<Pick<DbAnomalyMonitor, 'name' | 'description' | 'enabled' | 'metric' | 'condition' | 'threshold' | 'signal_type' | 'context_id' | 'cooldown_minutes'>>,
): DbAnomalyMonitor | null {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return getMonitorById(id);

    const now = getCurrentTimestamp();
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE anomaly_monitors SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return getMonitorById(id);
  });
}

function deleteMonitor(id: string): boolean {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM anomaly_monitors WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

function setLastTriggered(id: string, timestamp: string): void {
  withTableCheck(FEATURE, () => {
    const db = getDatabase();
    db.prepare('UPDATE anomaly_monitors SET last_triggered_at = ?, updated_at = ? WHERE id = ?')
      .run(timestamp, getCurrentTimestamp(), id);
  });
}

// ── Events ──────────────────────────────────────────────────────────────────

function createEvent(
  monitorId: string,
  projectId: string,
  severity: 'info' | 'warning' | 'critical',
  currentValue: number,
  thresholdValue: number,
  message: string,
): DbAnomalyMonitorEvent {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const id = generateId('mevt');
    const now = getCurrentTimestamp();
    db.prepare(`
      INSERT INTO anomaly_monitor_events (id, monitor_id, project_id, severity, current_value, threshold_value, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'triggered', ?)
    `).run(id, monitorId, projectId, severity, currentValue, thresholdValue, message, now);
    return selectOne<DbAnomalyMonitorEvent>(db, 'SELECT * FROM anomaly_monitor_events WHERE id = ?', id)!;
  });
}

function getActiveEventsByProject(projectId: string): DbAnomalyMonitorEvent[] {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    return selectAll<DbAnomalyMonitorEvent>(
      db,
      `SELECT * FROM anomaly_monitor_events
       WHERE project_id = ?
         AND status IN ('triggered', 'snoozed')
         AND (snoozed_until IS NULL OR snoozed_until > datetime('now'))
       ORDER BY created_at DESC
       LIMIT 100`,
      projectId,
    );
  });
}

function getEventsByMonitor(monitorId: string, limit = 20): DbAnomalyMonitorEvent[] {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    return selectAll<DbAnomalyMonitorEvent>(
      db,
      'SELECT * FROM anomaly_monitor_events WHERE monitor_id = ? ORDER BY created_at DESC LIMIT ?',
      monitorId,
      limit,
    );
  });
}

function updateEventStatus(
  eventId: string,
  status: MonitorEventStatus,
  snoozeDurationMinutes?: number,
): DbAnomalyMonitorEvent | null {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const fields: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === 'acknowledged') {
      fields.push('acknowledged_at = ?');
      values.push(now);
    } else if (status === 'snoozed' && snoozeDurationMinutes) {
      const snoozeUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000).toISOString();
      fields.push('snoozed_until = ?');
      values.push(snoozeUntil);
    } else if (status === 'resolved') {
      fields.push('resolved_at = ?');
      values.push(now);
    }

    values.push(eventId);
    db.prepare(`UPDATE anomaly_monitor_events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return selectOne<DbAnomalyMonitorEvent>(db, 'SELECT * FROM anomaly_monitor_events WHERE id = ?', eventId);
  });
}

function resolveAllForMonitor(monitorId: string): number {
  return withTableCheck(FEATURE, () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const result = db.prepare(
      `UPDATE anomaly_monitor_events SET status = 'resolved', resolved_at = ? WHERE monitor_id = ? AND status IN ('triggered', 'snoozed')`,
    ).run(now, monitorId);
    return result.changes;
  });
}

export const anomalyMonitorRepository = {
  createMonitor,
  getMonitorById,
  getMonitorsByProject,
  getEnabledMonitorsByProject,
  updateMonitor,
  deleteMonitor,
  setLastTriggered,
  createEvent,
  getActiveEventsByProject,
  getEventsByMonitor,
  updateEventStatus,
  resolveAllForMonitor,
};
