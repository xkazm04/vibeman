import { getDatabase } from './connection';
import { runMigrations } from './migrations/index';

/**
 * Initialize all database tables
 * Creates tables if they don't exist and runs migrations
 */
export function initializeTables() {
  const db = getDatabase();

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
      effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3)),
      impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
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
      requirement_name TEXT NOT NULL,
      title TEXT NOT NULL,
      overview TEXT NOT NULL,
      tested INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create feature_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT,
      source TEXT NOT NULL CHECK (source IN ('ui', 'notion', 'jira', 'confluence', 'slack', 'api')),
      source_metadata TEXT,
      natural_language_description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'analyzing', 'code_generated', 'committed', 'approved', 'rejected', 'failed')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      ai_analysis TEXT,
      generated_code TEXT,
      generated_tests TEXT,
      generated_documentation TEXT,
      commit_sha TEXT,
      commit_url TEXT,
      error_message TEXT,
      developer_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);

  // Create feature_request_comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_request_comments (
      id TEXT PRIMARY KEY,
      feature_request_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT,
      comment_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (feature_request_id) REFERENCES feature_requests(id) ON DELETE CASCADE
    );
  `);

  // Create feature_request_notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_request_notifications (
      id TEXT PRIMARY KEY,
      feature_request_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('new_request', 'code_generated', 'committed', 'approved', 'rejected', 'failed')),
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
      error_message TEXT,
      FOREIGN KEY (feature_request_id) REFERENCES feature_requests(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_feature_requests_project_id ON feature_requests(project_id);
    CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feature_request_comments_request_id ON feature_request_comments(feature_request_id);
    CREATE INDEX IF NOT EXISTS idx_feature_request_notifications_request_id ON feature_request_notifications(feature_request_id);
    CREATE INDEX IF NOT EXISTS idx_feature_request_notifications_status ON feature_request_notifications(delivery_status);
  `);
}
