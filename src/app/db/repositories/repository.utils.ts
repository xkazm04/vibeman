/**
 * Repository Utilities
 * Shared helper functions for repository operations
 */

import type { Database, Statement } from 'better-sqlite3';
import { parseJsonArray } from '@/lib/json-utils';

/**
 * Compile-time whitelist of valid table names.
 * Only tables listed here can be used with buildUpdateStatement.
 * Add new table names here when creating new repositories that need dynamic updates.
 */
const VALID_TABLE_NAMES = [
  'agent_goals',
  'agent_steps',
  'annette_audio_cache',
  'annette_knowledge_edges',
  'annette_knowledge_nodes',
  'annette_memories',
  'annette_memory_consolidations',
  'annette_memory_topics',
  'annette_messages',
  'annette_rapport',
  'annette_sessions',
  'annette_user_preferences',
  'architecture_drifts',
  'architecture_edges',
  'architecture_ideals',
  'architecture_nodes',
  'architecture_suggestions',
  'architecture_snapshots',
  'badges',
  'behavioral_signals',
  'brain_insights',
  'brain_reflections',
  'code_pattern_usage',
  'code_walkthroughs',
  'collection_patterns',
  'collective_memory_applications',
  'collective_memory_entries',
  'community_security_scores',
  'consistency_rules',
  'context_api_routes',
  'context_group_relationships',
  'context_groups',
  'context_transitions',
  'contexts',
  'cross_project_relationships',
  'cross_task_plans',
  'developer_decisions',
  'developer_profiles',
  'direction_outcomes',
  'direction_preference_profiles',
  'directions',
  'discovered_templates',
  'events',
  'execution_flows',
  'feature_interactions',
  'file_watch_config',
  'file_write_queue',
  'fuzz_sessions',
  'generation_history',
  'goal_candidates',
  'goal_lifecycle',
  'goal_signals',
  'goal_sub_goals',
  'goals',
  'group_health_scans',
  'hall_of_fame_stars',
  'health_score_config',
  'hypotheses',
  'idea_dependencies',
  'idea_execution_outcomes',
  'ideas',
  'implementation_log',
  'impact_predictions',
  'insight_effectiveness_cache',
  'insight_influence_log',
  'integration',
  'integrations',
  'intent_predictions',
  'invariants',
  'learning_insights',
  'learning_metrics',
  'learning_modules',
  'learning_paths',
  'lifecycle_configs',
  'lifecycle_cycles',
  'lifecycle_events',
  'marketplace_users',
  'onboarding_recommendations',
  'pattern_applications',
  'pattern_collections',
  'pattern_favorites',
  'pattern_ratings',
  'pattern_versions',
  'pending_approvals',
  'persona_metrics_snapshots',
  'persona_prompt_versions',
  'project_architecture_metadata',
  'project_health',
  'property_tests',
  'query_patterns',
  'questions',
  'quiz_questions',
  'quiz_responses',
  'red_team_attacks',
  'red_team_sessions',
  'red_team_vulnerabilities',
  'refactoring_patterns',
  'roadmap_milestones',
  'roadmap_simulations',
  'scan_notifications',
  'saved_views',
  'scan_profiles',
  'scan_results',
  'scan_queue',
  'scans',
  'schema_optimization_history',
  'schema_recommendations',
  'scoring_thresholds',
  'scoring_weights',
  'security_alerts',
  'security_intelligence',
  'sessions',
  'skill_tracking',
  'stale_branches',
  'standup_summaries',
  'strategic_initiatives',
  'tech_debt',
  'terminal_messages',
  'terminal_sessions',
  'test_knowledge',
  'triage_rules',
  'velocity_tracking',
  'voicebot_analytics',
  'kb_entry_links',
  'knowledge_entries',
  'vulnerability_debates',
  'workspace',
] as const;

export type TableName = (typeof VALID_TABLE_NAMES)[number];

const VALID_TABLE_SET: ReadonlySet<string> = new Set(VALID_TABLE_NAMES);

/** Safe SQL identifier: letters, digits, underscores; must start with letter or underscore */
const SAFE_SQL_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Build dynamic update query
 * Reduces duplication in repository update methods.
 * Column names are validated against a safe identifier pattern to prevent SQL injection.
 */
export function buildUpdateQuery<T extends Record<string, unknown>>(
  updates: T,
  excludeFields: string[] = ['id', 'created_at']
): { fields: string[]; values: unknown[] } {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (!excludeFields.includes(key) && value !== undefined) {
      if (!SAFE_SQL_IDENTIFIER_RE.test(key)) {
        throw new Error(`buildUpdateQuery: invalid column name "${key}"`);
      }
      fields.push(`${key} = ?`);
      values.push(value === undefined ? null : value);
    }
  });

  return { fields, values };
}

/**
 * Execute a single select query and return first result or null
 */
export function selectOne<T>(db: Database, query: string, ...params: unknown[]): T | null {
  const stmt = db.prepare(query);
  const result = stmt.get(...params) as T | undefined;
  return result ?? null;
}

/**
 * Execute a select query and return all results
 */
export function selectAll<T>(db: Database, query: string, ...params: unknown[]): T[] {
  const stmt = db.prepare(query);
  return stmt.all(...params) as T[];
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Build a dynamic update statement.
 * The table parameter is validated against a compile-time whitelist to prevent SQL injection.
 */
export function buildUpdateStatement(
  db: Database,
  table: TableName,
  updates: Record<string, unknown>,
  idField: 'id' | 'project_id' = 'id',
  excludeFields: string[] = ['id', 'created_at']
): { stmt: Statement; values: unknown[] } | null {
  if (!VALID_TABLE_SET.has(table)) {
    throw new Error(`Invalid table name: "${table}". Add it to VALID_TABLE_NAMES in repository.utils.ts.`);
  }

  const { fields, values } = buildUpdateQuery(updates, excludeFields);

  if (fields.length === 0) {
    return null;
  }

  const now = getCurrentTimestamp();
  fields.push('updated_at = ?');
  values.push(now);

  const cacheKey = `${table}:${idField}:${fields.join(',')}`;
  let stmt = statementCache.get(cacheKey);
  if (!stmt) {
    stmt = db.prepare(`
      UPDATE ${table}
      SET ${fields.join(', ')}
      WHERE ${idField} = ?
    `);
    statementCache.set(cacheKey, stmt);
  }

  return { stmt, values };
}

/** Cache for prepared UPDATE statements keyed by table:idField:fieldsList */
const statementCache = new Map<string, Statement>();

/** Clear the statement cache (e.g., when the database connection is reset) */
export function clearStatementCache(): void {
  statementCache.clear();
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escape SQL LIKE wildcard characters (% and _) in user input.
 * Use with the ESCAPE '\' clause in LIKE expressions.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** @deprecated Use `parseJsonArray` from `@/lib/json-utils` directly. */
export const safeParseJsonArray = parseJsonArray;

/**
 * Validate a score value on a 1-10 scale.
 * Returns the clamped integer value, or null if the input is null/undefined.
 * Out-of-range numbers are clamped to [1, 10].
 * Non-numeric values return null.
 */
export function validateScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(num)) {
    return null;
  }
  return Math.max(1, Math.min(10, Math.round(num)));
}

/**
 * Error thrown when a required database table does not exist.
 * Repositories throw this so API routes can return a clear 503 message
 * instead of a generic 500 "Failed to ..." response.
 */
export class TableNotFoundError extends Error {
  public readonly table: string;
  public readonly feature: string;

  constructor(table: string, feature: string) {
    super(`Table "${table}" does not exist. The ${feature} feature requires database migrations to be run.`);
    this.name = 'TableNotFoundError';
    this.table = table;
    this.feature = feature;
  }
}

/**
 * Check if an error is a SQLite "no such table" error
 */
export function isTableMissingError(error: unknown): boolean {
  if (error instanceof TableNotFoundError) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('no such table');
}

/**
 * Extract table name from a SQLite "no such table" error message
 */
function extractTableName(error: Error): string | null {
  const match = error.message.match(/no such table:\s*(\S+)/);
  return match ? match[1] : null;
}

/**
 * Wrap a DB operation to convert "no such table" errors into TableNotFoundError.
 * Use this in repositories to provide clear error messages.
 */
export function withTableCheck<T>(feature: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      const table = extractTableName(error) || 'unknown';
      throw new TableNotFoundError(table, feature);
    }
    throw error;
  }
}
