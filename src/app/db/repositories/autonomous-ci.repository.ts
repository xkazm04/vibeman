/**
 * Autonomous CI Repository
 * Handles all database operations for CI/CD automation
 */

import { getDatabase } from '../connection';
import {
  DbCIPipeline,
  DbBuildExecution,
  DbCIPrediction,
  DbFlakyTest,
  DbCIConfig,
  DbTestCoverageChange,
  DbPipelineOptimization,
  BuildStatus,
  DEFAULT_CI_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  CIDashboardStats,
} from '../models/autonomous-ci.types';
import { selectOne, selectAll, getCurrentTimestamp, generateId } from './repository.utils';

// ============================================================================
// CI PIPELINE REPOSITORY
// ============================================================================

export const ciPipelineRepository = {
  /**
   * Create a new pipeline
   */
  create(data: {
    project_id: string;
    name: string;
    description?: string | null;
    trigger_type?: DbCIPipeline['trigger_type'];
    schedule_cron?: string | null;
    branch_patterns?: string[] | null;
    min_coverage_threshold?: number;
    is_self_healing?: boolean;
  }): DbCIPipeline {
    const db = getDatabase();
    const id = generateId('cipl');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO ci_pipelines (
        id, project_id, name, description, trigger_type, schedule_cron,
        branch_patterns, success_rate, average_build_time, last_build_status,
        total_builds, failed_builds, flaky_tests_count, ai_analysis,
        recommended_optimizations, predicted_next_failure, current_coverage,
        min_coverage_threshold, is_active, is_self_healing, created_at, updated_at, last_run
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description || null,
      data.trigger_type || DEFAULT_PIPELINE_CONFIG.trigger_type,
      data.schedule_cron || null,
      data.branch_patterns ? JSON.stringify(data.branch_patterns) : null,
      DEFAULT_PIPELINE_CONFIG.success_rate,
      DEFAULT_PIPELINE_CONFIG.average_build_time,
      DEFAULT_PIPELINE_CONFIG.last_build_status,
      DEFAULT_PIPELINE_CONFIG.total_builds,
      DEFAULT_PIPELINE_CONFIG.failed_builds,
      DEFAULT_PIPELINE_CONFIG.flaky_tests_count,
      null,
      null,
      null,
      DEFAULT_PIPELINE_CONFIG.current_coverage,
      data.min_coverage_threshold || DEFAULT_PIPELINE_CONFIG.min_coverage_threshold,
      DEFAULT_PIPELINE_CONFIG.is_active,
      data.is_self_healing ? 1 : DEFAULT_PIPELINE_CONFIG.is_self_healing,
      now,
      now,
      null
    );

    return this.getById(id)!;
  },

  /**
   * Get pipeline by ID
   */
  getById(id: string): DbCIPipeline | null {
    const db = getDatabase();
    return selectOne<DbCIPipeline>(db, 'SELECT * FROM ci_pipelines WHERE id = ?', id);
  },

  /**
   * Get all pipelines for a project
   */
  getByProject(projectId: string): DbCIPipeline[] {
    const db = getDatabase();
    return selectAll<DbCIPipeline>(
      db,
      'SELECT * FROM ci_pipelines WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get active pipelines for a project
   */
  getActivePipelines(projectId: string): DbCIPipeline[] {
    const db = getDatabase();
    return selectAll<DbCIPipeline>(
      db,
      'SELECT * FROM ci_pipelines WHERE project_id = ? AND is_active = 1 ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Update pipeline
   */
  update(id: string, updates: Partial<DbCIPipeline>): DbCIPipeline | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const allowedFields = [
      'name', 'description', 'trigger_type', 'schedule_cron', 'branch_patterns',
      'success_rate', 'average_build_time', 'last_build_status', 'total_builds',
      'failed_builds', 'flaky_tests_count', 'ai_analysis', 'recommended_optimizations',
      'predicted_next_failure', 'current_coverage', 'min_coverage_threshold',
      'is_active', 'is_self_healing', 'last_run'
    ];

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'branch_patterns' && Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE ci_pipelines
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Update pipeline stats after a build
   */
  updateStats(pipelineId: string, buildStatus: BuildStatus, buildDuration: number): void {
    const pipeline = this.getById(pipelineId);
    if (!pipeline) return;

    const totalBuilds = pipeline.total_builds + 1;
    const failedBuilds = buildStatus === 'failure' ? pipeline.failed_builds + 1 : pipeline.failed_builds;
    const successRate = ((totalBuilds - failedBuilds) / totalBuilds) * 100;

    // Calculate running average for build time
    const avgBuildTime = pipeline.total_builds === 0
      ? buildDuration
      : (pipeline.average_build_time * pipeline.total_builds + buildDuration) / totalBuilds;

    this.update(pipelineId, {
      total_builds: totalBuilds,
      failed_builds: failedBuilds,
      success_rate: Math.round(successRate * 100) / 100,
      average_build_time: Math.round(avgBuildTime),
      last_build_status: buildStatus,
      last_run: getCurrentTimestamp(),
    });
  },

  /**
   * Delete pipeline
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ci_pipelines WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Count pipelines by status
   */
  countByStatus(projectId: string): Record<BuildStatus, number> {
    const db = getDatabase();
    const results = selectAll<{ last_build_status: BuildStatus; count: number }>(
      db,
      `SELECT last_build_status, COUNT(*) as count
       FROM ci_pipelines
       WHERE project_id = ?
       GROUP BY last_build_status`,
      projectId
    );

    const counts: Record<BuildStatus, number> = {
      pending: 0,
      running: 0,
      success: 0,
      failure: 0,
      cancelled: 0,
      skipped: 0,
    };

    for (const row of results) {
      counts[row.last_build_status] = row.count;
    }

    return counts;
  },
};

// ============================================================================
// BUILD EXECUTION REPOSITORY
// ============================================================================

export const buildExecutionRepository = {
  /**
   * Create a new build execution
   */
  create(data: {
    project_id: string;
    pipeline_id: string;
    trigger?: DbBuildExecution['trigger'];
    commit_sha?: string | null;
    branch?: string | null;
    commit_message?: string | null;
    author?: string | null;
    changed_files?: string[] | null;
  }): DbBuildExecution {
    const db = getDatabase();
    const id = generateId('bld');
    const now = getCurrentTimestamp();

    // Get next build number for this pipeline
    const lastBuild = selectOne<{ build_number: number }>(
      db,
      'SELECT MAX(build_number) as build_number FROM build_executions WHERE pipeline_id = ?',
      data.pipeline_id
    );
    const buildNumber = (lastBuild?.build_number || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO build_executions (
        id, project_id, pipeline_id, build_number, status, trigger,
        commit_sha, branch, commit_message, author, duration_ms,
        started_at, completed_at, test_count, test_passed, test_failures,
        test_skipped, test_coverage, memory_peak_mb, cpu_avg_percent,
        was_predicted_failure, prediction_confidence, build_log_path,
        artifacts, changed_files, error_message, error_type, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.pipeline_id,
      buildNumber,
      'pending',
      data.trigger || 'manual',
      data.commit_sha || null,
      data.branch || null,
      data.commit_message || null,
      data.author || null,
      0,
      null,
      null,
      0,
      0,
      0,
      0,
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      data.changed_files ? JSON.stringify(data.changed_files) : null,
      null,
      null,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get build by ID
   */
  getById(id: string): DbBuildExecution | null {
    const db = getDatabase();
    return selectOne<DbBuildExecution>(db, 'SELECT * FROM build_executions WHERE id = ?', id);
  },

  /**
   * Get builds by pipeline
   */
  getByPipeline(pipelineId: string, limit: number = 50): DbBuildExecution[] {
    const db = getDatabase();
    return selectAll<DbBuildExecution>(
      db,
      'SELECT * FROM build_executions WHERE pipeline_id = ? ORDER BY build_number DESC LIMIT ?',
      pipelineId,
      limit
    );
  },

  /**
   * Get builds by project
   */
  getByProject(projectId: string, limit: number = 100): DbBuildExecution[] {
    const db = getDatabase();
    return selectAll<DbBuildExecution>(
      db,
      'SELECT * FROM build_executions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get recent builds across all pipelines
   */
  getRecent(projectId: string, days: number = 7): DbBuildExecution[] {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return selectAll<DbBuildExecution>(
      db,
      `SELECT * FROM build_executions
       WHERE project_id = ? AND created_at > ?
       ORDER BY created_at DESC`,
      projectId,
      cutoff.toISOString()
    );
  },

  /**
   * Start a build
   */
  start(id: string): DbBuildExecution | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE build_executions
      SET status = 'running', started_at = ?
      WHERE id = ?
    `);

    stmt.run(now, id);
    return this.getById(id);
  },

  /**
   * Complete a build
   */
  complete(id: string, result: {
    status: BuildStatus;
    duration_ms: number;
    test_count?: number;
    test_passed?: number;
    test_failures?: number;
    test_skipped?: number;
    test_coverage?: number | null;
    memory_peak_mb?: number | null;
    cpu_avg_percent?: number | null;
    build_log_path?: string | null;
    artifacts?: string[] | null;
    error_message?: string | null;
    error_type?: string | null;
  }): DbBuildExecution | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE build_executions
      SET status = ?, completed_at = ?, duration_ms = ?,
          test_count = ?, test_passed = ?, test_failures = ?, test_skipped = ?,
          test_coverage = ?, memory_peak_mb = ?, cpu_avg_percent = ?,
          build_log_path = ?, artifacts = ?, error_message = ?, error_type = ?
      WHERE id = ?
    `);

    stmt.run(
      result.status,
      now,
      result.duration_ms,
      result.test_count || 0,
      result.test_passed || 0,
      result.test_failures || 0,
      result.test_skipped || 0,
      result.test_coverage || null,
      result.memory_peak_mb || null,
      result.cpu_avg_percent || null,
      result.build_log_path || null,
      result.artifacts ? JSON.stringify(result.artifacts) : null,
      result.error_message || null,
      result.error_type || null,
      id
    );

    // Update pipeline stats
    const build = this.getById(id);
    if (build) {
      ciPipelineRepository.updateStats(build.pipeline_id, result.status, result.duration_ms);
    }

    return build;
  },

  /**
   * Mark build as predicted to fail
   */
  markPredictedFailure(id: string, confidence: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE build_executions
      SET was_predicted_failure = 1, prediction_confidence = ?
      WHERE id = ?
    `);
    stmt.run(confidence, id);
  },

  /**
   * Delete build
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM build_executions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get build trend data for charts
   */
  getBuildTrend(projectId: string, days: number = 14): Array<{
    date: string;
    success: number;
    failure: number;
    total: number;
  }> {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const results = selectAll<{ date: string; status: BuildStatus; count: number }>(
      db,
      `SELECT date(created_at) as date, status, COUNT(*) as count
       FROM build_executions
       WHERE project_id = ? AND created_at > ?
       GROUP BY date(created_at), status
       ORDER BY date`,
      projectId,
      cutoff.toISOString()
    );

    // Aggregate by date
    const byDate = new Map<string, { success: number; failure: number; total: number }>();

    for (const row of results) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, { success: 0, failure: 0, total: 0 });
      }
      const entry = byDate.get(row.date)!;
      entry.total += row.count;
      if (row.status === 'success') {
        entry.success += row.count;
      } else if (row.status === 'failure') {
        entry.failure += row.count;
      }
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  },
};

// ============================================================================
// CI PREDICTION REPOSITORY
// ============================================================================

export const ciPredictionRepository = {
  /**
   * Create a prediction
   */
  create(data: {
    project_id: string;
    pipeline_id: string;
    build_id?: string | null;
    prediction_type: DbCIPrediction['prediction_type'];
    confidence_score: number;
    prediction_data?: Record<string, unknown>;
    affected_files?: string[] | null;
    estimated_impact: DbCIPrediction['estimated_impact'];
    recommended_action: string;
  }): DbCIPrediction {
    const db = getDatabase();
    const id = generateId('cprd');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO ci_predictions (
        id, project_id, pipeline_id, build_id, prediction_type,
        confidence_score, prediction_data, affected_files, estimated_impact,
        recommended_action, was_correct, actual_outcome, predicted_at, validated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.pipeline_id,
      data.build_id || null,
      data.prediction_type,
      data.confidence_score,
      JSON.stringify(data.prediction_data || {}),
      data.affected_files ? JSON.stringify(data.affected_files) : null,
      data.estimated_impact,
      data.recommended_action,
      null,
      null,
      now,
      null
    );

    return this.getById(id)!;
  },

  /**
   * Get prediction by ID
   */
  getById(id: string): DbCIPrediction | null {
    const db = getDatabase();
    return selectOne<DbCIPrediction>(db, 'SELECT * FROM ci_predictions WHERE id = ?', id);
  },

  /**
   * Get predictions by pipeline
   */
  getByPipeline(pipelineId: string, limit: number = 20): DbCIPrediction[] {
    const db = getDatabase();
    return selectAll<DbCIPrediction>(
      db,
      'SELECT * FROM ci_predictions WHERE pipeline_id = ? ORDER BY predicted_at DESC LIMIT ?',
      pipelineId,
      limit
    );
  },

  /**
   * Get unvalidated predictions
   */
  getUnvalidated(projectId: string): DbCIPrediction[] {
    const db = getDatabase();
    return selectAll<DbCIPrediction>(
      db,
      'SELECT * FROM ci_predictions WHERE project_id = ? AND was_correct IS NULL ORDER BY predicted_at DESC',
      projectId
    );
  },

  /**
   * Validate a prediction
   */
  validate(id: string, wasCorrect: boolean, actualOutcome: string): DbCIPrediction | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE ci_predictions
      SET was_correct = ?, actual_outcome = ?, validated_at = ?
      WHERE id = ?
    `);

    stmt.run(wasCorrect ? 1 : 0, actualOutcome, now, id);
    return this.getById(id);
  },

  /**
   * Get prediction accuracy stats
   */
  getAccuracyStats(projectId: string): { total: number; correct: number; accuracy: number } {
    const db = getDatabase();
    const result = selectOne<{ total: number; correct: number }>(
      db,
      `SELECT COUNT(*) as total, SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM ci_predictions
       WHERE project_id = ? AND was_correct IS NOT NULL`,
      projectId
    );

    const total = result?.total || 0;
    const correct = result?.correct || 0;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return { total, correct, accuracy: Math.round(accuracy * 100) / 100 };
  },

  /**
   * Delete prediction
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ci_predictions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// FLAKY TEST REPOSITORY
// ============================================================================

export const flakyTestRepository = {
  /**
   * Create or update flaky test record
   */
  upsert(data: {
    project_id: string;
    pipeline_id: string;
    test_name: string;
    test_file: string;
    test_suite?: string | null;
    passed: boolean;
    error_message?: string | null;
  }): DbFlakyTest {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Check if test already exists
    const existing = selectOne<DbFlakyTest>(
      db,
      'SELECT * FROM flaky_tests WHERE pipeline_id = ? AND test_name = ? AND test_file = ?',
      data.pipeline_id,
      data.test_name,
      data.test_file
    );

    if (existing) {
      // Update existing record
      const newFailureCount = data.passed ? existing.failure_count : existing.failure_count + 1;
      const newSuccessCount = data.passed ? existing.success_count + 1 : existing.success_count;
      const totalRuns = newFailureCount + newSuccessCount;
      const flakinessScore = totalRuns > 0
        ? Math.round((Math.min(newFailureCount, newSuccessCount) / totalRuns) * 200) // Higher score = more flaky
        : 0;

      const consecutiveFailures = data.passed ? 0 : existing.consecutive_failures + 1;

      // Update error patterns if there's a new error
      let errorPatterns = existing.error_patterns ? JSON.parse(existing.error_patterns) : [];
      if (!data.passed && data.error_message) {
        if (!errorPatterns.includes(data.error_message)) {
          errorPatterns = [...errorPatterns.slice(-9), data.error_message]; // Keep last 10
        }
      }

      const stmt = db.prepare(`
        UPDATE flaky_tests
        SET failure_count = ?, success_count = ?, flakiness_score = ?,
            consecutive_failures = ?, last_failure_at = ?, last_success_at = ?,
            error_patterns = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        newFailureCount,
        newSuccessCount,
        flakinessScore,
        consecutiveFailures,
        data.passed ? existing.last_failure_at : now,
        data.passed ? now : existing.last_success_at,
        JSON.stringify(errorPatterns),
        now,
        existing.id
      );

      return this.getById(existing.id)!;
    } else {
      // Create new record
      const id = generateId('flt');

      const stmt = db.prepare(`
        INSERT INTO flaky_tests (
          id, project_id, pipeline_id, test_name, test_file, test_suite,
          failure_count, success_count, flakiness_score, consecutive_failures,
          first_detected_at, last_failure_at, last_success_at, status,
          root_cause, fix_suggestion, auto_fixed, error_patterns, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.project_id,
        data.pipeline_id,
        data.test_name,
        data.test_file,
        data.test_suite || null,
        data.passed ? 0 : 1,
        data.passed ? 1 : 0,
        0, // Initial flakiness score
        data.passed ? 0 : 1,
        now,
        data.passed ? null : now,
        data.passed ? now : null,
        'detected',
        null,
        null,
        0,
        data.error_message ? JSON.stringify([data.error_message]) : null,
        now,
        now
      );

      return this.getById(id)!;
    }
  },

  /**
   * Get flaky test by ID
   */
  getById(id: string): DbFlakyTest | null {
    const db = getDatabase();
    return selectOne<DbFlakyTest>(db, 'SELECT * FROM flaky_tests WHERE id = ?', id);
  },

  /**
   * Get flaky tests by pipeline
   */
  getByPipeline(pipelineId: string): DbFlakyTest[] {
    const db = getDatabase();
    return selectAll<DbFlakyTest>(
      db,
      'SELECT * FROM flaky_tests WHERE pipeline_id = ? ORDER BY flakiness_score DESC',
      pipelineId
    );
  },

  /**
   * Get top flaky tests for a project
   */
  getTopFlaky(projectId: string, limit: number = 10): DbFlakyTest[] {
    const db = getDatabase();
    return selectAll<DbFlakyTest>(
      db,
      `SELECT * FROM flaky_tests
       WHERE project_id = ? AND status != 'fixed' AND flakiness_score > 10
       ORDER BY flakiness_score DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Update flaky test status
   */
  updateStatus(id: string, status: DbFlakyTest['status'], rootCause?: string, fixSuggestion?: string): DbFlakyTest | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE flaky_tests
      SET status = ?, root_cause = ?, fix_suggestion = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, rootCause || null, fixSuggestion || null, now, id);
    return this.getById(id);
  },

  /**
   * Mark test as auto-fixed
   */
  markAutoFixed(id: string): DbFlakyTest | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE flaky_tests
      SET status = 'fixed', auto_fixed = 1, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, id);
    return this.getById(id);
  },

  /**
   * Delete flaky test record
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM flaky_tests WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// CI CONFIG REPOSITORY
// ============================================================================

export const ciConfigRepository = {
  /**
   * Get config for project
   */
  getByProject(projectId: string): DbCIConfig | null {
    const db = getDatabase();
    return selectOne<DbCIConfig>(db, 'SELECT * FROM ci_config WHERE project_id = ?', projectId);
  },

  /**
   * Create or update config
   */
  upsert(projectId: string, config: Partial<Omit<DbCIConfig, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): DbCIConfig {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const existing = this.getByProject(projectId);

    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];

      const allowedFields = [
        'enabled', 'auto_optimize', 'auto_fix_flaky_tests', 'predictive_testing',
        'self_healing', 'ai_analysis_frequency', 'min_test_coverage',
        'max_build_time_seconds', 'failure_rate_threshold', 'flakiness_threshold',
        'notify_on_failure', 'notify_on_prediction', 'notify_on_optimization',
        'optimization_rules', 'excluded_tests'
      ];

      for (const [key, value] of Object.entries(config)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          if (typeof value === 'boolean') {
            values.push(value ? 1 : 0);
          } else if (key === 'optimization_rules' || key === 'excluded_tests') {
            values.push(typeof value === 'string' ? value : JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(now);
        values.push(projectId);

        const stmt = db.prepare(`
          UPDATE ci_config
          SET ${fields.join(', ')}
          WHERE project_id = ?
        `);

        stmt.run(...values);
      }

      return this.getByProject(projectId)!;
    } else {
      const id = generateId('cic');

      const stmt = db.prepare(`
        INSERT INTO ci_config (
          id, project_id, enabled, auto_optimize, auto_fix_flaky_tests,
          predictive_testing, self_healing, ai_analysis_frequency,
          min_test_coverage, max_build_time_seconds, failure_rate_threshold,
          flakiness_threshold, notify_on_failure, notify_on_prediction,
          notify_on_optimization, optimization_rules, excluded_tests,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        projectId,
        config.enabled !== undefined ? (config.enabled ? 1 : 0) : DEFAULT_CI_CONFIG.enabled,
        config.auto_optimize !== undefined ? (config.auto_optimize ? 1 : 0) : DEFAULT_CI_CONFIG.auto_optimize,
        config.auto_fix_flaky_tests !== undefined ? (config.auto_fix_flaky_tests ? 1 : 0) : DEFAULT_CI_CONFIG.auto_fix_flaky_tests,
        config.predictive_testing !== undefined ? (config.predictive_testing ? 1 : 0) : DEFAULT_CI_CONFIG.predictive_testing,
        config.self_healing !== undefined ? (config.self_healing ? 1 : 0) : DEFAULT_CI_CONFIG.self_healing,
        config.ai_analysis_frequency || DEFAULT_CI_CONFIG.ai_analysis_frequency,
        config.min_test_coverage ?? DEFAULT_CI_CONFIG.min_test_coverage,
        config.max_build_time_seconds ?? DEFAULT_CI_CONFIG.max_build_time_seconds,
        config.failure_rate_threshold ?? DEFAULT_CI_CONFIG.failure_rate_threshold,
        config.flakiness_threshold ?? DEFAULT_CI_CONFIG.flakiness_threshold,
        config.notify_on_failure !== undefined ? (config.notify_on_failure ? 1 : 0) : DEFAULT_CI_CONFIG.notify_on_failure,
        config.notify_on_prediction !== undefined ? (config.notify_on_prediction ? 1 : 0) : DEFAULT_CI_CONFIG.notify_on_prediction,
        config.notify_on_optimization !== undefined ? (config.notify_on_optimization ? 1 : 0) : DEFAULT_CI_CONFIG.notify_on_optimization,
        config.optimization_rules ? (typeof config.optimization_rules === 'string' ? config.optimization_rules : JSON.stringify(config.optimization_rules)) : null,
        config.excluded_tests ? (typeof config.excluded_tests === 'string' ? config.excluded_tests : JSON.stringify(config.excluded_tests)) : null,
        now,
        now
      );

      return this.getByProject(projectId)!;
    }
  },

  /**
   * Delete config
   */
  delete(projectId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ci_config WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes > 0;
  },
};

// ============================================================================
// PIPELINE OPTIMIZATION REPOSITORY
// ============================================================================

export const pipelineOptimizationRepository = {
  /**
   * Create optimization suggestion
   */
  create(data: {
    project_id: string;
    pipeline_id: string;
    optimization_type: DbPipelineOptimization['optimization_type'];
    title: string;
    description: string;
    estimated_time_savings_ms: number;
    estimated_cost_savings?: number | null;
    implementation_details?: string | null;
    confidence: number;
  }): DbPipelineOptimization {
    const db = getDatabase();
    const id = generateId('opt');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO pipeline_optimizations (
        id, project_id, pipeline_id, optimization_type, title, description,
        estimated_time_savings_ms, estimated_cost_savings, implementation_details,
        confidence, status, applied_at, reverted_at, actual_time_savings_ms,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.pipeline_id,
      data.optimization_type,
      data.title,
      data.description,
      data.estimated_time_savings_ms,
      data.estimated_cost_savings || null,
      data.implementation_details || null,
      data.confidence,
      'suggested',
      null,
      null,
      null,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get optimization by ID
   */
  getById(id: string): DbPipelineOptimization | null {
    const db = getDatabase();
    return selectOne<DbPipelineOptimization>(db, 'SELECT * FROM pipeline_optimizations WHERE id = ?', id);
  },

  /**
   * Get optimizations by pipeline
   */
  getByPipeline(pipelineId: string): DbPipelineOptimization[] {
    const db = getDatabase();
    return selectAll<DbPipelineOptimization>(
      db,
      'SELECT * FROM pipeline_optimizations WHERE pipeline_id = ? ORDER BY created_at DESC',
      pipelineId
    );
  },

  /**
   * Get pending optimizations for a project
   */
  getPending(projectId: string): DbPipelineOptimization[] {
    const db = getDatabase();
    return selectAll<DbPipelineOptimization>(
      db,
      `SELECT * FROM pipeline_optimizations
       WHERE project_id = ? AND status = 'suggested'
       ORDER BY estimated_time_savings_ms DESC`,
      projectId
    );
  },

  /**
   * Update optimization status
   */
  updateStatus(id: string, status: DbPipelineOptimization['status'], actualTimeSavings?: number): DbPipelineOptimization | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    let appliedAt: string | null = null;
    let revertedAt: string | null = null;

    if (status === 'applied') {
      appliedAt = now;
    } else if (status === 'reverted') {
      revertedAt = now;
    }

    const stmt = db.prepare(`
      UPDATE pipeline_optimizations
      SET status = ?, applied_at = COALESCE(?, applied_at), reverted_at = ?,
          actual_time_savings_ms = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, appliedAt, revertedAt, actualTimeSavings || null, now, id);
    return this.getById(id);
  },

  /**
   * Delete optimization
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM pipeline_optimizations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export const ciDashboardRepository = {
  /**
   * Get dashboard stats for a project
   */
  getStats(projectId: string): CIDashboardStats {
    const db = getDatabase();

    // Pipeline counts
    const pipelineStats = selectOne<{ total: number; active: number }>(
      db,
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM ci_pipelines WHERE project_id = ?`,
      projectId
    );

    // Build stats (last 30 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const buildStats = selectOne<{ total: number; success: number; avgDuration: number }>(
      db,
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
              AVG(duration_ms) as avgDuration
       FROM build_executions
       WHERE project_id = ? AND created_at > ?`,
      projectId,
      cutoff.toISOString()
    );

    // Flaky tests count
    const flakyCount = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM flaky_tests
       WHERE project_id = ? AND status != 'fixed' AND flakiness_score > 10`,
      projectId
    );

    // Pending predictions
    const pendingPredictions = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM ci_predictions
       WHERE project_id = ? AND was_correct IS NULL`,
      projectId
    );

    // Recent failures (last 7 days)
    const weekCutoff = new Date();
    weekCutoff.setDate(weekCutoff.getDate() - 7);

    const recentFailures = selectOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM build_executions
       WHERE project_id = ? AND status = 'failure' AND created_at > ?`,
      projectId,
      weekCutoff.toISOString()
    );

    // Build trend
    const buildTrend = buildExecutionRepository.getBuildTrend(projectId, 14);

    const totalBuilds = buildStats?.total || 0;
    const successBuilds = buildStats?.success || 0;

    return {
      totalPipelines: pipelineStats?.total || 0,
      activePipelines: pipelineStats?.active || 0,
      totalBuilds,
      successRate: totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 100 * 100) / 100 : 100,
      averageBuildTime: Math.round(buildStats?.avgDuration || 0),
      flakyTestsCount: flakyCount?.count || 0,
      pendingPredictions: pendingPredictions?.count || 0,
      recentFailures: recentFailures?.count || 0,
      buildTrend,
    };
  },
};
