/**
 * Migration 046: Code Health Observatory Tables
 * Extends debt prediction with continuous observation, outcome tracking, and learning
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate046Observatory(db: Database.Database): void {
  // Analysis Snapshots - Track analysis runs with aggregate metrics
  if (!tableExists(db, 'analysis_snapshots')) {
    db.exec(`
      CREATE TABLE analysis_snapshots (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Snapshot timing
        snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('scheduled', 'triggered', 'manual', 'post_execution')),
        trigger_source TEXT, -- e.g., 'file_watcher', 'ci_pipeline', 'user', 'claude_code'

        -- Aggregate metrics at snapshot time
        total_files_analyzed INTEGER NOT NULL DEFAULT 0,
        total_issues_found INTEGER NOT NULL DEFAULT 0,
        total_predictions_active INTEGER NOT NULL DEFAULT 0,
        avg_complexity_score REAL,
        avg_health_score REAL,

        -- Issue breakdown by severity
        critical_count INTEGER NOT NULL DEFAULT 0,
        high_count INTEGER NOT NULL DEFAULT 0,
        medium_count INTEGER NOT NULL DEFAULT 0,
        low_count INTEGER NOT NULL DEFAULT 0,

        -- Trend indicators (vs previous snapshot)
        health_delta REAL, -- Change in health score
        complexity_delta REAL, -- Change in avg complexity
        issue_velocity REAL, -- Rate of new issues

        -- Processing info
        duration_ms INTEGER,
        tokens_used INTEGER,
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
        error_message TEXT,

        -- Metadata
        metadata TEXT, -- JSON for additional context
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_analysis_snapshots_project ON analysis_snapshots(project_id);
      CREATE INDEX idx_analysis_snapshots_created ON analysis_snapshots(created_at DESC);
      CREATE INDEX idx_analysis_snapshots_type ON analysis_snapshots(project_id, snapshot_type);
    `);
    console.log('[Migration 046] Created analysis_snapshots table');
  }

  // Prediction Outcomes - Track prediction accuracy for learning
  if (!tableExists(db, 'prediction_outcomes')) {
    db.exec(`
      CREATE TABLE prediction_outcomes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        prediction_id TEXT NOT NULL,
        snapshot_id TEXT, -- Analysis snapshot where outcome was determined

        -- Prediction details at time of creation
        original_confidence REAL NOT NULL,
        original_urgency REAL NOT NULL,
        prediction_type TEXT NOT NULL,
        predicted_severity TEXT NOT NULL,

        -- Outcome classification
        outcome_type TEXT NOT NULL CHECK (outcome_type IN (
          'confirmed', -- Prediction was correct, issue materialized
          'false_positive', -- Prediction was wrong, no issue occurred
          'prevented', -- User took action and prevented the issue
          'escalated', -- Issue got worse than predicted
          'resolved_naturally', -- Issue resolved without intervention
          'still_pending' -- Not enough time has passed to determine
        )),

        -- Accuracy metrics
        time_to_outcome_days REAL, -- Days from prediction to outcome
        actual_severity TEXT, -- If confirmed, what was the actual severity
        severity_accuracy REAL, -- How close was our severity prediction (0-1)
        timing_accuracy REAL, -- How close was our timing prediction (0-1)

        -- Learning data
        pattern_id TEXT, -- Pattern that generated this prediction
        contributing_signals TEXT, -- JSON array of signals that informed prediction
        user_action_taken TEXT, -- What the user did (if anything)

        -- Feedback
        user_feedback TEXT CHECK (user_feedback IN ('accurate', 'inaccurate', 'partially_accurate', null)),
        feedback_notes TEXT,

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );

      CREATE INDEX idx_prediction_outcomes_project ON prediction_outcomes(project_id);
      CREATE INDEX idx_prediction_outcomes_prediction ON prediction_outcomes(prediction_id);
      CREATE INDEX idx_prediction_outcomes_pattern ON prediction_outcomes(pattern_id);
      CREATE INDEX idx_prediction_outcomes_type ON prediction_outcomes(outcome_type);
    `);
    console.log('[Migration 046] Created prediction_outcomes table');
  }

  // Execution Outcomes - Track Claude Code execution results for learning
  if (!tableExists(db, 'execution_outcomes')) {
    db.exec(`
      CREATE TABLE execution_outcomes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        execution_id TEXT NOT NULL, -- Reference to implementation_log or task execution
        prediction_id TEXT, -- If execution was for a predicted issue

        -- Execution context
        execution_type TEXT NOT NULL CHECK (execution_type IN (
          'refactor', 'fix', 'prevention', 'enhancement', 'test', 'documentation'
        )),
        requirement_content TEXT, -- The requirement that was executed
        target_files TEXT, -- JSON array of files targeted

        -- Pre-execution state
        pre_complexity_scores TEXT, -- JSON map of file -> complexity before
        pre_health_score REAL,
        pre_issue_count INTEGER,

        -- Execution results
        success INTEGER NOT NULL DEFAULT 0, -- Boolean
        files_changed TEXT, -- JSON array of changed files
        lines_added INTEGER,
        lines_removed INTEGER,
        execution_duration_ms INTEGER,
        tokens_used INTEGER,

        -- Post-execution state
        post_complexity_scores TEXT, -- JSON map of file -> complexity after
        post_health_score REAL,
        post_issue_count INTEGER,

        -- Calculated impacts
        complexity_improvement REAL, -- Positive = improvement
        health_improvement REAL,
        issues_resolved INTEGER,
        new_issues_introduced INTEGER,

        -- Outcome assessment
        outcome_rating TEXT CHECK (outcome_rating IN (
          'excellent', 'good', 'neutral', 'poor', 'failed', 'pending_review'
        )),
        regression_detected INTEGER NOT NULL DEFAULT 0, -- Boolean
        regression_details TEXT,

        -- Learning signals
        successful_patterns TEXT, -- JSON array of patterns that worked
        failed_patterns TEXT, -- JSON array of patterns that didn't work

        -- User feedback
        user_accepted INTEGER, -- Boolean, null if pending
        user_feedback TEXT,

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE INDEX idx_execution_outcomes_project ON execution_outcomes(project_id);
      CREATE INDEX idx_execution_outcomes_execution ON execution_outcomes(execution_id);
      CREATE INDEX idx_execution_outcomes_prediction ON execution_outcomes(prediction_id);
      CREATE INDEX idx_execution_outcomes_rating ON execution_outcomes(outcome_rating);
      CREATE INDEX idx_execution_outcomes_success ON execution_outcomes(success);
    `);
    console.log('[Migration 046] Created execution_outcomes table');
  }

  // Learned Patterns - Enhanced patterns with auto-fix capabilities
  if (!tableExists(db, 'learned_patterns')) {
    db.exec(`
      CREATE TABLE learned_patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT, -- NULL for global patterns
        base_pattern_id TEXT, -- Reference to debt_patterns if derived

        -- Pattern identification
        name TEXT NOT NULL,
        description TEXT,
        pattern_type TEXT NOT NULL CHECK (pattern_type IN (
          'complexity', 'duplication', 'coupling', 'smell',
          'security', 'performance', 'style', 'architecture'
        )),
        category TEXT NOT NULL, -- Specific sub-category

        -- Detection configuration
        detection_rules TEXT NOT NULL, -- JSON detection configuration
        file_patterns TEXT, -- JSON array of glob patterns
        code_signatures TEXT, -- JSON array of code patterns

        -- Auto-fix capabilities
        has_auto_fix INTEGER NOT NULL DEFAULT 0,
        auto_fix_template TEXT, -- Template for generating fix requirement
        auto_fix_confidence REAL, -- Confidence in auto-fix (0-1)
        auto_fix_risk TEXT CHECK (auto_fix_risk IN ('low', 'medium', 'high')),
        requires_review INTEGER NOT NULL DEFAULT 1, -- Whether human review needed

        -- Learning metrics
        total_detections INTEGER NOT NULL DEFAULT 0,
        true_positives INTEGER NOT NULL DEFAULT 0,
        false_positives INTEGER NOT NULL DEFAULT 0,
        auto_fixes_attempted INTEGER NOT NULL DEFAULT 0,
        auto_fixes_successful INTEGER NOT NULL DEFAULT 0,
        user_overrides INTEGER NOT NULL DEFAULT 0, -- Times user changed auto-fix

        -- Calculated scores
        precision_score REAL, -- true_positives / (true_positives + false_positives)
        auto_fix_success_rate REAL,
        confidence_score REAL, -- Overall confidence in this pattern

        -- Lifecycle
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
          'learning', 'active', 'deprecated', 'suspended'
        )),
        min_samples_for_auto_fix INTEGER NOT NULL DEFAULT 5,

        -- Source tracking
        source TEXT NOT NULL CHECK (source IN ('learned', 'predefined', 'imported', 'user_created')),
        learned_from_outcomes TEXT, -- JSON array of outcome IDs that informed this

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_learned_patterns_project ON learned_patterns(project_id);
      CREATE INDEX idx_learned_patterns_type ON learned_patterns(pattern_type);
      CREATE INDEX idx_learned_patterns_status ON learned_patterns(status);
      CREATE INDEX idx_learned_patterns_autofix ON learned_patterns(has_auto_fix);
    `);
    console.log('[Migration 046] Created learned_patterns table');
  }

  // Health Metrics History - Time series for visualizations
  if (!tableExists(db, 'health_metrics_history')) {
    db.exec(`
      CREATE TABLE health_metrics_history (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        snapshot_id TEXT, -- Reference to analysis_snapshots

        -- Core metrics
        metric_type TEXT NOT NULL CHECK (metric_type IN (
          'overall_health', 'complexity', 'test_coverage',
          'duplication', 'security', 'performance', 'maintainability'
        )),
        metric_value REAL NOT NULL,

        -- Context
        scope TEXT NOT NULL DEFAULT 'project' CHECK (scope IN ('project', 'context', 'file')),
        scope_id TEXT, -- context_id or file_path depending on scope

        -- Trend data
        previous_value REAL,
        delta REAL,
        trend TEXT CHECK (trend IN ('improving', 'stable', 'degrading')),
        velocity REAL, -- Rate of change per day

        -- Thresholds
        threshold_warning REAL,
        threshold_critical REAL,
        status TEXT CHECK (status IN ('healthy', 'warning', 'critical')),

        measured_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_health_metrics_project ON health_metrics_history(project_id);
      CREATE INDEX idx_health_metrics_type ON health_metrics_history(project_id, metric_type);
      CREATE INDEX idx_health_metrics_measured ON health_metrics_history(measured_at DESC);
      CREATE INDEX idx_health_metrics_scope ON health_metrics_history(scope, scope_id);
    `);
    console.log('[Migration 046] Created health_metrics_history table');
  }

  // Auto-fix Queue - Queue for pending auto-fixes
  if (!tableExists(db, 'auto_fix_queue')) {
    db.exec(`
      CREATE TABLE auto_fix_queue (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        prediction_id TEXT NOT NULL,
        pattern_id TEXT NOT NULL,

        -- Fix details
        title TEXT NOT NULL,
        description TEXT,
        target_files TEXT NOT NULL, -- JSON array
        generated_requirement TEXT NOT NULL, -- The requirement to execute

        -- Priority and scheduling
        priority INTEGER NOT NULL DEFAULT 5, -- 1-10
        urgency_score REAL,
        confidence_score REAL,
        estimated_impact TEXT CHECK (estimated_impact IN ('low', 'medium', 'high')),

        -- Risk assessment
        risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
        requires_backup INTEGER NOT NULL DEFAULT 1,
        requires_tests INTEGER NOT NULL DEFAULT 1,

        -- Status tracking
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'approved', 'executing', 'completed',
          'failed', 'rejected', 'expired'
        )),
        approved_by TEXT, -- 'auto' or user identifier
        approved_at TEXT,
        execution_id TEXT, -- Reference to execution when run

        -- Expiry
        expires_at TEXT, -- Auto-reject if not approved by this time

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_auto_fix_queue_project ON auto_fix_queue(project_id);
      CREATE INDEX idx_auto_fix_queue_status ON auto_fix_queue(status);
      CREATE INDEX idx_auto_fix_queue_priority ON auto_fix_queue(priority DESC);
      CREATE INDEX idx_auto_fix_queue_prediction ON auto_fix_queue(prediction_id);
    `);
    console.log('[Migration 046] Created auto_fix_queue table');
  }
}
