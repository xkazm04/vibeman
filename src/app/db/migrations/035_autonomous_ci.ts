/**
 * Migration 44: Create Autonomous CI tables
 * Tables for AI-driven continuous integration automation
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateAutonomousCITables(migrationLogger: MigrationLogger) {
  const db = getConnection();

  // Create ci_pipelines table
  safeMigration('ciPipelinesTable', () => {
    const created = createTableIfNotExists(db, 'ci_pipelines', `
      CREATE TABLE ci_pipelines (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN (
          'on_push', 'on_schedule', 'manual', 'webhook', 'auto'
        )),
        schedule_cron TEXT,
        branch_patterns TEXT,
        success_rate REAL NOT NULL DEFAULT 100,
        average_build_time REAL NOT NULL DEFAULT 0,
        last_build_status TEXT NOT NULL DEFAULT 'pending' CHECK (last_build_status IN (
          'pending', 'running', 'success', 'failure', 'cancelled', 'skipped'
        )),
        total_builds INTEGER NOT NULL DEFAULT 0,
        failed_builds INTEGER NOT NULL DEFAULT 0,
        flaky_tests_count INTEGER NOT NULL DEFAULT 0,
        ai_analysis TEXT,
        recommended_optimizations TEXT,
        predicted_next_failure TEXT,
        current_coverage REAL,
        min_coverage_threshold INTEGER NOT NULL DEFAULT 80,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_self_healing INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_run TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_ci_pipelines_project ON ci_pipelines(project_id);
        CREATE INDEX idx_ci_pipelines_status ON ci_pipelines(last_build_status);
        CREATE INDEX idx_ci_pipelines_active ON ci_pipelines(project_id, is_active);
      `);
      migrationLogger.info('ci_pipelines table created successfully');
    }
  }, migrationLogger);

  // Create build_executions table
  safeMigration('buildExecutionsTable', () => {
    const created = createTableIfNotExists(db, 'build_executions', `
      CREATE TABLE build_executions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        build_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'running', 'success', 'failure', 'cancelled', 'skipped'
        )),
        trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN (
          'on_push', 'on_schedule', 'manual', 'webhook', 'auto'
        )),
        commit_sha TEXT,
        branch TEXT,
        commit_message TEXT,
        author TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        test_count INTEGER NOT NULL DEFAULT 0,
        test_passed INTEGER NOT NULL DEFAULT 0,
        test_failures INTEGER NOT NULL DEFAULT 0,
        test_skipped INTEGER NOT NULL DEFAULT 0,
        test_coverage REAL,
        memory_peak_mb REAL,
        cpu_avg_percent REAL,
        was_predicted_failure INTEGER NOT NULL DEFAULT 0,
        prediction_confidence REAL,
        build_log_path TEXT,
        artifacts TEXT,
        changed_files TEXT,
        error_message TEXT,
        error_type TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_id) REFERENCES ci_pipelines(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_build_executions_project ON build_executions(project_id);
        CREATE INDEX idx_build_executions_pipeline ON build_executions(pipeline_id);
        CREATE INDEX idx_build_executions_status ON build_executions(status);
        CREATE INDEX idx_build_executions_build_num ON build_executions(pipeline_id, build_number DESC);
        CREATE INDEX idx_build_executions_created ON build_executions(created_at DESC);
      `);
      migrationLogger.info('build_executions table created successfully');
    }
  }, migrationLogger);

  // Create ci_predictions table
  safeMigration('ciPredictionsTable', () => {
    const created = createTableIfNotExists(db, 'ci_predictions', `
      CREATE TABLE ci_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        build_id TEXT,
        prediction_type TEXT NOT NULL CHECK (prediction_type IN (
          'build_failure', 'flaky_test', 'performance_regression',
          'coverage_drop', 'long_build_time', 'dependency_conflict'
        )),
        confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
        prediction_data TEXT NOT NULL DEFAULT '{}',
        affected_files TEXT,
        estimated_impact TEXT NOT NULL DEFAULT 'medium' CHECK (estimated_impact IN (
          'low', 'medium', 'high', 'critical'
        )),
        recommended_action TEXT NOT NULL,
        was_correct INTEGER,
        actual_outcome TEXT,
        predicted_at TEXT NOT NULL DEFAULT (datetime('now')),
        validated_at TEXT,
        FOREIGN KEY (pipeline_id) REFERENCES ci_pipelines(id) ON DELETE CASCADE,
        FOREIGN KEY (build_id) REFERENCES build_executions(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_ci_predictions_project ON ci_predictions(project_id);
        CREATE INDEX idx_ci_predictions_pipeline ON ci_predictions(pipeline_id);
        CREATE INDEX idx_ci_predictions_build ON ci_predictions(build_id);
        CREATE INDEX idx_ci_predictions_type ON ci_predictions(prediction_type);
        CREATE INDEX idx_ci_predictions_validated ON ci_predictions(was_correct);
      `);
      migrationLogger.info('ci_predictions table created successfully');
    }
  }, migrationLogger);

  // Create flaky_tests table
  safeMigration('flakyTestsTable', () => {
    const created = createTableIfNotExists(db, 'flaky_tests', `
      CREATE TABLE flaky_tests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_file TEXT NOT NULL,
        test_suite TEXT,
        failure_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        flakiness_score INTEGER NOT NULL DEFAULT 0 CHECK (flakiness_score >= 0 AND flakiness_score <= 100),
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_failure_at TEXT,
        last_success_at TEXT,
        status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
          'detected', 'investigating', 'fixed', 'ignored'
        )),
        root_cause TEXT,
        fix_suggestion TEXT,
        auto_fixed INTEGER NOT NULL DEFAULT 0,
        error_patterns TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_id) REFERENCES ci_pipelines(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_flaky_tests_project ON flaky_tests(project_id);
        CREATE INDEX idx_flaky_tests_pipeline ON flaky_tests(pipeline_id);
        CREATE INDEX idx_flaky_tests_status ON flaky_tests(status);
        CREATE INDEX idx_flaky_tests_score ON flaky_tests(flakiness_score DESC);
        CREATE UNIQUE INDEX idx_flaky_tests_unique ON flaky_tests(pipeline_id, test_name, test_file);
      `);
      migrationLogger.info('flaky_tests table created successfully');
    }
  }, migrationLogger);

  // Create ci_config table
  safeMigration('ciConfigTable', () => {
    const created = createTableIfNotExists(db, 'ci_config', `
      CREATE TABLE ci_config (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        auto_optimize INTEGER NOT NULL DEFAULT 1,
        auto_fix_flaky_tests INTEGER NOT NULL DEFAULT 0,
        predictive_testing INTEGER NOT NULL DEFAULT 1,
        self_healing INTEGER NOT NULL DEFAULT 0,
        ai_analysis_frequency TEXT NOT NULL DEFAULT 'on_change' CHECK (ai_analysis_frequency IN (
          'on_change', 'hourly', 'daily', 'weekly'
        )),
        min_test_coverage INTEGER NOT NULL DEFAULT 80,
        max_build_time_seconds INTEGER NOT NULL DEFAULT 600,
        failure_rate_threshold REAL NOT NULL DEFAULT 10,
        flakiness_threshold INTEGER NOT NULL DEFAULT 30,
        notify_on_failure INTEGER NOT NULL DEFAULT 1,
        notify_on_prediction INTEGER NOT NULL DEFAULT 1,
        notify_on_optimization INTEGER NOT NULL DEFAULT 1,
        optimization_rules TEXT,
        excluded_tests TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_ci_config_project ON ci_config(project_id);
        CREATE INDEX idx_ci_config_enabled ON ci_config(enabled);
      `);
      migrationLogger.info('ci_config table created successfully');
    }
  }, migrationLogger);

  // Create test_coverage_changes table
  safeMigration('testCoverageChangesTable', () => {
    const created = createTableIfNotExists(db, 'test_coverage_changes', `
      CREATE TABLE test_coverage_changes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        build_id TEXT NOT NULL,
        line_coverage REAL NOT NULL DEFAULT 0,
        branch_coverage REAL,
        function_coverage REAL,
        statement_coverage REAL,
        coverage_delta REAL NOT NULL DEFAULT 0,
        new_uncovered_lines TEXT,
        coverage_impact_analysis TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_id) REFERENCES ci_pipelines(id) ON DELETE CASCADE,
        FOREIGN KEY (build_id) REFERENCES build_executions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_coverage_changes_project ON test_coverage_changes(project_id);
        CREATE INDEX idx_coverage_changes_pipeline ON test_coverage_changes(pipeline_id);
        CREATE INDEX idx_coverage_changes_build ON test_coverage_changes(build_id);
        CREATE INDEX idx_coverage_changes_created ON test_coverage_changes(created_at DESC);
      `);
      migrationLogger.info('test_coverage_changes table created successfully');
    }
  }, migrationLogger);

  // Create pipeline_optimizations table
  safeMigration('pipelineOptimizationsTable', () => {
    const created = createTableIfNotExists(db, 'pipeline_optimizations', `
      CREATE TABLE pipeline_optimizations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        optimization_type TEXT NOT NULL CHECK (optimization_type IN (
          'caching', 'parallelization', 'test_selection',
          'dependency_pruning', 'resource_allocation', 'other'
        )),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        estimated_time_savings_ms INTEGER NOT NULL DEFAULT 0,
        estimated_cost_savings REAL,
        implementation_details TEXT,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN (
          'suggested', 'approved', 'applied', 'rejected', 'reverted'
        )),
        applied_at TEXT,
        reverted_at TEXT,
        actual_time_savings_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pipeline_id) REFERENCES ci_pipelines(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_optimizations_project ON pipeline_optimizations(project_id);
        CREATE INDEX idx_optimizations_pipeline ON pipeline_optimizations(pipeline_id);
        CREATE INDEX idx_optimizations_status ON pipeline_optimizations(status);
        CREATE INDEX idx_optimizations_type ON pipeline_optimizations(optimization_type);
      `);
      migrationLogger.info('pipeline_optimizations table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Autonomous CI tables created successfully');
}
