/**
 * Migration 091: Persona UX Upgrades
 * - credential_events: Polling events tied to credentials
 * - persona_manual_reviews: Human review queue
 * - structured_prompt column on personas table
 */

import { createTableIfNotExists, addColumnIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate091PersonaUpgrades(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('personaUpgrades091', () => {
    // 1. Credential Events table
    const eventsCreated = createTableIfNotExists(db, 'credential_events', `
      CREATE TABLE IF NOT EXISTS credential_events (
        id TEXT PRIMARY KEY,
        credential_id TEXT NOT NULL,
        event_template_id TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_polled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (credential_id) REFERENCES persona_credentials(id) ON DELETE CASCADE
      );
    `, logger);

    if (eventsCreated) {
      logger?.info('Created credential_events table');
      // Create indexes
      try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_ce_credential ON credential_events(credential_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_ce_enabled ON credential_events(enabled)');
      } catch { /* indexes may already exist */ }
    }

    // 2. Persona Manual Reviews table
    const reviewsCreated = createTableIfNotExists(db, 'persona_manual_reviews', `
      CREATE TABLE IF NOT EXISTS persona_manual_reviews (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT NOT NULL DEFAULT 'info',
        context_data TEXT,
        suggested_actions TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewer_notes TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (execution_id) REFERENCES persona_executions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      );
    `, logger);

    if (reviewsCreated) {
      logger?.info('Created persona_manual_reviews table');
      try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_pmr_persona ON persona_manual_reviews(persona_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_pmr_status ON persona_manual_reviews(status)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_pmr_created ON persona_manual_reviews(created_at DESC)');
      } catch { /* indexes may already exist */ }
    }

    // 3. Add structured_prompt column to personas table
    addColumnIfNotExists(db, 'personas', 'structured_prompt', 'TEXT', logger);
  }, logger);
}
