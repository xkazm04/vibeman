import { getConnection } from './drivers';
import { runMigrations } from './migrations/index';

/**
 * Initialize all database tables
 * Creates tables if they don't exist and runs migrations
 *
 * NOTE: This function is now called automatically by the driver factory.
 * It uses the driver-agnostic connection interface.
 */
export function initializeTables() {
  const db = getConnection();

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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
    );
  `);

  // Create context_groups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS context_groups (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
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
      group_id TEXT, -- Optional group assignment
      name TEXT NOT NULL,
      description TEXT,
      file_paths TEXT NOT NULL, -- JSON string of file paths array
      has_context_file INTEGER DEFAULT 0, -- Boolean flag for context file existence
      context_file_path TEXT, -- Path to the context file
      preview TEXT, -- Optional preview image path (relative to public folder)
      test_scenario TEXT, -- Testing steps for automated screenshots
      test_updated TEXT, -- Last time screenshot was taken
      target TEXT, -- Goal/target functionality of this context
      target_fulfillment TEXT, -- Current progress toward target
      implemented_tasks INTEGER DEFAULT 0, -- Counter for implemented tasks in this context
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES context_groups(id) ON DELETE SET NULL
    );
  `);

  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected')),
      agent TEXT,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create scans table with token tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT,
      input_tokens INTEGER, -- LLM input tokens used
      output_tokens INTEGER, -- LLM output tokens used
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
      implemented_at TEXT,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );
  `);

  // Create backlog_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS backlog_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      goal_id TEXT,
      agent TEXT NOT NULL CHECK (agent IN ('developer', 'mastermind', 'tester', 'artist', 'custom')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress')),
      type TEXT NOT NULL CHECK (type IN ('proposal', 'custom')),
      impacted_files TEXT, -- JSON string of ImpactedFile[]
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      rejected_at TEXT,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
    );
  `);

  // Create conversations table for Annette's memory
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create messages table for conversation history
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      memory_type TEXT, -- Free string for future categorization (e.g., 'user_preference', 'project_fact', 'action')
      metadata TEXT, -- JSON string for additional data
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // Create tech_debt table for Technical Debt Radar
  db.exec(`
    CREATE TABLE IF NOT EXISTS tech_debt (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_id TEXT,
      category TEXT NOT NULL CHECK (category IN (
        'code_quality', 'security', 'performance', 'maintainability',
        'testing', 'documentation', 'dependencies', 'architecture',
        'accessibility', 'other'
      )),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
      risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),

      -- Impact metrics
      estimated_effort_hours REAL,
      impact_scope TEXT, -- JSON array
      technical_impact TEXT,
      business_impact TEXT,

      -- Detection information
      detected_by TEXT NOT NULL CHECK (detected_by IN ('automated_scan', 'manual_entry', 'ai_analysis')),
      detection_details TEXT, -- JSON metadata
      file_paths TEXT, -- JSON array

      -- Remediation planning
      status TEXT NOT NULL CHECK (status IN ('detected', 'acknowledged', 'planned', 'in_progress', 'resolved', 'dismissed')),
      remediation_plan TEXT, -- JSON structured plan
      remediation_steps TEXT, -- JSON array
      estimated_completion_date TEXT,

      -- Integration
      backlog_item_id TEXT,
      goal_id TEXT,

      -- Timestamps
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      dismissed_at TEXT,
      dismissal_reason TEXT,

      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE SET NULL,
      FOREIGN KEY (backlog_item_id) REFERENCES backlog_items(id) ON DELETE SET NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );
  `);


  // Create scan_queue table for auto-queue & progress tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_queue (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      context_id TEXT,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'git_push', 'file_change', 'scheduled')),
      trigger_metadata TEXT, -- JSON metadata about trigger (e.g., file paths, commit hash)
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
      priority INTEGER DEFAULT 0, -- Higher priority = executed first
      progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
      progress_message TEXT, -- Current progress status message
      current_step TEXT, -- Current processing step
      total_steps INTEGER, -- Total number of steps
      scan_id TEXT, -- Reference to completed scan (once finished)
      result_summary TEXT, -- Brief summary of scan results
      error_message TEXT,
      auto_merge_enabled INTEGER DEFAULT 0, -- Boolean flag for auto-merge
      auto_merge_status TEXT, -- Status of auto-merge operation
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE SET NULL
    );
  `);

  // Create scan_notifications table for completion notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_notifications (
      id TEXT PRIMARY KEY,
      queue_item_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('scan_started', 'scan_completed', 'scan_failed', 'auto_merge_completed')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT, -- JSON payload with additional notification data
      read INTEGER DEFAULT 0, -- Boolean flag
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (queue_item_id) REFERENCES scan_queue(id) ON DELETE CASCADE
    );
  `);

  // Create file_watch_config table for file watcher settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_watch_config (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1, -- Boolean flag
      watch_patterns TEXT NOT NULL, -- JSON array of glob patterns to watch
      ignore_patterns TEXT, -- JSON array of glob patterns to ignore
      scan_types TEXT NOT NULL, -- JSON array of scan types to trigger
      debounce_ms INTEGER DEFAULT 5000, -- Debounce time in milliseconds
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create test_selectors table for testing automation
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_selectors (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL,
      data_testid TEXT NOT NULL,
      title TEXT NOT NULL, -- 1-4 words describing the interaction
      filepath TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
    );
  `);

  // Run migrations for existing databases
  runMigrations();

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
    CREATE INDEX IF NOT EXISTS idx_goals_order_index ON goals(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_goal_id ON backlog_items(goal_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_context_groups_project_id ON context_groups(project_id);
    CREATE INDEX IF NOT EXISTS idx_context_groups_position ON context_groups(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_contexts_project_id ON contexts(project_id);
    CREATE INDEX IF NOT EXISTS idx_contexts_group_id ON contexts(group_id);
    CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(project_id, type);
    CREATE INDEX IF NOT EXISTS idx_scans_project_id ON scans(project_id);
    CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(project_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_ideas_scan_id ON ideas(scan_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
    CREATE INDEX IF NOT EXISTS idx_implementation_log_project_id ON implementation_log(project_id);
    CREATE INDEX IF NOT EXISTS idx_implementation_log_created_at ON implementation_log(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_project_id ON tech_debt(project_id);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_status ON tech_debt(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_severity ON tech_debt(project_id, severity);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_category ON tech_debt(category);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_risk_score ON tech_debt(project_id, risk_score);
    CREATE INDEX IF NOT EXISTS idx_tech_debt_backlog_item ON tech_debt(backlog_item_id);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_project_id ON scan_queue(project_id);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON scan_queue(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_priority ON scan_queue(status, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_scan_queue_created_at ON scan_queue(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_scan_notifications_queue_item ON scan_notifications(queue_item_id);
    CREATE INDEX IF NOT EXISTS idx_scan_notifications_project ON scan_notifications(project_id, read);
    CREATE INDEX IF NOT EXISTS idx_file_watch_config_project_id ON file_watch_config(project_id);
    CREATE INDEX IF NOT EXISTS idx_test_selectors_context_id ON test_selectors(context_id);
    CREATE INDEX IF NOT EXISTS idx_test_selectors_filepath ON test_selectors(filepath);
  `);

  // Create test case management tables
  // Test scenarios table - stores test scenario names for contexts
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_scenarios (
      id TEXT PRIMARY KEY,
      context_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
    );
  `);

  // Test steps table - stores non-technical test steps for scenarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_case_steps (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      test_selector_id TEXT, -- Optional reference to test_selectors
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scenario_id) REFERENCES test_case_scenarios(id) ON DELETE CASCADE,
      FOREIGN KEY (test_selector_id) REFERENCES test_selectors(id) ON DELETE SET NULL
    );
  `);

  // Create indexes for test case tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_test_case_scenarios_context_id ON test_case_scenarios(context_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_steps_scenario_id ON test_case_steps(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_test_case_steps_order ON test_case_steps(scenario_id, step_order);
  `);
}
