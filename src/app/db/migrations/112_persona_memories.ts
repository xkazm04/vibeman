/**
 * Migration 112: Persona Memories
 *
 * Creates persona_memories table for agent knowledge storage
 * Agents store valuable notes, facts, decisions during execution
 */

import type { MigrationLogger } from './migration.utils';

export function migrate112PersonaMemories(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS persona_memories (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'fact',
        source_execution_id TEXT,
        importance INTEGER DEFAULT 3,
        tags TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    logger.info('[Migration 112] Created persona_memories table');
  } catch (e: any) {
    if (!e.message?.includes('already exists')) throw e;
    logger.info('[Migration 112] persona_memories table already exists');
  }

  // Indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_persona_memories_persona ON persona_memories(persona_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_persona_memories_category ON persona_memories(category)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_persona_memories_importance ON persona_memories(importance DESC)').run();
    logger.info('[Migration 112] Created persona_memories indexes');
  } catch (e: any) {
    logger.info('[Migration 112] Indexes already exist: ' + e.message);
  }
}
