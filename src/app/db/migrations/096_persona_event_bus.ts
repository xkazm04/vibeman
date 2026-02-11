/**
 * Migration 096: Persona Event Bus
 * Central event pipeline with subscriptions for webhooks, inter-persona actions,
 * and execution lifecycle events.
 */

import type { MigrationLogger } from './migration.utils';
import { createTableIfNotExists, addColumnIfNotExists } from './migration.utils';

export function migrate096PersonaEventBus(db: any, logger: MigrationLogger) {
  // Table 1: Event log
  createTableIfNotExists(db, 'persona_events', `
    CREATE TABLE persona_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      event_type TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      target_persona_id TEXT,
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL
    )
  `, logger);

  // Table 2: Event subscriptions
  createTableIfNotExists(db, 'persona_event_subscriptions', `
    CREATE TABLE persona_event_subscriptions (
      id TEXT PRIMARY KEY,
      persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      source_filter TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `, logger);

  // Indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pev_status ON persona_events(status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pev_project ON persona_events(project_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pev_type ON persona_events(event_type)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pev_target ON persona_events(target_persona_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pev_created ON persona_events(created_at DESC)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pes_persona ON persona_event_subscriptions(persona_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pes_event_type ON persona_event_subscriptions(event_type)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_pes_enabled ON persona_event_subscriptions(enabled)').run();
  } catch {
    // Indexes may already exist
  }

  // Add project_id column to personas table
  addColumnIfNotExists(db, 'personas', 'project_id', "TEXT NOT NULL DEFAULT 'default'", logger);

  logger.success('Migration 096 (persona_event_bus) completed');
}
