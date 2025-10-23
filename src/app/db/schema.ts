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
      category TEXT NOT NULL CHECK (category IN ('functionality', 'performance', 'maintenance', 'ui', 'code_quality', 'user_benefit')),
      title TEXT NOT NULL,
      description TEXT,
      reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
      user_feedback TEXT,
      user_pattern INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
      FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
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
  `);
}
