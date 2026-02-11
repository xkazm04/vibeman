/**
 * Migration 093: Persona Messages & Notification Channels
 * Creates persona_messages and persona_message_deliveries tables.
 * Adds notification_channels column to personas table.
 */

import { createTableIfNotExists, addColumnIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate093PersonaMessages(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('persona_messages', () => {
    // Create persona_messages table
    const createdMessages = createTableIfNotExists(db, 'persona_messages', `
      CREATE TABLE IF NOT EXISTS persona_messages (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        execution_id TEXT,
        title TEXT,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        priority TEXT NOT NULL DEFAULT 'normal',
        is_read INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT
      )
    `);

    if (createdMessages) {
      logger?.info('Created persona_messages table');
      try {
        db.prepare('CREATE INDEX IF NOT EXISTS idx_pmsg_persona ON persona_messages(persona_id)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_pmsg_is_read ON persona_messages(is_read)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_pmsg_created ON persona_messages(created_at DESC)').run();
        logger?.info('Created persona_messages indexes');
      } catch {
        // Indexes may already exist
      }
    }

    // Create persona_message_deliveries table
    const createdDeliveries = createTableIfNotExists(db, 'persona_message_deliveries', `
      CREATE TABLE IF NOT EXISTS persona_message_deliveries (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        channel_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        external_id TEXT,
        delivered_at TEXT,
        created_at TEXT NOT NULL
      )
    `);

    if (createdDeliveries) {
      logger?.info('Created persona_message_deliveries table');
      try {
        db.prepare('CREATE INDEX IF NOT EXISTS idx_pmd_message ON persona_message_deliveries(message_id)').run();
        logger?.info('Created persona_message_deliveries indexes');
      } catch {
        // Indexes may already exist
      }
    }

    // Add notification_channels column to personas table
    addColumnIfNotExists(db, 'personas', 'notification_channels', 'TEXT', logger);
  }, logger);
}
