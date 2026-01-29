/**
 * Migration 064: Drop Orphaned Tables
 *
 * Removes 21 tables from deprecated features:
 * - Hypothesis Testing (5 tables)
 * - Developer Mind-Meld (6 tables)
 * - Red Team (4 tables)
 * - Focus Mode (3 tables)
 * - Adaptive Learning (3 tables)
 *
 * These features were removed in v1.1 Dead Code Cleanup.
 */
import { getConnection } from '../drivers';

export function migrateDropOrphanedTables() {
  const db = getConnection();

  const tablesToDrop = [
    // Hypothesis Testing
    'hypotheses',
    'invariants',
    'fuzz_sessions',
    'property_tests',
    'test_knowledge',
    // Developer Mind-Meld
    'developer_profiles',
    'developer_decisions',
    'learning_insights',
    'code_pattern_usage',
    'consistency_rules',
    'skill_tracking',
    // Red Team
    'red_team_sessions',
    'red_team_attacks',
    'red_team_vulnerabilities',
    'vulnerability_debates',
    // Focus Mode
    'focus_sessions',
    'focus_breaks',
    'focus_stats',
    // Adaptive Learning
    'idea_execution_outcomes',
    'scoring_weights',
    'scoring_thresholds',
  ];

  for (const table of tablesToDrop) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    } catch (error) {
      // Table may not exist, that's fine
    }
  }
}
