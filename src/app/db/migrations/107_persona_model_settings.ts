/**
 * Migration 107: Persona Model Settings
 *
 * Adds multi-model execution support and design context storage:
 * - personas: model_profile, max_budget_usd, max_turns, design_context
 * - persona_executions: model_used, input_tokens, output_tokens, cost_usd
 */

import type { MigrationLogger } from './migration.utils';

export function migrate107PersonaModelSettings(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  // personas table additions
  const personaColumns = [
    { sql: 'ALTER TABLE personas ADD COLUMN model_profile TEXT', name: 'model_profile' },
    { sql: 'ALTER TABLE personas ADD COLUMN max_budget_usd REAL', name: 'max_budget_usd' },
    { sql: 'ALTER TABLE personas ADD COLUMN max_turns INTEGER', name: 'max_turns' },
    { sql: 'ALTER TABLE personas ADD COLUMN design_context TEXT', name: 'design_context' },
  ];

  for (const col of personaColumns) {
    try {
      db.prepare(col.sql).run();
      logger.info(`[Migration 107] Added ${col.name} column to personas`);
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) throw e;
      logger.info(`[Migration 107] ${col.name} column already exists`);
    }
  }

  // persona_executions table additions
  const executionColumns = [
    { sql: 'ALTER TABLE persona_executions ADD COLUMN model_used TEXT', name: 'model_used' },
    { sql: 'ALTER TABLE persona_executions ADD COLUMN input_tokens INTEGER DEFAULT 0', name: 'input_tokens' },
    { sql: 'ALTER TABLE persona_executions ADD COLUMN output_tokens INTEGER DEFAULT 0', name: 'output_tokens' },
    { sql: 'ALTER TABLE persona_executions ADD COLUMN cost_usd REAL DEFAULT 0', name: 'cost_usd' },
  ];

  for (const col of executionColumns) {
    try {
      db.prepare(col.sql).run();
      logger.info(`[Migration 107] Added ${col.name} column to persona_executions`);
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) throw e;
      logger.info(`[Migration 107] ${col.name} column already exists`);
    }
  }
}
