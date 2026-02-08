/**
 * Migration 070: Collective Memory
 * Creates tables for storing learned patterns from task executions
 * and tracking when those memories are applied with outcomes:
 * - collective_memory_entries: Patterns, error fixes, approaches, optimizations
 * - collective_memory_applications: Tracks when a memory was applied and its outcome
 */

import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate070CollectiveMemory(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('collectiveMemory', () => {
    // Create collective_memory_entries table
    const entriesCreated = createTableIfNotExists(db, 'collective_memory_entries', `
      CREATE TABLE IF NOT EXISTS collective_memory_entries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        session_id TEXT,
        task_id TEXT,
        memory_type TEXT NOT NULL CHECK(memory_type IN ('pattern', 'error_fix', 'approach', 'optimization', 'conflict_resolution')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        code_pattern TEXT,
        tags TEXT,
        context_ids TEXT,
        file_patterns TEXT,
        success_count INTEGER DEFAULT 1,
        failure_count INTEGER DEFAULT 0,
        effectiveness_score REAL DEFAULT 0.5,
        last_applied_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_cm_entries_project ON collective_memory_entries(project_id);
      CREATE INDEX idx_cm_entries_type ON collective_memory_entries(memory_type);
      CREATE INDEX idx_cm_entries_effectiveness ON collective_memory_entries(effectiveness_score DESC);
    `, logger);

    if (entriesCreated) {
      logger?.info('Created collective_memory_entries table with indexes');
    }

    // Create collective_memory_applications table
    const applicationsCreated = createTableIfNotExists(db, 'collective_memory_applications', `
      CREATE TABLE IF NOT EXISTS collective_memory_applications (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL REFERENCES collective_memory_entries(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL,
        session_id TEXT,
        task_id TEXT,
        requirement_name TEXT,
        applied_at TEXT NOT NULL,
        outcome TEXT CHECK(outcome IN ('success', 'failure', 'partial', 'pending')),
        outcome_details TEXT,
        resolved_at TEXT
      );

      CREATE INDEX idx_cm_applications_memory ON collective_memory_applications(memory_id);
      CREATE INDEX idx_cm_applications_task ON collective_memory_applications(task_id);
    `, logger);

    if (applicationsCreated) {
      logger?.info('Created collective_memory_applications table with indexes');
    }

    if (!entriesCreated && !applicationsCreated) {
      logger?.info('Collective memory tables already exist');
    }
  }, logger);
}
