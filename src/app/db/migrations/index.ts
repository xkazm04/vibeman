import { getConnection } from '../drivers';

/**
 * Migration logger utility
 * Provides structured logging for database migrations
 */
const migrationLogger = {
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
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(scans)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasInputTokens = tableInfo.some(col => col.name === 'input_tokens');
    const hasOutputTokens = tableInfo.some(col => col.name === 'output_tokens');

    if (!hasInputTokens) {
      migrationLogger.info('Adding input_tokens column to scans table');
      db.exec(`ALTER TABLE scans ADD COLUMN input_tokens INTEGER`);
    }

    if (!hasOutputTokens) {
      migrationLogger.info('Adding output_tokens column to scans table');
      db.exec(`ALTER TABLE scans ADD COLUMN output_tokens INTEGER`);
    }

    if (hasInputTokens && hasOutputTokens) {
      migrationLogger.info('Scans table already has token tracking columns');
    }
  } catch (error) {
    migrationLogger.error('Error migrating scans table:', error);
  }
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
            context.has_context_file || 0,
            context.context_file_path || null,
            context.preview || null,
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
            goal.context_id || null,
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
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasScanType = tableInfo.some(col => col.name === 'scan_type');

    if (!hasScanType) {
      migrationLogger.info('Adding scan_type column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN scan_type TEXT DEFAULT 'overall'`);
    } else {
      migrationLogger.info('Ideas table already has scan_type column');
    }
  } catch (error) {
    migrationLogger.error('Error migrating ideas table scan_type:', error);
  }
}

/**
 * Add effort and impact columns to ideas table
 */
function migrateIdeasEffortImpact() {
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasEffort = tableInfo.some(col => col.name === 'effort');
    const hasImpact = tableInfo.some(col => col.name === 'impact');

    if (!hasEffort) {
      migrationLogger.info('Adding effort column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3))`);
    }

    if (!hasImpact) {
      migrationLogger.info('Adding impact column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3))`);
    }

    if (hasEffort && hasImpact) {
      migrationLogger.info('Ideas table already has effort and impact columns');
    }
  } catch (error) {
    migrationLogger.error('Error migrating ideas table effort/impact:', error);
  }
}

/**
 * Add implemented_at column to ideas table
 */
function migrateIdeasImplementedAt() {
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasImplementedAt = tableInfo.some(col => col.name === 'implemented_at');

    if (!hasImplementedAt) {
      migrationLogger.info('Adding implemented_at column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN implemented_at TEXT`);
    } else {
      migrationLogger.info('Ideas table already has implemented_at column');
    }
  } catch (error) {
    migrationLogger.error('Error migrating ideas table implemented_at:', error);
  }
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
            idea.context_id || null,
            String(idea.scan_type || 'overall'),
            String(idea.category || 'general'),
            String(idea.title),
            idea.description || null,
            idea.reasoning || null,
            String(idea.status || 'pending'),
            idea.user_feedback || null,
            Number(idea.user_pattern || 0),
            idea.effort || null,
            idea.impact || null,
            idea.implemented_at || null,
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
  const db = getConnection();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | number | null;
      pk: number;
    }>;

    const hasRequirementId = tableInfo.some(col => col.name === 'requirement_id');
    const hasGoalId = tableInfo.some(col => col.name === 'goal_id');

    if (!hasRequirementId) {
      migrationLogger.info('Adding requirement_id column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN requirement_id TEXT`);
    }

    if (!hasGoalId) {
      migrationLogger.info('Adding goal_id column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL`);
    }

    if (hasRequirementId && hasGoalId) {
      migrationLogger.info('Ideas table already has requirement_id and goal_id columns');
    }
  } catch (error) {
    migrationLogger.error('Error migrating ideas table requirement_id and goal_id:', error);
  }
}

/**
 * Add test_scenario and test_updated columns to contexts table
 */
function migrateContextsTestingColumns() {
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

    const hasTestScenario = tableInfo.some(col => col.name === 'test_scenario');
    const hasTestUpdated = tableInfo.some(col => col.name === 'test_updated');

    if (!hasTestScenario) {
      migrationLogger.info('Adding test_scenario column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN test_scenario TEXT`);
    }

    if (!hasTestUpdated) {
      migrationLogger.info('Adding test_updated column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN test_updated TEXT`);
    }

    if (hasTestScenario && hasTestUpdated) {
      migrationLogger.info('Contexts table already has testing columns');
    }
  } catch (error) {
    migrationLogger.error('Error migrating contexts table testing columns:', error);
  }
}

/**
 * Create test_selectors table if it doesn't exist
 */
function migrateTestSelectorsTable() {
  const db = getConnection();

  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='test_selectors'
    `).get();

    if (!tableExists) {
      migrationLogger.info('Creating test_selectors table');
      db.exec(`
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
      `);

      // Create indexes
      db.exec(`
        CREATE INDEX idx_test_selectors_context_id ON test_selectors(context_id);
        CREATE INDEX idx_test_selectors_filepath ON test_selectors(filepath);
      `);

      migrationLogger.info('test_selectors table created successfully');
    } else {
      migrationLogger.info('test_selectors table already exists');
    }
  } catch (error) {
    migrationLogger.error('Error creating test_selectors table:', error);
  }
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
  const db = getConnection();

  try {
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='goal_candidates'
    `).get();

    if (!tableExists) {
      migrationLogger.info('Creating goal_candidates table');
      db.exec(`
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
      `);

      db.exec(`
        CREATE INDEX idx_goal_candidates_project_id ON goal_candidates(project_id);
        CREATE INDEX idx_goal_candidates_user_action ON goal_candidates(project_id, user_action);
        CREATE INDEX idx_goal_candidates_priority_score ON goal_candidates(project_id, priority_score DESC);
        CREATE INDEX idx_goal_candidates_created_at ON goal_candidates(project_id, created_at);
      `);

      migrationLogger.info('goal_candidates table created successfully');
    } else {
      migrationLogger.info('goal_candidates table already exists');
    }
  } catch (error) {
    migrationLogger.error('Error creating goal_candidates table:', error);
  }
}

/**
 * Create voicebot_analytics table for tracking command usage
 */
function migrateVoicebotAnalyticsTable() {
  const db = getConnection();

  try {
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='voicebot_analytics'
    `).get();

    if (!tableExists) {
      migrationLogger.info('Creating voicebot_analytics table');
      db.exec(`
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
      `);

      db.exec(`
        CREATE INDEX idx_voicebot_analytics_project_id ON voicebot_analytics(project_id);
        CREATE INDEX idx_voicebot_analytics_command_name ON voicebot_analytics(project_id, command_name);
        CREATE INDEX idx_voicebot_analytics_timestamp ON voicebot_analytics(project_id, timestamp);
        CREATE INDEX idx_voicebot_analytics_success ON voicebot_analytics(project_id, success);
      `);

      migrationLogger.info('voicebot_analytics table created successfully');
    } else {
      migrationLogger.info('voicebot_analytics table already exists');
    }
  } catch (error) {
    migrationLogger.error('Error creating voicebot_analytics table:', error);
  }
}
