/**
 * Repository Utilities
 * Shared helper functions for repository operations
 */

import type { Database, Statement } from 'better-sqlite3';

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
  'backlog_items',
  'badges',
  'behavioral_signals',
  'blueprint_components',
  'blueprint_configs',
  'blueprint_executions',
  'brain_insights',
  'brain_reflections',
  'code_change_events',
  'code_pattern_usage',
  'code_walkthroughs',
  'collection_patterns',
  'collective_memory_applications',
  'collective_memory_entries',
  'community_security_scores',
  'complexity_history',
  'consistency_rules',
  'context_api_routes',
  'context_group_relationships',
  'context_groups',
  'context_transitions',
  'contexts',
  'conversations',
  'cross_project_relationships',
  'debt_patterns',
  'debt_predictions',
  'debt_prevention_rules',
  'developer_decisions',
  'developer_profiles',
  'direction_outcomes',
  'direction_preference_profiles',
  'directions',
  'discovered_templates',
  'events',
  'execution_flows',
  'feature_interactions',
  'file_change_patterns',
  'file_watch_config',
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
  'messages',
  'onboarding_recommendations',
  'opportunity_cards',
  'pattern_applications',
  'pattern_collections',
  'pattern_favorites',
  'pattern_ratings',
  'pattern_versions',
  'pending_approvals',
  'persona_metrics_snapshots',
  'persona_prompt_versions',
  'prevention_actions',
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
  'scan_history',
  'scan_notifications',
  'scan_predictions',
  'scan_profiles',
  'scan_queue',
  'scans',
  'schema_optimization_history',
  'schema_recommendations',
  'scoring_thresholds',
  'scoring_weights',
  'security_alerts',
  'security_intelligence',
  'security_patches',
  'security_prs',
  'security_scans',
  'sessions',
  'skill_tracking',
  'stale_branches',
  'standup_summaries',
  'strategic_initiatives',
  'tech_debt',
  'terminal_messages',
  'terminal_sessions',
  'test_case_scenarios',
  'test_case_steps',
  'test_executions',
  'test_knowledge',
  'test_scenarios',
  'test_selectors',
  'velocity_tracking',
  'visual_diffs',
  'voicebot_analytics',
  'vulnerability_debates',
  'workspace',
] as const;

export type TableName = (typeof VALID_TABLE_NAMES)[number];

const VALID_TABLE_SET: ReadonlySet<string> = new Set(VALID_TABLE_NAMES);

/**
 * Build dynamic update query
 * Reduces duplication in repository update methods
 */
export function buildUpdateQuery<T extends Record<string, unknown>>(
  updates: T,
  excludeFields: string[] = ['id', 'created_at']
): { fields: string[]; values: unknown[] } {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (!excludeFields.includes(key) && value !== undefined) {
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
  return result || null;
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
 * Safely parse a JSON string column that should contain an array.
 * Returns an empty array if the value is null/undefined or contains malformed JSON.
 */
export function safeParseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
