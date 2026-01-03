/**
 * Migration 045: Integration Framework
 * Creates tables for external service integrations, event logging, and webhooks
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate045IntegrationFramework(db: Database.Database): void {
  // Skip if tables already exist
  if (tableExists(db, 'integrations') && tableExists(db, 'integration_events') && tableExists(db, 'webhooks')) {
    return;
  }

  // Create integrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'slack', 'discord', 'webhook', 'jira', 'linear', 'notion')),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
      config TEXT NOT NULL DEFAULT '{}',
      credentials TEXT,
      enabled_events TEXT NOT NULL DEFAULT '[]',
      last_sync_at TEXT,
      last_error TEXT,
      error_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for integrations
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_integrations_project_id
      ON integrations(project_id);
    CREATE INDEX IF NOT EXISTS idx_integrations_provider
      ON integrations(provider);
    CREATE INDEX IF NOT EXISTS idx_integrations_status
      ON integrations(status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_project_provider_name
      ON integrations(project_id, provider, name);
  `);

  // Create integration_events table for event logging
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_events (
      id TEXT PRIMARY KEY,
      integration_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
      response TEXT,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for integration_events
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_integration_events_integration_id
      ON integration_events(integration_id);
    CREATE INDEX IF NOT EXISTS idx_integration_events_project_id
      ON integration_events(project_id);
    CREATE INDEX IF NOT EXISTS idx_integration_events_event_type
      ON integration_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_integration_events_status
      ON integration_events(status);
    CREATE INDEX IF NOT EXISTS idx_integration_events_created_at
      ON integration_events(created_at DESC);
  `);

  // Create webhooks table for custom webhook configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      integration_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
      headers TEXT,
      secret TEXT,
      retry_on_failure INTEGER NOT NULL DEFAULT 1,
      max_retries INTEGER NOT NULL DEFAULT 3,
      timeout_ms INTEGER NOT NULL DEFAULT 30000,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for webhooks
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_webhooks_integration_id
      ON webhooks(integration_id);
    CREATE INDEX IF NOT EXISTS idx_webhooks_project_id
      ON webhooks(project_id);
  `);

  console.log('[Migration 045] Created integration framework tables (integrations, integration_events, webhooks)');
}
