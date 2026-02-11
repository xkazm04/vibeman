/**
 * Migration 095: Persona Tool Usage Tracking
 * Records tool invocations per execution for usage analytics.
 */

import type { MigrationLogger } from './migration.utils';
import { createTableIfNotExists } from './migration.utils';

export function migrate095PersonaToolUsage(db: any, logger: MigrationLogger) {
  createTableIfNotExists(db, 'persona_tool_usage', `
    CREATE TABLE persona_tool_usage (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL REFERENCES persona_executions(id) ON DELETE CASCADE,
      persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      invocation_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `, logger);

  // Indexes for analytics queries
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_ptu_execution ON persona_tool_usage(execution_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_ptu_persona ON persona_tool_usage(persona_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_ptu_tool ON persona_tool_usage(tool_name)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_ptu_created ON persona_tool_usage(created_at)').run();
  } catch {
    // Indexes may already exist
  }

  logger.success('Migration 095 (persona_tool_usage) completed');
}
