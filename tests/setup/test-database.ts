/**
 * Test Database Setup
 * Provides isolated database for testing with cleanup utilities
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Test database path - separate from production
const TEST_DB_PATH = path.resolve(process.cwd(), 'database', 'test.db');

let testDb: Database.Database | null = null;

/**
 * Get or create the test database connection
 */
export function getTestDatabase(): Database.Database {
  if (!testDb) {
    // Ensure database directory exists
    const dbDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    testDb = new Database(TEST_DB_PATH);
    testDb.pragma('journal_mode = WAL');
  }
  return testDb;
}

/**
 * Initialize test database schema
 * Creates all tables needed for testing
 */
export function setupTestDatabase(): void {
  const db = getTestDatabase();

  // Create goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      context_id TEXT,
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done', 'rejected', 'undecided')),
      progress INTEGER DEFAULT 0,
      hypotheses_total INTEGER DEFAULT 0,
      hypotheses_verified INTEGER DEFAULT 0,
      target_date TEXT,
      started_at TEXT,
      completed_at TEXT,
      github_item_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create context_groups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_groups (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      accent_color TEXT,
      icon TEXT,
      layer_type TEXT,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create contexts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      group_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      file_paths TEXT NOT NULL,
      has_context_file INTEGER DEFAULT 0,
      context_file_path TEXT,
      preview TEXT,
      test_scenario TEXT,
      test_updated TEXT,
      target TEXT,
      target_fulfillment TEXT,
      target_rating INTEGER,
      implemented_tasks INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create scans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create ideas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      context_id TEXT,
      scan_type TEXT DEFAULT 'overall',
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
      user_feedback TEXT,
      user_pattern INTEGER DEFAULT 0,
      effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10)),
      impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 10)),
      risk INTEGER CHECK (risk IS NULL OR (risk >= 1 AND risk <= 10)),
      requirement_id TEXT,
      goal_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      implemented_at TEXT
    );
  `);

  // Create implementation_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS implementation_log (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      context_id TEXT,
      requirement_name TEXT NOT NULL,
      title TEXT NOT NULL,
      overview TEXT NOT NULL,
      overview_bullets TEXT,
      tested INTEGER DEFAULT 0,
      screenshot TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create tech_debt table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tech_debt (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
      risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
      estimated_effort_hours REAL,
      impact_scope TEXT,
      technical_impact TEXT,
      business_impact TEXT,
      detected_by TEXT NOT NULL CHECK (detected_by IN ('automated_scan', 'manual_entry', 'ai_analysis')),
      detection_details TEXT,
      file_paths TEXT,
      status TEXT NOT NULL CHECK (status IN ('detected', 'acknowledged', 'planned', 'in_progress', 'resolved', 'dismissed')),
      remediation_plan TEXT,
      remediation_steps TEXT,
      estimated_completion_date TEXT,
      backlog_item_id TEXT,
      goal_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      dismissed_at TEXT,
      dismissal_reason TEXT
    );
  `);

  // Create scan_queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_queue (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      context_id TEXT,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'git_push', 'file_change', 'scheduled')),
      trigger_metadata TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
      priority INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      progress_message TEXT,
      current_step TEXT,
      total_steps INTEGER,
      scan_id TEXT,
      result_summary TEXT,
      error_message TEXT,
      auto_merge_enabled INTEGER DEFAULT 0,
      auto_merge_status TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      context_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      agent TEXT,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create test_case_scenarios table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_scenarios (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create test_case_steps table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_steps (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      test_selector_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create projects table (for test data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create debt_predictions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debt_predictions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      confidence REAL NOT NULL,
      predicted_impact TEXT,
      recommended_actions TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create architecture_graph table
  db.exec(`
    CREATE TABLE IF NOT EXISTS architecture_graph (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create strategic_roadmap table
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategic_roadmap (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      milestones TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create marketplace_patterns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL,
      author TEXT,
      downloads INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create observatory_metrics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS observatory_metrics (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      value REAL NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create autonomous_ci table
  db.exec(`
    CREATE TABLE IF NOT EXISTS autonomous_ci (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      pipeline_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      last_run TEXT,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create hall_of_fame table (uses ideas table, but track implemented ones)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hall_of_fame_entries (
      id TEXT PRIMARY KEY,
      idea_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      implemented_at TEXT NOT NULL,
      celebration_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/**
 * Clean up all test data from the database
 */
export function cleanupTestDatabase(): void {
  const db = getTestDatabase();

  // Delete data in reverse order of dependencies
  const tables = [
    'test_case_steps',
    'test_case_scenarios',
    'hall_of_fame_entries',
    'observatory_metrics',
    'marketplace_patterns',
    'strategic_roadmap',
    'architecture_graph',
    'debt_predictions',
    'autonomous_ci',
    'events',
    'scan_queue',
    'tech_debt',
    'implementation_log',
    'ideas',
    'scans',
    'contexts',
    'context_groups',
    'goals',
    'projects',
  ];

  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table}`);
    } catch {
      // Table might not exist, ignore
    }
  }
}

/**
 * Close the test database connection
 */
export function closeTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * Delete the test database file completely
 */
export function deleteTestDatabase(): void {
  closeTestDatabase();

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Also delete WAL and SHM files if they exist
  const walPath = TEST_DB_PATH + '-wal';
  const shmPath = TEST_DB_PATH + '-shm';

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }
}

/**
 * Execute a function within a transaction that rolls back after completion
 * Useful for tests that need to ensure data isolation
 */
export function withTestTransaction<T>(fn: (db: Database.Database) => T): T {
  const db = getTestDatabase();

  try {
    db.exec('BEGIN TRANSACTION');
    const result = fn(db);
    db.exec('ROLLBACK');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Create a savepoint for nested transaction support
 */
export function createSavepoint(name: string): void {
  const db = getTestDatabase();
  db.exec(`SAVEPOINT ${name}`);
}

/**
 * Rollback to a savepoint
 */
export function rollbackToSavepoint(name: string): void {
  const db = getTestDatabase();
  db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
}

/**
 * Release a savepoint
 */
export function releaseSavepoint(name: string): void {
  const db = getTestDatabase();
  db.exec(`RELEASE SAVEPOINT ${name}`);
}
