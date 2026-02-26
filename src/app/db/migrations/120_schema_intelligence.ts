/**
 * Migration 120: Schema Intelligence
 *
 * Creates tables for the self-optimizing database system:
 * - query_patterns: Tracks SQL query execution frequency and timing
 * - schema_recommendations: AI-generated schema optimization recommendations
 * - schema_optimization_history: Tracks accepted/rejected recommendations for learning
 */

import type { DbConnection } from '../drivers/types';
import { safeMigration, createTableIfNotExists, type MigrationLogger } from './migration.utils';

export function migrate120SchemaIntelligence(db: DbConnection, logger: MigrationLogger): void {
  safeMigration('120_schema_intelligence', () => {
    // Table: query_patterns - tracks query execution patterns
    createTableIfNotExists(db, 'query_patterns', `
      CREATE TABLE query_patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL DEFAULT 'default',
        query_hash TEXT NOT NULL,
        query_template TEXT NOT NULL,
        table_names TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('select', 'insert', 'update', 'delete')),
        execution_count INTEGER NOT NULL DEFAULT 1,
        total_duration_ms REAL NOT NULL DEFAULT 0,
        avg_duration_ms REAL NOT NULL DEFAULT 0,
        max_duration_ms REAL NOT NULL DEFAULT 0,
        last_executed_at TEXT NOT NULL,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, logger);

    // Table: schema_recommendations - AI-generated optimization suggestions
    createTableIfNotExists(db, 'schema_recommendations', `
      CREATE TABLE schema_recommendations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL DEFAULT 'default',
        category TEXT NOT NULL CHECK (category IN ('missing_index', 'denormalization', 'column_type', 'dead_table', 'query_optimization', 'schema_cleanup')),
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_tables TEXT NOT NULL,
        migration_sql TEXT,
        rollback_sql TEXT,
        impact_analysis TEXT,
        risk_assessment TEXT,
        expected_improvement TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied', 'rolled_back')),
        applied_at TEXT,
        source_query_patterns TEXT,
        ai_confidence REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, logger);

    // Table: schema_optimization_history - learning from accepted/rejected
    createTableIfNotExists(db, 'schema_optimization_history', `
      CREATE TABLE schema_optimization_history (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL DEFAULT 'default',
        recommendation_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected', 'applied', 'rolled_back')),
        reason TEXT,
        performance_before TEXT,
        performance_after TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (recommendation_id) REFERENCES schema_recommendations(id) ON DELETE CASCADE
      )
    `, logger);

    // Indexes for query patterns
    db.exec(`CREATE INDEX IF NOT EXISTS idx_query_patterns_hash ON query_patterns(query_hash)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_query_patterns_project ON query_patterns(project_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_query_patterns_avg_duration ON query_patterns(avg_duration_ms DESC)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_query_patterns_count ON query_patterns(execution_count DESC)`);

    // Indexes for recommendations
    db.exec(`CREATE INDEX IF NOT EXISTS idx_schema_recommendations_status ON schema_recommendations(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_schema_recommendations_category ON schema_recommendations(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_schema_recommendations_project ON schema_recommendations(project_id)`);

    // Index for history
    db.exec(`CREATE INDEX IF NOT EXISTS idx_schema_opt_history_rec ON schema_optimization_history(recommendation_id)`);

    logger.success('Migration 120: Schema Intelligence tables created');
  }, logger);
}
