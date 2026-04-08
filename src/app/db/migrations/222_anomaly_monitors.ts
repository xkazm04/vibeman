/**
 * Migration 222: Anomaly Monitors
 *
 * Creates tables for persistent, user-defined anomaly alert monitors.
 * Monitors define threshold rules (e.g., signal decay > 2σ, success rate < 60%)
 * that evaluate on each reflection cycle. Triggered events are surfaced in the
 * Brain dashboard with snooze and acknowledge actions.
 */

import type { DbConnection } from '../drivers/types';
import type { MigrationLogger } from './migration.utils';

export function migrate222AnomalyMonitors(db: DbConnection, logger: MigrationLogger) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anomaly_monitors (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      metric TEXT NOT NULL,
      condition TEXT NOT NULL CHECK (condition IN ('gt', 'lt', 'gte', 'lte', 'abs_gt')),
      threshold REAL NOT NULL,
      signal_type TEXT,
      context_id TEXT,
      cooldown_minutes INTEGER NOT NULL DEFAULT 60,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS anomaly_monitor_events (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL REFERENCES anomaly_monitors(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
      current_value REAL NOT NULL,
      threshold_value REAL NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'snoozed', 'resolved')),
      snoozed_until TEXT,
      acknowledged_at TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_anomaly_monitors_project ON anomaly_monitors(project_id, enabled);
    CREATE INDEX IF NOT EXISTS idx_anomaly_monitor_events_monitor ON anomaly_monitor_events(monitor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_anomaly_monitor_events_project_status ON anomaly_monitor_events(project_id, status, created_at DESC);
  `);

  logger.info('[Migration 222] Created anomaly_monitors and anomaly_monitor_events tables with indexes');
}
