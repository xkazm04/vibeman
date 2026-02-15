/**
 * Migration 099: Add use_case_flows column to persona_design_reviews
 *
 * Stores extracted use case flow graphs (JSON UseCaseFlow[]) for
 * activity diagram visualization in the Agentic Templates UI.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate099ReviewUseCaseFlows(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown } },
  logger: MigrationLogger
) {
  try {
    db.prepare(`ALTER TABLE persona_design_reviews ADD COLUMN use_case_flows TEXT`).run();
    logger.info('[099] Added use_case_flows column to persona_design_reviews');
  } catch {
    // Column already exists
  }

  logger.info('[099] Review use case flows migration complete');
}
