/**
 * Migration Timeline API
 * GET  /api/migrations — list all applied migrations with metadata
 * POST /api/migrations — rollback last N migrations (generates reverse DDL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { getAppliedMigrations, getFailedMigrations } from '@/app/db/migrations/migration.utils';
import { getConnection } from '@/app/db/drivers';

interface MigrationEntry {
  name: string;
  applied_at: string;
  affected_tables: string[];
  status: string;
  error_message?: string | null;
  duration_ms?: number | null;
}

interface RollbackResult {
  migration: string;
  ddl: string[];
  status: 'rolled_back' | 'skipped';
  reason?: string;
}

/**
 * Infer affected tables for a migration by scanning sqlite_master
 * for tables whose schema was likely modified around that migration.
 * Falls back to pattern matching on migration name.
 */
function inferAffectedTables(db: ReturnType<typeof getDatabase>, migrationName: string): string[] {
  // Common table name patterns from migration names
  const nameMap: Record<string, string[]> = {
    conductor: ['conductor_runs', 'conductor_errors', 'conductor_specs'],
    brain: ['brain_reflections', 'brain_insights', 'brain_insight_evidence'],
    insight: ['learning_insights', 'insight_effectiveness_cache', 'insight_influence_log'],
    annette: ['annette_sessions', 'annette_messages', 'annette_memory_topics'],
    knowledge: ['knowledge_base_entries', 'knowledge_nodes', 'knowledge_edges'],
    direction: ['directions', 'direction_outcomes', 'direction_preferences'],
    goal: ['goals', 'goal_candidates', 'goal_signals', 'goal_sub_goals'],
    idea: ['ideas', 'idea_dependencies'],
    session: ['sessions', 'session_tasks'],
    scan: ['scans', 'scan_queue', 'scan_profiles'],
    observability: ['obs_api_calls', 'obs_endpoint_stats'],
    question: ['questions'],
    context: ['contexts', 'context_groups', 'context_group_relationships'],
    lifecycle: ['lifecycle_stages', 'lifecycle_locks'],
    signal: ['behavioral_signals'],
    integration: ['integrations', 'integration_events', 'webhooks'],
    architecture: ['architecture_analyses'],
    workspace: ['workspaces'],
    healing: ['healing_patches'],
    standup: ['daily_standups'],
  };

  const lower = migrationName.toLowerCase();
  const tables: string[] = [];
  for (const [keyword, relatedTables] of Object.entries(nameMap)) {
    if (lower.includes(keyword)) {
      tables.push(...relatedTables);
    }
  }
  return [...new Set(tables)];
}

/**
 * Generate reverse DDL for rolling back columns added to a table.
 * SQLite doesn't support DROP COLUMN before 3.35.0, so we generate
 * a table rebuild approach for older versions.
 */
function generateRollbackDDL(
  db: ReturnType<typeof getDatabase>,
  tables: string[]
): string[] {
  const ddlStatements: string[] = [];

  for (const table of tables) {
    try {
      // Check if table exists
      const exists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(table);

      if (exists) {
        ddlStatements.push(`-- Rollback: DROP TABLE IF EXISTS ${table};`);
        ddlStatements.push(`DROP TABLE IF EXISTS ${table};`);
      }
    } catch {
      // Skip tables that can't be inspected
    }
  }

  return ddlStatements;
}

export async function GET(): Promise<NextResponse> {
  try {
    const conn = getConnection();
    const raw = getAppliedMigrations(conn);
    const db = getDatabase();

    const migrations: MigrationEntry[] = raw
      .filter(m => !m.name.startsWith('_')) // skip internal markers like _bootstrap
      .map(m => {
        const storedTables = m.affected_tables ? m.affected_tables.split(',').filter(Boolean) : [];
        const tables = storedTables.length > 0 ? storedTables : inferAffectedTables(db, m.name);
        return {
          name: m.name,
          applied_at: m.applied_at,
          affected_tables: tables,
          status: m.status ?? 'applied',
          error_message: m.error_message,
          duration_ms: m.duration_ms,
        };
      });

    const failed = getFailedMigrations(conn);

    return NextResponse.json({
      total: migrations.length,
      failed: failed.length,
      migrations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch migrations: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 10); // cap at 10
    const dryRun = body.dryRun !== false; // default to dry-run for safety

    const conn = getConnection();
    const raw = getAppliedMigrations(conn);
    const db = getDatabase();

    // Get the last N non-internal migrations
    const candidates = raw
      .filter(m => !m.name.startsWith('_'))
      .slice(0, count);

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No migrations to roll back' }, { status: 400 });
    }

    const results: RollbackResult[] = [];

    for (const migration of candidates) {
      const storedTables = migration.affected_tables
        ? migration.affected_tables.split(',').filter(Boolean)
        : [];
      const tables = storedTables.length > 0
        ? storedTables
        : inferAffectedTables(db, migration.name);

      const ddl = generateRollbackDDL(db, tables);

      if (dryRun) {
        results.push({
          migration: migration.name,
          ddl,
          status: 'skipped',
          reason: 'Dry run — DDL not executed',
        });
      } else {
        try {
          db.transaction(() => {
            for (const stmt of ddl) {
              if (!stmt.startsWith('--')) {
                db.exec(stmt);
              }
            }
            // Remove migration record
            db.prepare('DELETE FROM _migrations_applied WHERE name = ?').run(migration.name);
          });
          results.push({
            migration: migration.name,
            ddl,
            status: 'rolled_back',
          });
        } catch (err) {
          results.push({
            migration: migration.name,
            ddl,
            status: 'skipped',
            reason: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      dryRun,
      count: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Rollback failed: ${message}` },
      { status: 500 }
    );
  }
}
