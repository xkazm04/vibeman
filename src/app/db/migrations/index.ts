import { getConnection } from '../drivers';
import {
  addColumnIfNotExists,
  addColumnsIfNotExist,
  createTableIfNotExists,
  getTableInfo,
  hasColumn,
  safeMigration,
  type MigrationLogger,
  type ColumnInfo
} from './migration.utils';

/**
 * Migration logger utility
 * Provides structured logging for database migrations
 */
const migrationLogger: MigrationLogger = {
  info: (message: string) => {
    // In production, this could write to a file or logging service
    if (process.env.NODE_ENV !== 'test') {
      // Silent in test environment to avoid noise
      // In production, consider using a proper logging library
    }
  },
  error: (message: string, error?: unknown) => {
    // In production, this should be logged to error tracking
    if (process.env.NODE_ENV !== 'test') {
      // Silent in test environment
      // In production, consider using a proper logging library
    }
  },
  success: (message: string) => {
    if (process.env.NODE_ENV !== 'test') {
      // Silent in test environment
    }
  }
};

/**
 * Run all database migrations
 * Handles schema updates for existing databases
 *
 * NOTE: This function is now called automatically by the driver factory.
 * It uses the driver-agnostic connection interface.
 */
export function runMigrations() {
  const db = getConnection();

  try {
    // Migration 1: Add token columns to scans table
    migrateScansTokenColumns();

    // Migration 2: Update contexts table with new columns
    migrateContextsTable();

    // Migration 3: Update goals table with context_id support
    migrateGoalsTable();

    // Migration 4: Add scan_type column to ideas table
    migrateIdeasScanType();

    // Migration 5: Add effort and impact columns to ideas table
    migrateIdeasEffortImpact();

    // Migration 6: Add implemented_at column to ideas table
    migrateIdeasImplementedAt();

    // Migration 7: Remove category CHECK constraint from ideas table
    migrateIdeasCategoryConstraint();

    // Migration 8: Add requirement_id and goal_id columns to ideas table
    migrateIdeasRequirementAndGoal();

    // Migration 9: Add test_scenario and test_updated columns to contexts table
    migrateContextsTestingColumns();

    // Migration 10: Create test_selectors table
    migrateTestSelectorsTable();

    // Migration 11: Create security pipeline tables
    migrateSecurityPipelineTables();

    // Migration 12: Create goal_candidates table
    migrateGoalCandidatesTable();
    // Migration 13: Create voicebot_analytics table
    migrateVoicebotAnalyticsTable();
    // Migration 14: Add context_id column to events table
    migrateEventsContextId();
    // Migration 15: Create test_scenarios table
    migrateTestScenariosTable();
    // Migration 16: Create test_executions table
    migrateTestExecutionsTable();
    // Migration 17: Create visual_diffs table
    migrateVisualDiffsTable();
    // Migration 18: Create scan predictions tables
    migrateScanPredictionsTables();
    // Migration 19: Add target fields to contexts table
    migrateContextsTargetFields();
    // Migration 20: Create test case management tables
    migrateTestCaseManagementTables();
    // Migration 21: Add implemented_tasks column to contexts table
    migrateContextsImplementedTasks();
    // Migration 22: Add context_id column to implementation_log table
    migrateImplementationLogContextId();
    // Migration 23: Add screenshot column to implementation_log table
    migrateImplementationLogScreenshot();
    // Migration 24: Add overview_bullets column to implementation_log table
    migrateImplementationLogOverviewBullets();

    migrationLogger.success('Database migrations completed successfully');
  } catch (error) {
    migrationLogger.error('Error running database migrations', error);
    // Don't throw the error to prevent app from crashing
    // The app should still work with the existing schema
  }
}

/**
 * Add input_tokens and output_tokens columns to scans table
 */
function migrateScansTokenColumns() {
  safeMigration('scansTokenColumns', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'scans', [
      { name: 'input_tokens', definition: 'INTEGER' },
      { name: 'output_tokens', definition: 'INTEGER' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Scans table already has token tracking columns');
    }
  }, migrationLogger);
}

/**
 * Update contexts table with new columns
 */
function migrateContextsTable() {
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(contexts)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasContextFileColumn = tableInfo.some(col => col.name === 'has_context_file');
    const hasContextFilePathColumn = tableInfo.some(col => col.name === 'context_file_path');
    const hasPreviewColumn = tableInfo.some(col => col.name === 'preview');

    // Add missing columns if they don't exist
    if (!hasContextFileColumn) {
      migrationLogger.info('Adding has_context_file column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN has_context_file INTEGER DEFAULT 0`);
    }

    if (!hasContextFilePathColumn) {
      migrationLogger.info('Adding context_file_path column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN context_file_path TEXT`);
    }

    if (!hasPreviewColumn) {
      migrationLogger.info('Adding preview column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN preview TEXT`);
    }

    // Check if group_id constraint needs to be updated to allow NULL
    const groupIdColumn = tableInfo.find(col => col.name === 'group_id');

    // If group_id is NOT NULL, we need to update the schema
    if (groupIdColumn && groupIdColumn.notnull === 1) {
      migrationLogger.info('Updating contexts table to make group_id optional...');

      // Backup existing contexts
      const existingContexts = db.prepare('SELECT * FROM contexts').all();

      // Drop and recreate the contexts table with optional group_id
      db.exec('DROP TABLE IF EXISTS contexts_backup');
      db.exec(`CREATE TABLE contexts_backup AS SELECT * FROM contexts`);

      db.exec('DROP TABLE contexts');

      db.exec(`
        CREATE TABLE contexts (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          group_id TEXT, -- Optional group assignment
          name TEXT NOT NULL,
          description TEXT,
          file_paths TEXT NOT NULL, -- JSON string of file paths array
          has_context_file INTEGER DEFAULT 0, -- Boolean flag for context file existence
          context_file_path TEXT, -- Path to the context file
          preview TEXT, -- Optional preview image path
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (group_id) REFERENCES context_groups(id) ON DELETE SET NULL
        )
      `);

      // Restore data
      if (existingContexts.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, preview, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const context of existingContexts as Array<Record<string, unknown>>) {
          insertStmt.run(
            String(context.id),
            String(context.project_id),
            context.group_id as string | null,
            String(context.name),
            context.description as string | null,
            String(context.file_paths),
            Number(context.has_context_file) || 0,
            (context.context_file_path as string) || null,
            (context.preview as string) || null,
            String(context.created_at),
            String(context.updated_at)
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE contexts_backup');

      migrationLogger.info('Contexts table migration completed successfully');
    } else {
      migrationLogger.info('Contexts table already supports optional group_id');
    }
  } catch (error) {
    migrationLogger.error('Error during contexts table migration:', error);
  }
}

/**
 * Update goals table with context_id support
 */
function migrateGoalsTable() {
  const db = getConnection();

  try {
    const goalsTableInfo = db.prepare("PRAGMA table_info(goals)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasContextIdColumn = goalsTableInfo.some(col => col.name === 'context_id');

    // If context_id doesn't exist, we need to recreate the table
    if (!hasContextIdColumn) {
      migrationLogger.info('Goals table needs context_id column, recreating table...');

      // Backup existing goals
      const existingGoals = db.prepare('SELECT * FROM goals').all();

      // Drop and recreate the goals table with context_id
      db.exec('DROP TABLE IF EXISTS goals_backup');
      db.exec(`CREATE TABLE goals_backup AS SELECT * FROM goals`);

      db.exec('DROP TABLE goals');

      db.exec(`
        CREATE TABLE goals (
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
        )
      `);

      // Restore data (without context_id since it didn't exist before)
      if (existingGoals.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const goal of existingGoals as Array<Record<string, unknown>>) {
          insertStmt.run(
            String(goal.id),
            String(goal.project_id),
            null, // context_id defaults to null for existing goals
            Number(goal.order_index),
            String(goal.title),
            goal.description as string | null,
            String(goal.status),
            String(goal.created_at),
            String(goal.updated_at)
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE goals_backup');

      migrationLogger.info('Goals table migration with context_id completed successfully');
    } else {
      migrationLogger.info('Goals table already has context_id column');
    }

    // Try to insert a test record with 'undecided' status to check if constraint allows it
    const testId = 'migration-test-' + Date.now();
    const testStmt = db.prepare(`
      INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      testStmt.run(testId, 'test-project', null, 1, 'Test Goal', 'Test Description', 'undecided', new Date().toISOString(), new Date().toISOString());

      // If successful, clean up the test record
      const deleteStmt = db.prepare('DELETE FROM goals WHERE id = ?');
      deleteStmt.run(testId);

      migrationLogger.info('Goals table already supports new status values');
    } catch (constraintError) {
      migrationLogger.info('Goals table needs status constraint migration, recreating table...');

      // Backup existing goals
      const existingGoals = db.prepare('SELECT * FROM goals').all();

      // Drop and recreate the goals table with updated constraint
      db.exec('DROP TABLE IF NOT EXISTS goals_backup');
      db.exec(`CREATE TABLE goals_backup AS SELECT * FROM goals`);

      db.exec('DROP TABLE goals');

      db.exec(`
        CREATE TABLE goals (
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
        )
      `);

      // Restore data
      if (existingGoals.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const goal of existingGoals as Array<Record<string, unknown>>) {
          insertStmt.run(
            String(goal.id),
            String(goal.project_id),
            (goal.context_id as string) || null,
            Number(goal.order_index),
            String(goal.title),
            goal.description as string | null,
            String(goal.status),
            String(goal.created_at),
            String(goal.updated_at)
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE goals_backup');

      migrationLogger.info('Goals table migration completed successfully');
    }
  } catch (error) {
    migrationLogger.error('Error during goals table migration:', error);
  }
}

/**
 * Add scan_type column to ideas table
 */
function migrateIdeasScanType() {
  safeMigration('ideasScanType', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(db, 'ideas', 'scan_type', "TEXT DEFAULT 'overall'", migrationLogger);

    if (!added) {
      migrationLogger.info('Ideas table already has scan_type column');
    }
  }, migrationLogger);
}

/**
 * Add effort and impact columns to ideas table
 */
function migrateIdeasEffortImpact() {
  safeMigration('ideasEffortImpact', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'ideas', [
      { name: 'effort', definition: 'INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3))' },
      { name: 'impact', definition: 'INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3))' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Ideas table already has effort and impact columns');
    }
  }, migrationLogger);
}

/**
 * Add implemented_at column to ideas table
 */
function migrateIdeasImplementedAt() {
  safeMigration('ideasImplementedAt', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(db, 'ideas', 'implemented_at', 'TEXT', migrationLogger);

    if (!added) {
      migrationLogger.info('Ideas table already has implemented_at column');
    }
  }, migrationLogger);
}

/**
 * Remove category CHECK constraint from ideas table
 * This allows any string value for category instead of restricting to specific values
 */
function migrateIdeasCategoryConstraint() {
  const db = getConnection();

  try {
    // Test if we can insert a non-standard category value
    const testId = 'category-test-' + Date.now();
    const testInsert = db.prepare(`
      INSERT INTO ideas (id, scan_id, project_id, scan_type, category, title, status, created_at, updated_at)
      VALUES (?, 'test-scan', 'test-project', 'test', 'custom_category_test', 'Test', 'pending', ?, ?)
    `);

    try {
      const now = new Date().toISOString();
      testInsert.run(testId, now, now);

      // If successful, cleanup the test record and exit (no migration needed)
      const deleteStmt = db.prepare('DELETE FROM ideas WHERE id = ?');
      deleteStmt.run(testId);

      migrationLogger.info('Ideas table already supports flexible category values');
      return;
    } catch (constraintError) {
      migrationLogger.info('Ideas table has category constraint, removing it...');

      // Backup existing ideas
      const existingIdeas = db.prepare('SELECT * FROM ideas').all();

      // Drop and recreate the ideas table without category constraint
      db.exec('DROP TABLE IF EXISTS ideas_backup');
      db.exec(`CREATE TABLE ideas_backup AS SELECT * FROM ideas`);

      db.exec('DROP TABLE ideas');

      db.exec(`
        CREATE TABLE ideas (
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
          implemented_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
          FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
        )
      `);

      // Restore data
      if (existingIdeas.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO ideas (
            id, scan_id, project_id, context_id, scan_type, category, title, description,
            reasoning, status, user_feedback, user_pattern, effort, impact, implemented_at,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const idea of existingIdeas as Array<Record<string, unknown>>) {
          insertStmt.run(
            String(idea.id),
            String(idea.scan_id),
            String(idea.project_id),
            (idea.context_id as string) || null,
            String(idea.scan_type || 'overall'),
            String(idea.category || 'general'),
            String(idea.title),
            (idea.description as string) || null,
            (idea.reasoning as string) || null,
            String(idea.status || 'pending'),
            (idea.user_feedback as string) || null,
            Number(idea.user_pattern || 0),
            (idea.effort as number) || null,
            (idea.impact as number) || null,
            (idea.implemented_at as string) || null,
            String(idea.created_at),
            String(idea.updated_at)
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE ideas_backup');

      // Recreate indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ideas_scan_id ON ideas(scan_id);
        CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
        CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
        CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
      `);

      migrationLogger.info('Ideas table category constraint removed successfully');
    }
  } catch (error) {
    migrationLogger.error('Error during ideas category constraint migration:', error);
  }
}

/**
 * Add requirement_id and goal_id columns to ideas table
 */
function migrateIdeasRequirementAndGoal() {
  safeMigration('ideasRequirementAndGoal', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'ideas', [
      { name: 'requirement_id', definition: 'TEXT' },
      { name: 'goal_id', definition: 'TEXT REFERENCES goals(id) ON DELETE SET NULL' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Ideas table already has requirement_id and goal_id columns');
    }
  }, migrationLogger);
}

/**
 * Add test_scenario and test_updated columns to contexts table
 */
function migrateContextsTestingColumns() {
  safeMigration('contextsTestingColumns', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'contexts', [
      { name: 'test_scenario', definition: 'TEXT' },
      { name: 'test_updated', definition: 'TEXT' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Contexts table already has testing columns');
    }
  }, migrationLogger);
}

/**
 * Create test_selectors table if it doesn't exist
 */
function migrateTestSelectorsTable() {
  safeMigration('testSelectorsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'test_selectors', `
      CREATE TABLE test_selectors (
        id TEXT PRIMARY KEY,
        context_id TEXT NOT NULL,
        data_testid TEXT NOT NULL,
        title TEXT NOT NULL,
        filepath TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      // Create indexes
      db.exec(`
        CREATE INDEX idx_test_selectors_context_id ON test_selectors(context_id);
        CREATE INDEX idx_test_selectors_filepath ON test_selectors(filepath);
      `);
      migrationLogger.info('test_selectors table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create security pipeline tables
 */
function migrateSecurityPipelineTables() {
  const db = getConnection();

  try {
    // Check if security_scans table exists
    const scansTableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='security_scans'
    `).get();

    if (!scansTableExists) {
      migrationLogger.info('Creating security_scans table');
      db.exec(`
        CREATE TABLE security_scans (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          scan_date TEXT NOT NULL,
          total_vulnerabilities INTEGER NOT NULL,
          critical_count INTEGER NOT NULL,
          high_count INTEGER NOT NULL,
          medium_count INTEGER NOT NULL,
          low_count INTEGER NOT NULL,
          scan_output TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN (
            'pending', 'analyzing', 'patch_generated', 'pr_created',
            'tests_running', 'tests_passed', 'tests_failed', 'merged', 'failed'
          )),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.exec(`
        CREATE INDEX idx_security_scans_project_id ON security_scans(project_id);
        CREATE INDEX idx_security_scans_scan_date ON security_scans(project_id, scan_date);
        CREATE INDEX idx_security_scans_status ON security_scans(project_id, status);
      `);

      migrationLogger.info('security_scans table created successfully');
    }

    // Check if security_patches table exists
    const patchesTableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='security_patches'
    `).get();

    if (!patchesTableExists) {
      migrationLogger.info('Creating security_patches table');
      db.exec(`
        CREATE TABLE security_patches (
          id TEXT PRIMARY KEY,
          scan_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          vulnerability_id TEXT NOT NULL,
          package_name TEXT NOT NULL,
          current_version TEXT NOT NULL,
          fixed_version TEXT NOT NULL,
          severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
          description TEXT NOT NULL,
          ai_analysis TEXT,
          patch_proposal TEXT,
          patch_applied INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (scan_id) REFERENCES security_scans(id) ON DELETE CASCADE
        )
      `);

      db.exec(`
        CREATE INDEX idx_security_patches_scan_id ON security_patches(scan_id);
        CREATE INDEX idx_security_patches_project_id ON security_patches(project_id);
        CREATE INDEX idx_security_patches_severity ON security_patches(severity);
      `);

      migrationLogger.info('security_patches table created successfully');
    }

    // Check if security_prs table exists
    const prsTableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='security_prs'
    `).get();

    if (!prsTableExists) {
      migrationLogger.info('Creating security_prs table');
      db.exec(`
        CREATE TABLE security_prs (
          id TEXT PRIMARY KEY,
          scan_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          pr_number INTEGER,
          pr_url TEXT,
          branch_name TEXT NOT NULL,
          commit_sha TEXT,
          test_status TEXT NOT NULL CHECK (test_status IN ('pending', 'running', 'passed', 'failed', 'cancelled')),
          test_output TEXT,
          merge_status TEXT NOT NULL CHECK (merge_status IN ('pending', 'merged', 'rejected', 'conflict')),
          merge_error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (scan_id) REFERENCES security_scans(id) ON DELETE CASCADE
        )
      `);

      db.exec(`
        CREATE INDEX idx_security_prs_scan_id ON security_prs(scan_id);
        CREATE INDEX idx_security_prs_project_id ON security_prs(project_id);
        CREATE INDEX idx_security_prs_test_status ON security_prs(test_status);
        CREATE INDEX idx_security_prs_merge_status ON security_prs(merge_status);
      `);

      migrationLogger.info('security_prs table created successfully');
    }

    if (scansTableExists && patchesTableExists && prsTableExists) {
      migrationLogger.info('Security pipeline tables already exist');
    }
  } catch (error) {
    migrationLogger.error('Error creating security pipeline tables:', error);
  }
}

/**
 * Create goal_candidates table for AI-generated goal suggestions
 */
function migrateGoalCandidatesTable() {
  safeMigration('goalCandidatesTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'goal_candidates', `
      CREATE TABLE goal_candidates (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        reasoning TEXT,
        priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
        source TEXT NOT NULL,
        source_metadata TEXT,
        suggested_status TEXT NOT NULL DEFAULT 'open' CHECK (suggested_status IN ('open', 'in_progress', 'done', 'rejected', 'undecided')),
        user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'tweaked', 'pending')),
        goal_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_goal_candidates_project_id ON goal_candidates(project_id);
        CREATE INDEX idx_goal_candidates_user_action ON goal_candidates(project_id, user_action);
        CREATE INDEX idx_goal_candidates_priority_score ON goal_candidates(project_id, priority_score DESC);
        CREATE INDEX idx_goal_candidates_created_at ON goal_candidates(project_id, created_at);
      `);
      migrationLogger.info('goal_candidates table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create voicebot_analytics table for tracking command usage
 */
function migrateVoicebotAnalyticsTable() {
  safeMigration('voicebotAnalyticsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'voicebot_analytics', `
      CREATE TABLE voicebot_analytics (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        command_type TEXT NOT NULL CHECK (command_type IN ('button_command', 'voice_command', 'text_command')),
        execution_time_ms INTEGER NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        stt_ms INTEGER,
        llm_ms INTEGER,
        tts_ms INTEGER,
        total_ms INTEGER,
        provider TEXT,
        model TEXT,
        tools_used TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_voicebot_analytics_project_id ON voicebot_analytics(project_id);
        CREATE INDEX idx_voicebot_analytics_command_name ON voicebot_analytics(project_id, command_name);
        CREATE INDEX idx_voicebot_analytics_timestamp ON voicebot_analytics(project_id, timestamp);
        CREATE INDEX idx_voicebot_analytics_success ON voicebot_analytics(project_id, success);
      `);
      migrationLogger.info('voicebot_analytics table created successfully');
    }
  }, migrationLogger);
}

/**
 * Add context_id column to events table
 */
function migrateEventsContextId() {
  safeMigration('eventsContextId', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'events',
      'context_id',
      'TEXT REFERENCES contexts(id) ON DELETE SET NULL',
      migrationLogger
    );

    if (added) {
      // Create indexes for better query performance
      db.exec(`CREATE INDEX IF NOT EXISTS idx_events_context_id ON events(context_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_events_title_context ON events(project_id, title, context_id)`);
      migrationLogger.info('context_id column added to events table successfully');
    } else {
      migrationLogger.info('Events table already has context_id column');
    }
  }, migrationLogger);
}

/**
 * Create test_scenarios table for AI-generated test scenarios
 */
function migrateTestScenariosTable() {
  safeMigration('testScenariosTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'test_scenarios', `
      CREATE TABLE test_scenarios (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        user_flows TEXT NOT NULL, -- JSON array of user interaction steps
        component_tree TEXT, -- JSON representation of component hierarchy
        test_skeleton TEXT, -- Generated Playwright test code
        data_testids TEXT, -- JSON array of required data-testid attributes
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'ready', 'running', 'completed', 'failed')),
        ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
        created_by TEXT NOT NULL CHECK (created_by IN ('ai', 'manual')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_test_scenarios_project_id ON test_scenarios(project_id);
        CREATE INDEX idx_test_scenarios_context_id ON test_scenarios(context_id);
        CREATE INDEX idx_test_scenarios_status ON test_scenarios(project_id, status);
      `);
      migrationLogger.info('test_scenarios table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create test_executions table for test run results
 */
function migrateTestExecutionsTable() {
  safeMigration('testExecutionsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'test_executions', `
      CREATE TABLE test_executions (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'passed', 'failed', 'skipped')),
        execution_time_ms INTEGER,
        error_message TEXT,
        console_output TEXT,
        screenshots TEXT, -- JSON array of screenshot file paths
        coverage_data TEXT, -- JSON coverage report
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_test_executions_scenario_id ON test_executions(scenario_id);
        CREATE INDEX idx_test_executions_project_id ON test_executions(project_id);
        CREATE INDEX idx_test_executions_status ON test_executions(status);
        CREATE INDEX idx_test_executions_created_at ON test_executions(project_id, created_at DESC);
      `);
      migrationLogger.info('test_executions table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create visual_diffs table for screenshot comparison
 */
function migrateVisualDiffsTable() {
  safeMigration('visualDiffsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'visual_diffs', `
      CREATE TABLE visual_diffs (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        baseline_screenshot TEXT NOT NULL, -- File path to baseline image
        current_screenshot TEXT NOT NULL, -- File path to current image
        diff_screenshot TEXT, -- File path to diff image (if differences found)
        diff_percentage REAL, -- Percentage of pixels different
        has_differences INTEGER DEFAULT 0, -- Boolean flag
        step_name TEXT NOT NULL, -- Name of the test step
        viewport_width INTEGER,
        viewport_height INTEGER,
        metadata TEXT, -- JSON metadata (browser, device, etc.)
        reviewed INTEGER DEFAULT 0, -- Boolean flag for manual review
        approved INTEGER DEFAULT 0, -- Boolean flag for approval
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (execution_id) REFERENCES test_executions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_visual_diffs_execution_id ON visual_diffs(execution_id);
        CREATE INDEX idx_visual_diffs_has_differences ON visual_diffs(has_differences);
        CREATE INDEX idx_visual_diffs_reviewed ON visual_diffs(reviewed);
      `);
      migrationLogger.info('visual_diffs table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create scan predictions and history tables
 * Enables predictive scan scheduling based on file change patterns
 */
function migrateScanPredictionsTables() {
  const db = getConnection();

  // Create scan_history table
  safeMigration('scanHistoryTable', () => {
    const created = createTableIfNotExists(db, 'scan_history', `
      CREATE TABLE scan_history (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        context_id TEXT,
        triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'scheduled', 'file_change', 'commit')),
        file_changes TEXT, -- JSON array of changed file paths
        commit_sha TEXT, -- Git commit hash if triggered by commit
        execution_time_ms INTEGER,
        status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
        error_message TEXT,
        findings_count INTEGER DEFAULT 0, -- Number of issues/ideas generated
        staleness_score REAL, -- 0-100 score indicating how stale the scan was
        executed_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_scan_history_project_id ON scan_history(project_id);
        CREATE INDEX idx_scan_history_scan_type ON scan_history(project_id, scan_type);
        CREATE INDEX idx_scan_history_executed_at ON scan_history(project_id, executed_at DESC);
        CREATE INDEX idx_scan_history_context_id ON scan_history(context_id);
      `);
      migrationLogger.info('scan_history table created successfully');
    }
  }, migrationLogger);

  // Create scan_predictions table
  safeMigration('scanPredictionsTable', () => {
    const created = createTableIfNotExists(db, 'scan_predictions', `
      CREATE TABLE scan_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        context_id TEXT,
        confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
        staleness_score REAL NOT NULL CHECK (staleness_score >= 0 AND staleness_score <= 100),
        priority_score REAL NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
        predicted_findings INTEGER, -- Estimated number of findings if scanned
        recommendation TEXT NOT NULL CHECK (recommendation IN ('immediate', 'soon', 'scheduled', 'skip')),
        reasoning TEXT, -- AI explanation for the recommendation
        affected_file_patterns TEXT, -- JSON array of file patterns likely to trigger this scan
        last_scan_at TEXT, -- When this scan was last executed
        last_change_at TEXT, -- When relevant files were last modified
        next_recommended_at TEXT, -- Suggested time for next scan
        change_frequency_days REAL, -- Average days between changes to relevant files
        scan_frequency_days REAL, -- Average days between scans
        dismissed INTEGER DEFAULT 0, -- User dismissed this recommendation
        scheduled INTEGER DEFAULT 0, -- Scan was scheduled based on this prediction
        calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_scan_predictions_project_id ON scan_predictions(project_id);
        CREATE INDEX idx_scan_predictions_priority ON scan_predictions(project_id, priority_score DESC);
        CREATE INDEX idx_scan_predictions_recommendation ON scan_predictions(project_id, recommendation);
        CREATE INDEX idx_scan_predictions_dismissed ON scan_predictions(project_id, dismissed);
        CREATE INDEX idx_scan_predictions_context_id ON scan_predictions(context_id);
        CREATE UNIQUE INDEX idx_scan_predictions_unique ON scan_predictions(project_id, scan_type, COALESCE(context_id, ''));
      `);
      migrationLogger.info('scan_predictions table created successfully');
    }
  }, migrationLogger);

  // Create file_change_patterns table
  safeMigration('fileChangePatternsTable', () => {
    const created = createTableIfNotExists(db, 'file_change_patterns', `
      CREATE TABLE file_change_patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_pattern TEXT NOT NULL, -- Glob pattern like 'src/**/*.ts'
        scan_types TEXT NOT NULL, -- JSON array of scan types affected by this pattern
        change_frequency_days REAL, -- Average days between changes
        last_changed_at TEXT, -- Last time a file matching this pattern changed
        commit_count INTEGER DEFAULT 0, -- Number of commits affecting this pattern
        total_changes INTEGER DEFAULT 0, -- Total number of file changes
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_file_change_patterns_project_id ON file_change_patterns(project_id);
        CREATE INDEX idx_file_change_patterns_last_changed ON file_change_patterns(project_id, last_changed_at DESC);
        CREATE UNIQUE INDEX idx_file_change_patterns_unique ON file_change_patterns(project_id, file_pattern);
      `);
      migrationLogger.info('file_change_patterns table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Scan prediction tables created successfully');
}

/**
 * Add target and target_fulfillment columns to contexts table
 */
function migrateContextsTargetFields() {
  safeMigration('contextsTargetFields', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'contexts', [
      { name: 'target', definition: 'TEXT' },
      { name: 'target_fulfillment', definition: 'TEXT' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Contexts table already has target fields');
    } else {
      migrationLogger.info(`Added ${added} target field(s) to contexts table`);
    }
  }, migrationLogger);
}

/**
 * Create test case management tables
 * Enables manual test case scenarios and steps for contexts
 */
function migrateTestCaseManagementTables() {
  const db = getConnection();

  // Create test_case_scenarios table
  safeMigration('testCaseScenariosTable', () => {
    const created = createTableIfNotExists(db, 'test_case_scenarios', `
      CREATE TABLE test_case_scenarios (
        id TEXT PRIMARY KEY,
        context_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`CREATE INDEX idx_test_case_scenarios_context_id ON test_case_scenarios(context_id)`);
      migrationLogger.info('test_case_scenarios table created successfully');
    }
  }, migrationLogger);

  // Create test_case_steps table
  safeMigration('testCaseStepsTable', () => {
    const created = createTableIfNotExists(db, 'test_case_steps', `
      CREATE TABLE test_case_steps (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        step_name TEXT NOT NULL,
        expected_result TEXT NOT NULL,
        test_selector_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (scenario_id) REFERENCES test_case_scenarios(id) ON DELETE CASCADE,
        FOREIGN KEY (test_selector_id) REFERENCES test_selectors(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_test_case_steps_scenario_id ON test_case_steps(scenario_id);
        CREATE INDEX idx_test_case_steps_order ON test_case_steps(scenario_id, step_order);
      `);
      migrationLogger.info('test_case_steps table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Test case management tables created successfully');
}

/**
 * Add implemented_tasks column to contexts table
 * Tracks the count of implemented tasks for each context
 */
function migrateContextsImplementedTasks() {
  safeMigration('contextsImplementedTasks', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'contexts',
      'implemented_tasks',
      'INTEGER DEFAULT 0',
      migrationLogger
    );

    if (!added) {
      migrationLogger.info('Contexts table already has implemented_tasks column');
    } else {
      migrationLogger.info('implemented_tasks column added to contexts table successfully');
    }
  }, migrationLogger);
}

/**
 * Add context_id column to implementation_log table
 * Links implementation logs to specific contexts for better tracking
 */
function migrateImplementationLogContextId() {
  safeMigration('implementationLogContextId', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'implementation_log',
      'context_id',
      'TEXT REFERENCES contexts(id) ON DELETE SET NULL',
      migrationLogger
    );

    if (added) {
      // Create index for better query performance
      db.exec(`CREATE INDEX IF NOT EXISTS idx_implementation_log_context_id ON implementation_log(context_id)`);
      migrationLogger.info('context_id column added to implementation_log table successfully');
    } else {
      migrationLogger.info('implementation_log table already has context_id column');
    }
  }, migrationLogger);
}

/**
 * Add screenshot column to implementation_log table
 * Stores relative path to screenshot image captured during implementation
 */
function migrateImplementationLogScreenshot() {
  safeMigration('implementationLogScreenshot', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'implementation_log',
      'screenshot',
      'TEXT',
      migrationLogger
    );

    if (added) {
      migrationLogger.info('screenshot column added to implementation_log table successfully');
    } else {
      migrationLogger.info('implementation_log table already has screenshot column');
    }
  }, migrationLogger);
}

/**
 * Add overview_bullets column to implementation_log table
 * Stores bullet point summary of key changes for easier visualization
 */
function migrateImplementationLogOverviewBullets() {
  safeMigration('implementationLogOverviewBullets', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'implementation_log',
      'overview_bullets',
      'TEXT',
      migrationLogger
    );

    if (added) {
      migrationLogger.info('overview_bullets column added to implementation_log table successfully');
    } else {
      migrationLogger.info('implementation_log table already has overview_bullets column');
    }
  }, migrationLogger);
}
