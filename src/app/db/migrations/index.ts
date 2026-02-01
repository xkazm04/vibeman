import { getConnection } from '../drivers';
import {
  addColumnIfNotExists,
  addColumnsIfNotExist,
  createTableIfNotExists,
  getTableInfo,
  hasColumn,
  safeMigration,
  tableExists,
  type MigrationLogger,
  type ColumnInfo
} from './migration.utils';
import { migrateDropOrphanedTables } from './064_drop_orphaned_tables';
import { migrate065DirectionPairs } from './065_direction_pairs';
import { migrate066CleanupStaleContextPaths } from './066_cleanup_stale_context_paths';

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
    // Migration 25: Create marketplace tables for refactoring patterns
    migrateMarketplaceTables();
    // Migration 26: Create adaptive learning tables for self-optimizing development cycle
    migrateAdaptiveLearningTables();
    // Migration 27: Create debt prediction and prevention tables
    migrateDebtPredictionTables();
    // Migration 28: Create lifecycle automation tables
    migrateLifecycleTables();
    // Migration 29: Add target_rating column to contexts table
    migrateContextsTargetRating();
    // Migration 30: Add type and icon columns to context_groups table
    migrateContextGroupsArchitectureFields();
    // Migration 31: Create context_group_relationships table
    migrateContextGroupRelationshipsTable();
    // Migration 32: Create security intelligence dashboard tables
    migrateSecurityIntelligenceTables();
    // Migration 33: Create blueprint composable architecture tables
    migrateBlueprintTables();
    // Migration 34: Create developer mind-meld tables
    migrateDeveloperMindMeldTables();
    // Migration 35: Update ideas table to support 1-10 scoring and add risk column
    migrateIdeasExtendedScoring();
    // Migration 36: Create onboarding accelerator tables
    migrateOnboardingAcceleratorTables();
    // Migration 37: Create strategic roadmap engine tables
    migrateStrategicRoadmapTables();
    // Migration 38: Create hypothesis-driven testing tables
    migrateHypothesisTestingTables();
    // Migration 39: Create project health score tables
    migrateProjectHealthTables();
    // Migration 40: Create daily standup tables
    migrateDailyStandupTables();
    // Migration 41: Create red team testing tables
    migrateRedTeamTestingTables();
    // Migration 42: Create architecture graph tables
    migrateArchitectureGraphTables();
    // Migration 43: Create focus mode tables
    migrateFocusModeTables();
    // Migration 44: Create autonomous CI tables
    migrateAutonomousCITables();
    // Migration 45: Create ROI Simulator tables
    migrateROISimulatorTables();
    // Migration 46: Create Goal Hub tables
    migrateGoalHub();
    // Migration 47: Create Social Channel Configs tables
    migrateSocialChannelConfigs();
    // Migration 48: Create Social Feedback Items table
    migrateSocialFeedbackItems();
    // Migration 49: Create Social Discovery Configs table
    migrateSocialDiscoveryConfigs();
    // Migration 50: Offload System - REMOVED (migrated to Supabase)
    // Migration 51: Create Claude Code Sessions tables
    migrateClaudeCodeSessions();
    // Migration 52: Create Automation Sessions table
    migrateAutomationSessions();
    // Migration 53: Create Automation Session Events table
    migrateAutomationSessionEvents();
    // Migration 54: Create Integration Framework tables
    migrateIntegrationFramework();
    // Migration 55: Create Code Health Observatory tables
    migrateObservatory();
    // Migration 56: Add risk column to ideas table
    migrateIdeasRiskColumn();
    // Migration 57: Add paused phase to automation_sessions
    migrateAutomationSessionPausedPhase();
    // Migration 58: Create questions table for guided idea generation
    migrateQuestionsTable();
    // Migration 59: Create Claude Terminal tables
    migrateClaudeTerminalTables();
    // Migration 60: Create directions table for actionable development guidance
    migrateDirectionsTable();
    // Migration 61: Create hall_of_fame_stars table
    migrateHallOfFameStars();
    // Migration 62: Create API Observability tables
    migrateApiObservability();
    // Migration 63: Create context_api_routes table and enhance contexts table
    migrateContextApiRoutes();
    // Migration 64: Create obs_xray_events table for persisted X-Ray traffic
    migrateObsXRayEvents();
    // Migration 65: Add SQLite context references to directions table
    migrateDirectionsContextLink();
    // Migration 66: Create prompt_templates table for reusable prompt composition
    migratePromptTemplates();
    // Migration 67: Create Brain 2.0 tables for behavioral learning and reflection
    migrateBrainV2();
    // Migration 68: Add scope column to brain_reflections for global reflection support
    migrateBrainGlobalReflection();
    // Migration 69: Create Annette 2.0 conversation + memory tables
    migrateAnnetteV2();
    // Migration 70: Create workspaces tables for project grouping
    migrateWorkspaces();
    // Migration 71: Create Annette Memory System tables for persistent memory and knowledge graph
    migrateAnnetteMemorySystem();
    // Migration 72: Create Executive Analysis table for AI-driven insights
    migrateExecutiveAnalysis();
    // Migration 73: Create Cross-Project Architecture tables for workspace-level visualization
    migrateCrossProjectArchitecture();
    // Migration 74: Workspace & Project Enhancements - base_path for workspaces
    migrateWorkspaceProjectEnhancements();
    // Migration 75: Group Health Scans - health tracking for context groups
    migrateGroupHealth();
    // Migration 76: Remote Message Broker Config - Supabase credentials storage
    migrateRemoteConfig();
    // Migration 77: Drop Orphaned Tables - v1.1 Dead Code Cleanup
    migrateDropOrphanedTables();
    // Migration 78: Direction Pairs - two alternative solutions for comparison
    migrate065DirectionPairs();
    // Migration 79: Cleanup Stale Context Paths - remove non-existent file references
    migrate066CleanupStaleContextPaths();

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
    // First check if the ideas table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='ideas'
    `).get();

    if (!tableExists) {
      migrationLogger.info('Ideas table does not exist yet, skipping category constraint migration');
      return;
    }

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

/**
 * Create marketplace tables for refactoring pattern marketplace
 * Enables sharing, rating, and discovering refactoring strategies
 */
function migrateMarketplaceTables() {
  const db = getConnection();

  // Create marketplace_users table
  safeMigration('marketplaceUsersTable', () => {
    const created = createTableIfNotExists(db, 'marketplace_users', `
      CREATE TABLE marketplace_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        email TEXT,
        avatar_url TEXT,
        bio TEXT,
        reputation_score INTEGER NOT NULL DEFAULT 0,
        total_patterns INTEGER NOT NULL DEFAULT 0,
        total_downloads INTEGER NOT NULL DEFAULT 0,
        total_likes INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`CREATE INDEX idx_marketplace_users_username ON marketplace_users(username)`);
      db.exec(`CREATE INDEX idx_marketplace_users_reputation ON marketplace_users(reputation_score DESC)`);
      migrationLogger.info('marketplace_users table created successfully');
    }
  }, migrationLogger);

  // Create refactoring_patterns table
  safeMigration('refactoringPatternsTable', () => {
    const created = createTableIfNotExists(db, 'refactoring_patterns', `
      CREATE TABLE refactoring_patterns (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL DEFAULT '1.0.0',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        detailed_description TEXT,
        problem_statement TEXT NOT NULL,
        solution_approach TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'migration', 'cleanup', 'security', 'performance',
          'architecture', 'testing', 'modernization', 'best-practices'
        )),
        scope TEXT NOT NULL CHECK (scope IN ('file', 'module', 'project', 'framework')),
        tags TEXT NOT NULL DEFAULT '[]',
        language TEXT,
        framework TEXT,
        min_version TEXT,
        detection_rules TEXT NOT NULL DEFAULT '[]',
        transformation_rules TEXT NOT NULL DEFAULT '[]',
        example_before TEXT,
        example_after TEXT,
        estimated_effort TEXT NOT NULL CHECK (estimated_effort IN ('low', 'medium', 'high')),
        risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
        requires_review INTEGER NOT NULL DEFAULT 1,
        automated INTEGER NOT NULL DEFAULT 0,
        download_count INTEGER NOT NULL DEFAULT 0,
        apply_count INTEGER NOT NULL DEFAULT 0,
        success_rate REAL,
        rating_average REAL NOT NULL DEFAULT 0.0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'featured', 'deprecated', 'archived')),
        parent_pattern_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        published_at TEXT,
        FOREIGN KEY (author_id) REFERENCES marketplace_users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_pattern_id) REFERENCES refactoring_patterns(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_refactoring_patterns_author ON refactoring_patterns(author_id);
        CREATE INDEX idx_refactoring_patterns_slug ON refactoring_patterns(slug);
        CREATE INDEX idx_refactoring_patterns_category ON refactoring_patterns(category);
        CREATE INDEX idx_refactoring_patterns_status ON refactoring_patterns(status);
        CREATE INDEX idx_refactoring_patterns_rating ON refactoring_patterns(rating_average DESC);
        CREATE INDEX idx_refactoring_patterns_downloads ON refactoring_patterns(download_count DESC);
        CREATE INDEX idx_refactoring_patterns_language ON refactoring_patterns(language);
        CREATE INDEX idx_refactoring_patterns_framework ON refactoring_patterns(framework);
      `);
      migrationLogger.info('refactoring_patterns table created successfully');
    }
  }, migrationLogger);

  // Create pattern_versions table
  safeMigration('patternVersionsTable', () => {
    const created = createTableIfNotExists(db, 'pattern_versions', `
      CREATE TABLE pattern_versions (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        version TEXT NOT NULL,
        changelog TEXT NOT NULL,
        detection_rules TEXT NOT NULL,
        transformation_rules TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pattern_id) REFERENCES refactoring_patterns(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_pattern_versions_pattern ON pattern_versions(pattern_id);
        CREATE UNIQUE INDEX idx_pattern_versions_unique ON pattern_versions(pattern_id, version);
      `);
      migrationLogger.info('pattern_versions table created successfully');
    }
  }, migrationLogger);

  // Create pattern_ratings table
  safeMigration('patternRatingsTable', () => {
    const created = createTableIfNotExists(db, 'pattern_ratings', `
      CREATE TABLE pattern_ratings (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pattern_id) REFERENCES refactoring_patterns(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_pattern_ratings_pattern ON pattern_ratings(pattern_id);
        CREATE INDEX idx_pattern_ratings_user ON pattern_ratings(user_id);
        CREATE UNIQUE INDEX idx_pattern_ratings_unique ON pattern_ratings(pattern_id, user_id);
      `);
      migrationLogger.info('pattern_ratings table created successfully');
    }
  }, migrationLogger);

  // Create pattern_applications table
  safeMigration('patternApplicationsTable', () => {
    const created = createTableIfNotExists(db, 'pattern_applications', `
      CREATE TABLE pattern_applications (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        files_modified INTEGER NOT NULL DEFAULT 0,
        lines_added INTEGER NOT NULL DEFAULT 0,
        lines_removed INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 1,
        outcome_notes TEXT,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (pattern_id) REFERENCES refactoring_patterns(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_pattern_applications_pattern ON pattern_applications(pattern_id);
        CREATE INDEX idx_pattern_applications_user ON pattern_applications(user_id);
        CREATE INDEX idx_pattern_applications_project ON pattern_applications(project_id);
        CREATE INDEX idx_pattern_applications_applied ON pattern_applications(applied_at DESC);
      `);
      migrationLogger.info('pattern_applications table created successfully');
    }
  }, migrationLogger);

  // Create badges table
  safeMigration('badgesTable', () => {
    const created = createTableIfNotExists(db, 'badges', `
      CREATE TABLE badges (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN (
          'contributor', 'pioneer', 'popular', 'quality',
          'helpful', 'expert', 'mentor', 'innovator'
        )),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        threshold INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`CREATE INDEX idx_badges_type ON badges(type)`);

      // Insert default badges
      db.exec(`
        INSERT INTO badges (id, type, name, description, icon, color, threshold) VALUES
        ('badge_contributor_1', 'contributor', 'First Contribution', 'Published your first pattern', '🌱', 'text-green-400', 1),
        ('badge_contributor_5', 'contributor', 'Active Contributor', 'Published 5 patterns', '🌿', 'text-green-500', 5),
        ('badge_contributor_10', 'contributor', 'Prolific Contributor', 'Published 10 patterns', '🌳', 'text-green-600', 10),
        ('badge_pioneer', 'pioneer', 'Pioneer', 'Among the first 100 contributors', '🚀', 'text-purple-500', 1),
        ('badge_popular_100', 'popular', 'Rising Star', 'Patterns downloaded 100+ times', '⭐', 'text-yellow-400', 100),
        ('badge_popular_1000', 'popular', 'Community Favorite', 'Patterns downloaded 1000+ times', '🌟', 'text-yellow-500', 1000),
        ('badge_quality', 'quality', 'Quality Craftsman', 'Average rating above 4.5 stars', '💎', 'text-cyan-400', 1),
        ('badge_helpful_10', 'helpful', 'Helpful Reviewer', 'Reviews marked helpful 10+ times', '🤝', 'text-blue-400', 10),
        ('badge_helpful_50', 'helpful', 'Community Guide', 'Reviews marked helpful 50+ times', '🧭', 'text-blue-500', 50),
        ('badge_expert', 'expert', 'Domain Expert', 'Published 5+ patterns in one category', '🎯', 'text-orange-500', 5),
        ('badge_mentor', 'mentor', 'Mentor', 'Helped 10+ users apply patterns', '👨‍🏫', 'text-pink-500', 10),
        ('badge_innovator', 'innovator', 'Innovator', 'Created a highly-rated unique pattern', '💡', 'text-amber-500', 1)
      `);

      migrationLogger.info('badges table created with default badges');
    }
  }, migrationLogger);

  // Create user_badges table
  safeMigration('userBadgesTable', () => {
    const created = createTableIfNotExists(db, 'user_badges', `
      CREATE TABLE user_badges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        earned_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE,
        FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_user_badges_user ON user_badges(user_id);
        CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
        CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges(user_id, badge_id);
      `);
      migrationLogger.info('user_badges table created successfully');
    }
  }, migrationLogger);

  // Create pattern_favorites table
  safeMigration('patternFavoritesTable', () => {
    const created = createTableIfNotExists(db, 'pattern_favorites', `
      CREATE TABLE pattern_favorites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        pattern_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE,
        FOREIGN KEY (pattern_id) REFERENCES refactoring_patterns(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_pattern_favorites_user ON pattern_favorites(user_id);
        CREATE INDEX idx_pattern_favorites_pattern ON pattern_favorites(pattern_id);
        CREATE UNIQUE INDEX idx_pattern_favorites_unique ON pattern_favorites(user_id, pattern_id);
      `);
      migrationLogger.info('pattern_favorites table created successfully');
    }
  }, migrationLogger);

  // Create pattern_collections table
  safeMigration('patternCollectionsTable', () => {
    const created = createTableIfNotExists(db, 'pattern_collections', `
      CREATE TABLE pattern_collections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES marketplace_users(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_pattern_collections_user ON pattern_collections(user_id);
        CREATE INDEX idx_pattern_collections_public ON pattern_collections(is_public);
      `);
      migrationLogger.info('pattern_collections table created successfully');
    }
  }, migrationLogger);

  // Create collection_patterns table
  safeMigration('collectionPatternsTable', () => {
    const created = createTableIfNotExists(db, 'collection_patterns', `
      CREATE TABLE collection_patterns (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        pattern_id TEXT NOT NULL,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (collection_id) REFERENCES pattern_collections(id) ON DELETE CASCADE,
        FOREIGN KEY (pattern_id) REFERENCES refactoring_patterns(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_collection_patterns_collection ON collection_patterns(collection_id);
        CREATE INDEX idx_collection_patterns_pattern ON collection_patterns(pattern_id);
        CREATE UNIQUE INDEX idx_collection_patterns_unique ON collection_patterns(collection_id, pattern_id);
      `);
      migrationLogger.info('collection_patterns table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Marketplace tables created successfully');
}

/**
 * Create adaptive learning tables for self-optimizing development cycle
 * Enables tracking of idea execution outcomes and adaptive weight adjustment
 */
function migrateAdaptiveLearningTables() {
  const db = getConnection();

  // Create idea_execution_outcomes table
  safeMigration('ideaExecutionOutcomesTable', () => {
    const created = createTableIfNotExists(db, 'idea_execution_outcomes', `
      CREATE TABLE idea_execution_outcomes (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        predicted_effort INTEGER CHECK (predicted_effort IS NULL OR (predicted_effort >= 1 AND predicted_effort <= 3)),
        predicted_impact INTEGER CHECK (predicted_impact IS NULL OR (predicted_impact >= 1 AND predicted_impact <= 3)),
        actual_effort INTEGER CHECK (actual_effort IS NULL OR (actual_effort >= 1 AND actual_effort <= 3)),
        actual_impact INTEGER CHECK (actual_impact IS NULL OR (actual_impact >= 1 AND actual_impact <= 3)),
        execution_time_ms INTEGER,
        files_changed INTEGER,
        lines_added INTEGER,
        lines_removed INTEGER,
        success INTEGER NOT NULL DEFAULT 0,
        error_type TEXT,
        user_feedback_score INTEGER CHECK (user_feedback_score IS NULL OR (user_feedback_score >= 1 AND user_feedback_score <= 5)),
        category TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        executed_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_execution_outcomes_idea_id ON idea_execution_outcomes(idea_id);
        CREATE INDEX idx_execution_outcomes_project_id ON idea_execution_outcomes(project_id);
        CREATE INDEX idx_execution_outcomes_category ON idea_execution_outcomes(project_id, category);
        CREATE INDEX idx_execution_outcomes_scan_type ON idea_execution_outcomes(project_id, scan_type);
        CREATE INDEX idx_execution_outcomes_executed_at ON idea_execution_outcomes(project_id, executed_at DESC);
        CREATE INDEX idx_execution_outcomes_success ON idea_execution_outcomes(project_id, success);
      `);
      migrationLogger.info('idea_execution_outcomes table created successfully');
    }
  }, migrationLogger);

  // Create scoring_weights table
  safeMigration('scoringWeightsTable', () => {
    const created = createTableIfNotExists(db, 'scoring_weights', `
      CREATE TABLE scoring_weights (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'default',
        scan_type TEXT NOT NULL DEFAULT 'default',
        effort_accuracy_weight REAL NOT NULL DEFAULT 1.0,
        impact_accuracy_weight REAL NOT NULL DEFAULT 1.5,
        success_rate_weight REAL NOT NULL DEFAULT 2.0,
        execution_time_factor REAL NOT NULL DEFAULT 0.5,
        sample_count INTEGER NOT NULL DEFAULT 0,
        last_calibrated_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_scoring_weights_project_id ON scoring_weights(project_id);
        CREATE UNIQUE INDEX idx_scoring_weights_unique ON scoring_weights(project_id, category, scan_type);
      `);
      migrationLogger.info('scoring_weights table created successfully');
    }
  }, migrationLogger);

  // Create scoring_thresholds table
  safeMigration('scoringThresholdsTable', () => {
    const created = createTableIfNotExists(db, 'scoring_thresholds', `
      CREATE TABLE scoring_thresholds (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        threshold_type TEXT NOT NULL CHECK (threshold_type IN ('auto_accept', 'auto_reject', 'priority_boost')),
        min_score REAL,
        max_score REAL,
        min_confidence REAL,
        enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_scoring_thresholds_project_id ON scoring_thresholds(project_id);
        CREATE UNIQUE INDEX idx_scoring_thresholds_unique ON scoring_thresholds(project_id, threshold_type);
      `);
      migrationLogger.info('scoring_thresholds table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Adaptive learning tables created successfully');
}

/**
 * Create debt prediction and prevention tables
 * Enables predictive refactoring before technical debt accumulates
 */
function migrateDebtPredictionTables() {
  const db = getConnection();

  // Create debt_patterns table (learned patterns from history)
  safeMigration('debtPatternsTable', () => {
    const created = createTableIfNotExists(db, 'debt_patterns', `
      CREATE TABLE debt_patterns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        pattern_type TEXT NOT NULL CHECK (pattern_type IN (
          'complexity', 'duplication', 'coupling', 'smell', 'security', 'performance'
        )),
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        category TEXT NOT NULL,
        detection_rules TEXT NOT NULL DEFAULT '[]',
        file_patterns TEXT NOT NULL DEFAULT '[]',
        code_signatures TEXT NOT NULL DEFAULT '[]',
        occurrence_count INTEGER NOT NULL DEFAULT 0,
        false_positive_rate REAL NOT NULL DEFAULT 0.0,
        avg_time_to_debt REAL NOT NULL DEFAULT 30.0,
        prevention_success_rate REAL NOT NULL DEFAULT 0.0,
        source TEXT NOT NULL DEFAULT 'learned' CHECK (source IN ('learned', 'predefined', 'imported')),
        learned_from_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_debt_patterns_project_id ON debt_patterns(project_id);
        CREATE INDEX idx_debt_patterns_type ON debt_patterns(project_id, pattern_type);
        CREATE INDEX idx_debt_patterns_severity ON debt_patterns(project_id, severity);
        CREATE INDEX idx_debt_patterns_category ON debt_patterns(category);
      `);
      migrationLogger.info('debt_patterns table created successfully');
    }
  }, migrationLogger);

  // Create debt_predictions table
  safeMigration('debtPredictionsTable', () => {
    const created = createTableIfNotExists(db, 'debt_predictions', `
      CREATE TABLE debt_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,
        pattern_id TEXT,
        file_path TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        code_snippet TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        prediction_type TEXT NOT NULL CHECK (prediction_type IN (
          'emerging', 'accelerating', 'imminent', 'exists'
        )),
        confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
        urgency_score INTEGER NOT NULL CHECK (urgency_score >= 0 AND urgency_score <= 100),
        complexity_trend TEXT NOT NULL DEFAULT 'stable' CHECK (complexity_trend IN (
          'stable', 'increasing', 'decreasing'
        )),
        complexity_delta REAL NOT NULL DEFAULT 0.0,
        velocity REAL NOT NULL DEFAULT 0.0,
        suggested_action TEXT NOT NULL,
        micro_refactoring TEXT,
        estimated_prevention_effort TEXT NOT NULL CHECK (estimated_prevention_effort IN (
          'trivial', 'small', 'medium', 'large'
        )),
        estimated_cleanup_effort TEXT NOT NULL CHECK (estimated_cleanup_effort IN (
          'small', 'medium', 'large', 'major'
        )),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
          'active', 'dismissed', 'addressed', 'escalated'
        )),
        dismissed_reason TEXT,
        addressed_at TEXT,
        first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
        FOREIGN KEY (pattern_id) REFERENCES debt_patterns(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_debt_predictions_project_id ON debt_predictions(project_id);
        CREATE INDEX idx_debt_predictions_context_id ON debt_predictions(context_id);
        CREATE INDEX idx_debt_predictions_file_path ON debt_predictions(project_id, file_path);
        CREATE INDEX idx_debt_predictions_status ON debt_predictions(project_id, status);
        CREATE INDEX idx_debt_predictions_urgency ON debt_predictions(project_id, urgency_score DESC);
        CREATE INDEX idx_debt_predictions_type ON debt_predictions(project_id, prediction_type);
      `);
      migrationLogger.info('debt_predictions table created successfully');
    }
  }, migrationLogger);

  // Create complexity_history table
  safeMigration('complexityHistoryTable', () => {
    const created = createTableIfNotExists(db, 'complexity_history', `
      CREATE TABLE complexity_history (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        cyclomatic_complexity INTEGER NOT NULL DEFAULT 0,
        lines_of_code INTEGER NOT NULL DEFAULT 0,
        dependency_count INTEGER NOT NULL DEFAULT 0,
        coupling_score INTEGER NOT NULL DEFAULT 0,
        cohesion_score INTEGER NOT NULL DEFAULT 100,
        commit_hash TEXT,
        change_type TEXT NOT NULL CHECK (change_type IN ('create', 'modify', 'refactor')),
        measured_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_complexity_history_project ON complexity_history(project_id);
        CREATE INDEX idx_complexity_history_file ON complexity_history(project_id, file_path);
        CREATE INDEX idx_complexity_history_measured ON complexity_history(project_id, measured_at DESC);
      `);
      migrationLogger.info('complexity_history table created successfully');
    }
  }, migrationLogger);

  // Create opportunity_cards table
  safeMigration('opportunityCardsTable', () => {
    const created = createTableIfNotExists(db, 'opportunity_cards', `
      CREATE TABLE opportunity_cards (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        prediction_id TEXT NOT NULL,
        card_type TEXT NOT NULL CHECK (card_type IN (
          'prevention', 'quick-win', 'warning', 'suggestion'
        )),
        priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        action_type TEXT NOT NULL CHECK (action_type IN (
          'micro-refactor', 'extract', 'rename', 'restructure', 'review'
        )),
        action_description TEXT NOT NULL,
        estimated_time_minutes INTEGER NOT NULL DEFAULT 5,
        affected_files TEXT NOT NULL DEFAULT '[]',
        related_patterns TEXT NOT NULL DEFAULT '[]',
        shown_count INTEGER NOT NULL DEFAULT 0,
        clicked INTEGER NOT NULL DEFAULT 0,
        acted_upon INTEGER NOT NULL DEFAULT 0,
        feedback TEXT CHECK (feedback IN ('helpful', 'not-helpful', 'dismissed', NULL)),
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (prediction_id) REFERENCES debt_predictions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_opportunity_cards_project ON opportunity_cards(project_id);
        CREATE INDEX idx_opportunity_cards_prediction ON opportunity_cards(prediction_id);
        CREATE INDEX idx_opportunity_cards_priority ON opportunity_cards(project_id, priority DESC);
        CREATE INDEX idx_opportunity_cards_type ON opportunity_cards(project_id, card_type);
      `);
      migrationLogger.info('opportunity_cards table created successfully');
    }
  }, migrationLogger);

  // Create prevention_actions table
  safeMigration('preventionActionsTable', () => {
    const created = createTableIfNotExists(db, 'prevention_actions', `
      CREATE TABLE prevention_actions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        prediction_id TEXT NOT NULL,
        opportunity_card_id TEXT,
        action_type TEXT NOT NULL CHECK (action_type IN (
          'micro-refactor', 'full-refactor', 'dismiss', 'escalate', 'defer'
        )),
        action_description TEXT NOT NULL,
        files_modified INTEGER NOT NULL DEFAULT 0,
        lines_changed INTEGER NOT NULL DEFAULT 0,
        time_spent_minutes INTEGER,
        success INTEGER NOT NULL DEFAULT 1,
        prevented_debt_score REAL,
        user_satisfaction INTEGER CHECK (user_satisfaction IS NULL OR (user_satisfaction >= 1 AND user_satisfaction <= 5)),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (prediction_id) REFERENCES debt_predictions(id) ON DELETE CASCADE,
        FOREIGN KEY (opportunity_card_id) REFERENCES opportunity_cards(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_prevention_actions_project ON prevention_actions(project_id);
        CREATE INDEX idx_prevention_actions_prediction ON prevention_actions(prediction_id);
        CREATE INDEX idx_prevention_actions_created ON prevention_actions(project_id, created_at DESC);
      `);
      migrationLogger.info('prevention_actions table created successfully');
    }
  }, migrationLogger);

  // Create code_change_events table
  safeMigration('codeChangeEventsTable', () => {
    const created = createTableIfNotExists(db, 'code_change_events', `
      CREATE TABLE code_change_events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('create', 'modify', 'delete', 'rename')),
        lines_added INTEGER NOT NULL DEFAULT 0,
        lines_removed INTEGER NOT NULL DEFAULT 0,
        complexity_before INTEGER,
        complexity_after INTEGER,
        patterns_triggered TEXT NOT NULL DEFAULT '[]',
        predictions_created TEXT NOT NULL DEFAULT '[]',
        commit_hash TEXT,
        author TEXT,
        detected_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_code_change_events_project ON code_change_events(project_id);
        CREATE INDEX idx_code_change_events_file ON code_change_events(project_id, file_path);
        CREATE INDEX idx_code_change_events_detected ON code_change_events(project_id, detected_at DESC);
      `);
      migrationLogger.info('code_change_events table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Debt prediction tables created successfully');
}

/**
 * Create lifecycle automation tables
 * Enables AI-driven code quality lifecycle orchestration
 */
function migrateLifecycleTables() {
  const db = getConnection();

  // Create lifecycle_configs table
  safeMigration('lifecycleConfigsTable', () => {
    const created = createTableIfNotExists(db, 'lifecycle_configs', `
      CREATE TABLE lifecycle_configs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 0,
        triggers TEXT NOT NULL DEFAULT '["manual"]',
        watch_patterns TEXT NOT NULL DEFAULT '["src/**/*.ts","src/**/*.tsx"]',
        ignore_patterns TEXT NOT NULL DEFAULT '["node_modules/**"]',
        scan_types TEXT NOT NULL DEFAULT '["bug_hunter","security_protector","perf_optimizer"]',
        provider TEXT NOT NULL DEFAULT 'gemini',
        max_concurrent_scans INTEGER NOT NULL DEFAULT 1,
        auto_resolve INTEGER NOT NULL DEFAULT 0,
        max_auto_implementations INTEGER NOT NULL DEFAULT 3,
        require_approval INTEGER NOT NULL DEFAULT 1,
        priority_threshold INTEGER NOT NULL DEFAULT 70,
        quality_gates TEXT NOT NULL DEFAULT '["type_check","lint","build"]',
        gate_timeout_ms INTEGER NOT NULL DEFAULT 300000,
        fail_fast INTEGER NOT NULL DEFAULT 1,
        auto_deploy INTEGER NOT NULL DEFAULT 0,
        deployment_targets TEXT NOT NULL DEFAULT '["local"]',
        deploy_on_weekend INTEGER NOT NULL DEFAULT 0,
        deploy_during_business_hours INTEGER NOT NULL DEFAULT 1,
        min_cycle_interval_ms INTEGER NOT NULL DEFAULT 60000,
        cooldown_on_failure_ms INTEGER NOT NULL DEFAULT 300000,
        notify_on_success INTEGER NOT NULL DEFAULT 1,
        notify_on_failure INTEGER NOT NULL DEFAULT 1,
        notification_channels TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`CREATE INDEX idx_lifecycle_configs_project_id ON lifecycle_configs(project_id)`);
      migrationLogger.info('lifecycle_configs table created successfully');
    }
  }, migrationLogger);

  // Create lifecycle_cycles table
  safeMigration('lifecycleCyclesTable', () => {
    const created = createTableIfNotExists(db, 'lifecycle_cycles', `
      CREATE TABLE lifecycle_cycles (
        id TEXT PRIMARY KEY,
        config_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        phase TEXT NOT NULL CHECK (phase IN (
          'idle', 'detecting', 'scanning', 'resolving', 'testing', 'validating', 'deploying', 'completed', 'failed'
        )),
        trigger TEXT NOT NULL CHECK (trigger IN (
          'code_change', 'git_push', 'git_commit', 'scheduled', 'manual', 'scan_complete', 'idea_implemented'
        )),
        trigger_metadata TEXT,
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        current_step TEXT NOT NULL DEFAULT 'Initializing',
        total_steps INTEGER NOT NULL DEFAULT 5,
        scans_completed INTEGER NOT NULL DEFAULT 0,
        scans_total INTEGER NOT NULL DEFAULT 0,
        ideas_generated INTEGER NOT NULL DEFAULT 0,
        ideas_resolved INTEGER NOT NULL DEFAULT 0,
        quality_gates_passed INTEGER NOT NULL DEFAULT 0,
        quality_gates_total INTEGER NOT NULL DEFAULT 0,
        gate_results TEXT NOT NULL DEFAULT '[]',
        deployment_status TEXT CHECK (deployment_status IN (
          'pending', 'in_progress', 'completed', 'failed', 'skipped', NULL
        )),
        deployment_details TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        error_message TEXT,
        error_phase TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (config_id) REFERENCES lifecycle_configs(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_lifecycle_cycles_project ON lifecycle_cycles(project_id);
        CREATE INDEX idx_lifecycle_cycles_config ON lifecycle_cycles(config_id);
        CREATE INDEX idx_lifecycle_cycles_phase ON lifecycle_cycles(project_id, phase);
        CREATE INDEX idx_lifecycle_cycles_started ON lifecycle_cycles(project_id, started_at DESC);
      `);
      migrationLogger.info('lifecycle_cycles table created successfully');
    }
  }, migrationLogger);

  // Create lifecycle_events table
  safeMigration('lifecycleEventsTable', () => {
    const created = createTableIfNotExists(db, 'lifecycle_events', `
      CREATE TABLE lifecycle_events (
        id TEXT PRIMARY KEY,
        cycle_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN (
          'phase_change', 'scan_start', 'scan_complete', 'idea_resolved',
          'gate_start', 'gate_complete', 'deploy_start', 'deploy_complete',
          'error', 'warning', 'info'
        )),
        phase TEXT NOT NULL CHECK (phase IN (
          'idle', 'detecting', 'scanning', 'resolving', 'testing', 'validating', 'deploying', 'completed', 'failed'
        )),
        message TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cycle_id) REFERENCES lifecycle_cycles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_lifecycle_events_cycle ON lifecycle_events(cycle_id);
        CREATE INDEX idx_lifecycle_events_project ON lifecycle_events(project_id);
        CREATE INDEX idx_lifecycle_events_type ON lifecycle_events(project_id, event_type);
        CREATE INDEX idx_lifecycle_events_created ON lifecycle_events(project_id, created_at DESC);
      `);
      migrationLogger.info('lifecycle_events table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Lifecycle automation tables created successfully');
}

/**
 * Add target_rating column to contexts table
 * Rating 1-5 for target progress visualization
 */
function migrateContextsTargetRating() {
  safeMigration('contextsTargetRating', () => {
    const db = getConnection();
    const added = addColumnIfNotExists(
      db,
      'contexts',
      'target_rating',
      'INTEGER CHECK (target_rating IS NULL OR (target_rating >= 1 AND target_rating <= 5))',
      migrationLogger
    );

    if (!added) {
      migrationLogger.info('Contexts table already has target_rating column');
    } else {
      migrationLogger.info('target_rating column added to contexts table successfully');
    }
  }, migrationLogger);
}

/**
 * Add type and icon columns to context_groups table
 * type: pages/client/server/external for Architecture Explorer
 * icon: icon name for visual representation
 */
function migrateContextGroupsArchitectureFields() {
  safeMigration('contextGroupsArchitectureFields', () => {
    const db = getConnection();
    const added = addColumnsIfNotExist(db, 'context_groups', [
      { name: 'type', definition: "TEXT CHECK (type IS NULL OR type IN ('pages', 'client', 'server', 'external'))" },
      { name: 'icon', definition: 'TEXT' }
    ], migrationLogger);

    if (added === 0) {
      migrationLogger.info('Context groups table already has architecture fields');
    } else {
      migrationLogger.info(`Added ${added} architecture field(s) to context_groups table`);
    }
  }, migrationLogger);
}

/**
 * Create context_group_relationships table
 * Defines connections between context groups for Architecture Explorer
 */
function migrateContextGroupRelationshipsTable() {
  safeMigration('contextGroupRelationshipsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'context_group_relationships', `
      CREATE TABLE context_group_relationships (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_group_id TEXT NOT NULL,
        target_group_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_group_id) REFERENCES context_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (target_group_id) REFERENCES context_groups(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_context_group_rel_project ON context_group_relationships(project_id);
        CREATE INDEX idx_context_group_rel_source ON context_group_relationships(source_group_id);
        CREATE INDEX idx_context_group_rel_target ON context_group_relationships(target_group_id);
        CREATE UNIQUE INDEX idx_context_group_rel_unique ON context_group_relationships(source_group_id, target_group_id);
      `);
      migrationLogger.info('context_group_relationships table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create security intelligence dashboard tables
 * Enables cross-project security monitoring, alerts, and community scoring
 */
function migrateSecurityIntelligenceTables() {
  const db = getConnection();

  // Create security_intelligence table
  safeMigration('securityIntelligenceTable', () => {
    const created = createTableIfNotExists(db, 'security_intelligence', `
      CREATE TABLE security_intelligence (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        project_name TEXT NOT NULL,
        project_path TEXT NOT NULL,
        total_vulnerabilities INTEGER NOT NULL DEFAULT 0,
        critical_count INTEGER NOT NULL DEFAULT 0,
        high_count INTEGER NOT NULL DEFAULT 0,
        medium_count INTEGER NOT NULL DEFAULT 0,
        low_count INTEGER NOT NULL DEFAULT 0,
        patch_health_score INTEGER NOT NULL DEFAULT 100 CHECK (patch_health_score >= 0 AND patch_health_score <= 100),
        ci_status TEXT NOT NULL DEFAULT 'unknown' CHECK (ci_status IN ('passing', 'failing', 'unknown', 'pending')),
        ci_last_run TEXT,
        risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
        risk_trend TEXT NOT NULL DEFAULT 'stable' CHECK (risk_trend IN ('improving', 'stable', 'degrading')),
        last_scan_at TEXT,
        patches_pending INTEGER NOT NULL DEFAULT 0,
        patches_applied INTEGER NOT NULL DEFAULT 0,
        stale_branches_count INTEGER NOT NULL DEFAULT 0,
        community_score INTEGER CHECK (community_score IS NULL OR (community_score >= 0 AND community_score <= 100)),
        last_community_update TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_security_intelligence_risk ON security_intelligence(risk_score DESC);
        CREATE INDEX idx_security_intelligence_patch ON security_intelligence(patch_health_score);
        CREATE INDEX idx_security_intelligence_ci ON security_intelligence(ci_status);
      `);
      migrationLogger.info('security_intelligence table created successfully');
    }
  }, migrationLogger);

  // Create security_alerts table
  safeMigration('securityAlertsTable', () => {
    const created = createTableIfNotExists(db, 'security_alerts', `
      CREATE TABLE security_alerts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        alert_type TEXT NOT NULL CHECK (alert_type IN (
          'critical_vulnerability', 'new_vulnerability', 'patch_available',
          'ci_failure', 'risk_threshold', 'stale_branch'
        )),
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        acknowledged INTEGER NOT NULL DEFAULT 0,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_security_alerts_project ON security_alerts(project_id);
        CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
        CREATE INDEX idx_security_alerts_acknowledged ON security_alerts(acknowledged);
        CREATE INDEX idx_security_alerts_resolved ON security_alerts(resolved);
        CREATE INDEX idx_security_alerts_created ON security_alerts(created_at DESC);
      `);
      migrationLogger.info('security_alerts table created successfully');
    }
  }, migrationLogger);

  // Create stale_branches table
  safeMigration('staleBranchesTable', () => {
    const created = createTableIfNotExists(db, 'stale_branches', `
      CREATE TABLE stale_branches (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        last_commit_at TEXT NOT NULL,
        last_commit_author TEXT,
        days_stale INTEGER NOT NULL DEFAULT 0,
        has_vulnerabilities INTEGER NOT NULL DEFAULT 0,
        vulnerability_count INTEGER NOT NULL DEFAULT 0,
        auto_close_eligible INTEGER NOT NULL DEFAULT 0,
        auto_closed INTEGER NOT NULL DEFAULT 0,
        auto_closed_at TEXT,
        manually_preserved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_stale_branches_project ON stale_branches(project_id);
        CREATE INDEX idx_stale_branches_stale ON stale_branches(days_stale DESC);
        CREATE INDEX idx_stale_branches_eligible ON stale_branches(auto_close_eligible);
        CREATE UNIQUE INDEX idx_stale_branches_unique ON stale_branches(project_id, branch_name);
      `);
      migrationLogger.info('stale_branches table created successfully');
    }
  }, migrationLogger);

  // Create community_security_scores table
  safeMigration('communitySecurityScoresTable', () => {
    const created = createTableIfNotExists(db, 'community_security_scores', `
      CREATE TABLE community_security_scores (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        package_version TEXT NOT NULL,
        community_score INTEGER NOT NULL DEFAULT 50 CHECK (community_score >= 0 AND community_score <= 100),
        total_votes INTEGER NOT NULL DEFAULT 0,
        positive_votes INTEGER NOT NULL DEFAULT 0,
        negative_votes INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal', 'npm', 'github', 'snyk', 'other')),
        notes TEXT,
        last_updated TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_community_scores_project ON community_security_scores(project_id);
        CREATE INDEX idx_community_scores_package ON community_security_scores(package_name);
        CREATE INDEX idx_community_scores_score ON community_security_scores(community_score DESC);
        CREATE UNIQUE INDEX idx_community_scores_unique ON community_security_scores(project_id, package_name, package_version);
      `);
      migrationLogger.info('community_security_scores table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Security intelligence tables created successfully');
}

/**
 * Create blueprint composable architecture tables
 * Enables composable scan pipelines with reusable components
 */
function migrateBlueprintTables() {
  const db = getConnection();

  // Create blueprint_configs table
  safeMigration('blueprintConfigsTable', () => {
    const created = createTableIfNotExists(db, 'blueprint_configs', `
      CREATE TABLE blueprint_configs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        is_template INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_blueprint_configs_project ON blueprint_configs(project_id);
        CREATE INDEX idx_blueprint_configs_template ON blueprint_configs(is_template);
        CREATE INDEX idx_blueprint_configs_name ON blueprint_configs(name);
      `);
      migrationLogger.info('blueprint_configs table created successfully');
    }
  }, migrationLogger);

  // Create blueprint_executions table
  safeMigration('blueprintExecutionsTable', () => {
    const created = createTableIfNotExists(db, 'blueprint_executions', `
      CREATE TABLE blueprint_executions (
        id TEXT PRIMARY KEY,
        blueprint_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        current_node_id TEXT,
        node_results TEXT,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (blueprint_id) REFERENCES blueprint_configs(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_blueprint_executions_blueprint ON blueprint_executions(blueprint_id);
        CREATE INDEX idx_blueprint_executions_project ON blueprint_executions(project_id);
        CREATE INDEX idx_blueprint_executions_status ON blueprint_executions(status);
        CREATE INDEX idx_blueprint_executions_created ON blueprint_executions(project_id, created_at DESC);
      `);
      migrationLogger.info('blueprint_executions table created successfully');
    }
  }, migrationLogger);

  // Create blueprint_components registry table
  safeMigration('blueprintComponentsTable', () => {
    const created = createTableIfNotExists(db, 'blueprint_components', `
      CREATE TABLE blueprint_components (
        id TEXT PRIMARY KEY,
        component_id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('analyzer', 'processor', 'executor', 'tester')),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        icon TEXT,
        color TEXT,
        config_schema TEXT NOT NULL,
        default_config TEXT NOT NULL,
        input_types TEXT NOT NULL,
        output_types TEXT NOT NULL,
        supported_project_types TEXT NOT NULL DEFAULT '["*"]',
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_blueprint_components_type ON blueprint_components(type);
        CREATE INDEX idx_blueprint_components_custom ON blueprint_components(is_custom);
        CREATE INDEX idx_blueprint_components_category ON blueprint_components(category);
      `);
      migrationLogger.info('blueprint_components table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Blueprint composable architecture tables created successfully');
}

/**
 * Migration 34: Create Developer Mind-Meld tables for personalized AI learning
 */
function migrateDeveloperMindMeldTables() {
  const db = getConnection();

  // Create developer_profiles table
  safeMigration('developerProfilesTable', () => {
    const created = createTableIfNotExists(db, 'developer_profiles', `
      CREATE TABLE developer_profiles (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        preferred_scan_types TEXT NOT NULL DEFAULT '[]',
        avoided_scan_types TEXT NOT NULL DEFAULT '[]',
        preferred_patterns TEXT NOT NULL DEFAULT '[]',
        formatting_preferences TEXT NOT NULL DEFAULT '{}',
        security_posture TEXT NOT NULL DEFAULT 'balanced' CHECK (security_posture IN ('strict', 'balanced', 'relaxed')),
        performance_threshold TEXT NOT NULL DEFAULT 'medium' CHECK (performance_threshold IN ('high', 'medium', 'low')),
        total_decisions INTEGER NOT NULL DEFAULT 0,
        total_accepted INTEGER NOT NULL DEFAULT 0,
        total_rejected INTEGER NOT NULL DEFAULT 0,
        learning_confidence INTEGER NOT NULL DEFAULT 0 CHECK (learning_confidence >= 0 AND learning_confidence <= 100),
        last_profile_update TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE UNIQUE INDEX idx_developer_profiles_project ON developer_profiles(project_id);
        CREATE INDEX idx_developer_profiles_enabled ON developer_profiles(enabled);
      `);
      migrationLogger.info('developer_profiles table created successfully');
    }
  }, migrationLogger);

  // Create developer_decisions table
  safeMigration('developerDecisionsTable', () => {
    const created = createTableIfNotExists(db, 'developer_decisions', `
      CREATE TABLE developer_decisions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        decision_type TEXT NOT NULL CHECK (decision_type IN ('idea_accept', 'idea_reject', 'pattern_apply', 'pattern_skip', 'suggestion_accept', 'suggestion_dismiss')),
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        scan_type TEXT,
        category TEXT,
        effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3)),
        impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3)),
        accepted INTEGER NOT NULL,
        feedback TEXT,
        context_snapshot TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_developer_decisions_profile ON developer_decisions(profile_id);
        CREATE INDEX idx_developer_decisions_project ON developer_decisions(project_id);
        CREATE INDEX idx_developer_decisions_type ON developer_decisions(decision_type);
        CREATE INDEX idx_developer_decisions_scan_type ON developer_decisions(profile_id, scan_type);
        CREATE INDEX idx_developer_decisions_category ON developer_decisions(profile_id, category);
        CREATE INDEX idx_developer_decisions_created ON developer_decisions(profile_id, created_at DESC);
      `);
      migrationLogger.info('developer_decisions table created successfully');
    }
  }, migrationLogger);

  // Create learning_insights table
  safeMigration('learningInsightsTable', () => {
    const created = createTableIfNotExists(db, 'learning_insights', `
      CREATE TABLE learning_insights (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern_detected', 'consistency_violation', 'skill_gap', 'preference_learned', 'prediction_confidence')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        data TEXT NOT NULL,
        confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
        importance TEXT NOT NULL CHECK (importance IN ('high', 'medium', 'low')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dismissed', 'applied')),
        related_entity_type TEXT,
        related_entity_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_learning_insights_profile ON learning_insights(profile_id);
        CREATE INDEX idx_learning_insights_project ON learning_insights(project_id);
        CREATE INDEX idx_learning_insights_type ON learning_insights(insight_type);
        CREATE INDEX idx_learning_insights_status ON learning_insights(profile_id, status);
        CREATE INDEX idx_learning_insights_importance ON learning_insights(profile_id, importance);
      `);
      migrationLogger.info('learning_insights table created successfully');
    }
  }, migrationLogger);

  // Create code_pattern_usage table
  safeMigration('codePatternUsageTable', () => {
    const created = createTableIfNotExists(db, 'code_pattern_usage', `
      CREATE TABLE code_pattern_usage (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        pattern_name TEXT NOT NULL,
        pattern_signature TEXT NOT NULL,
        usage_count INTEGER NOT NULL DEFAULT 1,
        last_used_at TEXT NOT NULL,
        first_used_at TEXT NOT NULL,
        file_paths TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_code_pattern_usage_profile ON code_pattern_usage(profile_id);
        CREATE INDEX idx_code_pattern_usage_project ON code_pattern_usage(project_id);
        CREATE INDEX idx_code_pattern_usage_name ON code_pattern_usage(profile_id, pattern_name);
        CREATE INDEX idx_code_pattern_usage_signature ON code_pattern_usage(profile_id, pattern_signature);
        CREATE INDEX idx_code_pattern_usage_category ON code_pattern_usage(profile_id, category);
        CREATE INDEX idx_code_pattern_usage_count ON code_pattern_usage(profile_id, usage_count DESC);
      `);
      migrationLogger.info('code_pattern_usage table created successfully');
    }
  }, migrationLogger);

  // Create consistency_rules table
  safeMigration('consistencyRulesTable', () => {
    const created = createTableIfNotExists(db, 'consistency_rules', `
      CREATE TABLE consistency_rules (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        rule_type TEXT NOT NULL CHECK (rule_type IN ('api_structure', 'component_pattern', 'naming_convention', 'file_organization', 'error_handling', 'custom')),
        description TEXT NOT NULL,
        pattern_template TEXT NOT NULL,
        example_code TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        severity TEXT NOT NULL DEFAULT 'suggestion' CHECK (severity IN ('error', 'warning', 'suggestion')),
        auto_suggest INTEGER NOT NULL DEFAULT 1,
        violations_detected INTEGER NOT NULL DEFAULT 0,
        violations_fixed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_consistency_rules_profile ON consistency_rules(profile_id);
        CREATE INDEX idx_consistency_rules_project ON consistency_rules(project_id);
        CREATE INDEX idx_consistency_rules_type ON consistency_rules(rule_type);
        CREATE INDEX idx_consistency_rules_enabled ON consistency_rules(profile_id, enabled);
        CREATE INDEX idx_consistency_rules_severity ON consistency_rules(profile_id, severity);
      `);
      migrationLogger.info('consistency_rules table created successfully');
    }
  }, migrationLogger);

  // Create skill_tracking table
  safeMigration('skillTrackingTable', () => {
    const created = createTableIfNotExists(db, 'skill_tracking', `
      CREATE TABLE skill_tracking (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        skill_area TEXT NOT NULL,
        sub_skill TEXT,
        proficiency_score INTEGER NOT NULL DEFAULT 0 CHECK (proficiency_score >= 0 AND proficiency_score <= 100),
        implementations_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
        last_activity_at TEXT NOT NULL,
        improvement_suggestions TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (profile_id) REFERENCES developer_profiles(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_skill_tracking_profile ON skill_tracking(profile_id);
        CREATE INDEX idx_skill_tracking_project ON skill_tracking(project_id);
        CREATE INDEX idx_skill_tracking_area ON skill_tracking(profile_id, skill_area);
        CREATE INDEX idx_skill_tracking_proficiency ON skill_tracking(profile_id, proficiency_score DESC);
        CREATE INDEX idx_skill_tracking_trend ON skill_tracking(profile_id, trend);
      `);
      migrationLogger.info('skill_tracking table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Developer Mind-Meld tables created successfully');
}

/**
 * Migration 35: Update ideas table to support 1-10 scoring scale and add risk column
 * - Extends effort and impact from 1-3 scale to 1-10 scale
 * - Adds new risk column (1-10 scale)
 * - Maintains all existing data with proper migration
 */
function migrateIdeasExtendedScoring() {
  safeMigration('ideasExtendedScoring', () => {
    const db = getConnection();

    // Check if ideas table exists first
    if (!tableExists(db, 'ideas')) {
      migrationLogger.info('Ideas table does not exist yet, skipping extended scoring migration');
      return;
    }

    // Check if risk column already exists
    const tableInfo = getTableInfo(db, 'ideas');
    const hasRiskColumn = tableInfo.some(col => col.name === 'risk');

    if (hasRiskColumn) {
      migrationLogger.info('Ideas table already has extended scoring (1-10) and risk column');
      return;
    }

    migrationLogger.info('Starting migration to extend ideas scoring to 1-10 scale and add risk column...');

    // SQLite doesn't support modifying CHECK constraints directly
    // We need to recreate the table with new constraints

    // Step 1: Rename the existing table
    db.exec('ALTER TABLE ideas RENAME TO ideas_old');

    // Step 2: Create new table with updated constraints
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
      )
    `);

    // Step 3: Copy data from old table to new table
    // Old effort/impact values (1-3) are still valid in the new 1-10 scale
    db.exec(`
      INSERT INTO ideas (
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, risk,
        requirement_id, goal_id, created_at, updated_at, implemented_at
      )
      SELECT
        id, scan_id, project_id, context_id, scan_type, category, title, description,
        reasoning, status, user_feedback, user_pattern, effort, impact, NULL as risk,
        requirement_id, goal_id, created_at, updated_at, implemented_at
      FROM ideas_old
    `);

    // Step 4: Drop the old table
    db.exec('DROP TABLE ideas_old');

    // Step 5: Recreate indexes if they existed
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
      CREATE INDEX IF NOT EXISTS idx_ideas_scan_type ON ideas(scan_type);
      CREATE INDEX IF NOT EXISTS idx_ideas_goal_id ON ideas(goal_id);
      CREATE INDEX IF NOT EXISTS idx_ideas_requirement_id ON ideas(requirement_id);
    `);

    migrationLogger.success('Ideas table successfully migrated to 1-10 scoring scale with risk column');
  }, migrationLogger);
}

/**
 * Migration 36: Create onboarding accelerator tables for AI-driven developer onboarding
 */
function migrateOnboardingAcceleratorTables() {
  const db = getConnection();

  // Create learning_paths table
  safeMigration('learningPathsTable', () => {
    const created = createTableIfNotExists(db, 'learning_paths', `
      CREATE TABLE learning_paths (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        developer_name TEXT NOT NULL,
        assigned_work TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
        total_modules INTEGER NOT NULL DEFAULT 0,
        completed_modules INTEGER NOT NULL DEFAULT 0,
        progress_percentage INTEGER NOT NULL DEFAULT 0,
        estimated_hours REAL NOT NULL DEFAULT 0,
        actual_hours REAL NOT NULL DEFAULT 0,
        learning_speed REAL NOT NULL DEFAULT 1.0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_learning_paths_project ON learning_paths(project_id);
        CREATE INDEX idx_learning_paths_status ON learning_paths(status);
        CREATE INDEX idx_learning_paths_developer ON learning_paths(developer_name);
      `);
      migrationLogger.info('learning_paths table created successfully');
    }
  }, migrationLogger);

  // Create learning_modules table
  safeMigration('learningModulesTable', () => {
    const created = createTableIfNotExists(db, 'learning_modules', `
      CREATE TABLE learning_modules (
        id TEXT PRIMARY KEY,
        path_id TEXT NOT NULL,
        context_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('locked', 'available', 'in_progress', 'completed', 'skipped')) DEFAULT 'locked',
        difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
        estimated_minutes INTEGER NOT NULL DEFAULT 30,
        actual_minutes INTEGER,
        relevance_score INTEGER NOT NULL DEFAULT 50 CHECK (relevance_score >= 0 AND relevance_score <= 100),
        prerequisites TEXT NOT NULL DEFAULT '[]',
        key_concepts TEXT NOT NULL DEFAULT '[]',
        code_areas TEXT NOT NULL DEFAULT '[]',
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_learning_modules_path ON learning_modules(path_id);
        CREATE INDEX idx_learning_modules_context ON learning_modules(context_id);
        CREATE INDEX idx_learning_modules_status ON learning_modules(status);
        CREATE INDEX idx_learning_modules_order ON learning_modules(path_id, order_index);
      `);
      migrationLogger.info('learning_modules table created successfully');
    }
  }, migrationLogger);

  // Create code_walkthroughs table
  safeMigration('codeWalkthroughsTable', () => {
    const created = createTableIfNotExists(db, 'code_walkthroughs', `
      CREATE TABLE code_walkthroughs (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        key_points TEXT NOT NULL DEFAULT '[]',
        related_files TEXT NOT NULL DEFAULT '[]',
        viewed INTEGER NOT NULL DEFAULT 0,
        viewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_code_walkthroughs_module ON code_walkthroughs(module_id);
        CREATE INDEX idx_code_walkthroughs_order ON code_walkthroughs(module_id, order_index);
        CREATE INDEX idx_code_walkthroughs_file ON code_walkthroughs(file_path);
      `);
      migrationLogger.info('code_walkthroughs table created successfully');
    }
  }, migrationLogger);

  // Create quiz_questions table
  safeMigration('quizQuestionsTable', () => {
    const created = createTableIfNotExists(db, 'quiz_questions', `
      CREATE TABLE quiz_questions (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL,
        question TEXT NOT NULL,
        question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'code_review', 'true_false', 'fill_blank')),
        options TEXT NOT NULL DEFAULT '[]',
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        code_snippet TEXT,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
        points INTEGER NOT NULL DEFAULT 10,
        order_index INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_quiz_questions_module ON quiz_questions(module_id);
        CREATE INDEX idx_quiz_questions_type ON quiz_questions(question_type);
        CREATE INDEX idx_quiz_questions_order ON quiz_questions(module_id, order_index);
      `);
      migrationLogger.info('quiz_questions table created successfully');
    }
  }, migrationLogger);

  // Create quiz_responses table
  safeMigration('quizResponsesTable', () => {
    const created = createTableIfNotExists(db, 'quiz_responses', `
      CREATE TABLE quiz_responses (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        path_id TEXT NOT NULL,
        answer TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('correct', 'incorrect', 'partial')),
        points_earned INTEGER NOT NULL DEFAULT 0,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        feedback TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_quiz_responses_question ON quiz_responses(question_id);
        CREATE INDEX idx_quiz_responses_path ON quiz_responses(path_id);
        CREATE INDEX idx_quiz_responses_status ON quiz_responses(status);
      `);
      migrationLogger.info('quiz_responses table created successfully');
    }
  }, migrationLogger);

  // Create learning_metrics table
  safeMigration('learningMetricsTable', () => {
    const created = createTableIfNotExists(db, 'learning_metrics', `
      CREATE TABLE learning_metrics (
        id TEXT PRIMARY KEY,
        path_id TEXT NOT NULL,
        module_id TEXT,
        estimated_time_minutes INTEGER NOT NULL DEFAULT 0,
        actual_time_minutes INTEGER NOT NULL DEFAULT 0,
        quiz_attempts INTEGER NOT NULL DEFAULT 0,
        quiz_correct INTEGER NOT NULL DEFAULT 0,
        quiz_total INTEGER NOT NULL DEFAULT 0,
        average_quiz_score REAL NOT NULL DEFAULT 0,
        reading_speed_factor REAL NOT NULL DEFAULT 1.0,
        comprehension_score REAL NOT NULL DEFAULT 0,
        walkthroughs_viewed INTEGER NOT NULL DEFAULT 0,
        walkthroughs_total INTEGER NOT NULL DEFAULT 0,
        revisits INTEGER NOT NULL DEFAULT 0,
        last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_learning_metrics_path ON learning_metrics(path_id);
        CREATE INDEX idx_learning_metrics_module ON learning_metrics(module_id);
        CREATE INDEX idx_learning_metrics_activity ON learning_metrics(last_activity_at);
      `);
      migrationLogger.info('learning_metrics table created successfully');
    }
  }, migrationLogger);

  // Create onboarding_recommendations table
  safeMigration('onboardingRecommendationsTable', () => {
    const created = createTableIfNotExists(db, 'onboarding_recommendations', `
      CREATE TABLE onboarding_recommendations (
        id TEXT PRIMARY KEY,
        path_id TEXT NOT NULL,
        recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('add_module', 'skip_module', 'revisit_module', 'adjust_pace', 'add_practice')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reason TEXT NOT NULL,
        context_id TEXT,
        module_id TEXT,
        priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'dismissed')) DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL,
        FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_onboarding_recommendations_path ON onboarding_recommendations(path_id);
        CREATE INDEX idx_onboarding_recommendations_status ON onboarding_recommendations(status);
        CREATE INDEX idx_onboarding_recommendations_priority ON onboarding_recommendations(priority DESC);
        CREATE INDEX idx_onboarding_recommendations_type ON onboarding_recommendations(recommendation_type);
      `);
      migrationLogger.info('onboarding_recommendations table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Onboarding Accelerator tables created successfully');
}

/**
 * Migration 37: Create strategic roadmap engine tables
 * Tables for predictive 6-month development roadmap with game-theoretic modeling
 */
function migrateStrategicRoadmapTables() {
  const db = getConnection();

  // Create strategic_initiatives table
  safeMigration('strategicInitiativesTable', () => {
    const created = createTableIfNotExists(db, 'strategic_initiatives', `
      CREATE TABLE strategic_initiatives (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        initiative_type TEXT NOT NULL CHECK (initiative_type IN ('feature', 'refactoring', 'debt_reduction', 'security', 'performance', 'infrastructure')),
        priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        business_impact_score INTEGER NOT NULL DEFAULT 50 CHECK (business_impact_score >= 0 AND business_impact_score <= 100),
        technical_impact_score INTEGER NOT NULL DEFAULT 50 CHECK (technical_impact_score >= 0 AND technical_impact_score <= 100),
        risk_reduction_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_reduction_score >= 0 AND risk_reduction_score <= 100),
        velocity_impact_score INTEGER NOT NULL DEFAULT 0 CHECK (velocity_impact_score >= -100 AND velocity_impact_score <= 100),
        estimated_effort_hours INTEGER NOT NULL DEFAULT 0,
        estimated_complexity TEXT NOT NULL CHECK (estimated_complexity IN ('trivial', 'low', 'medium', 'high', 'extreme')) DEFAULT 'medium',
        target_quarter TEXT NOT NULL,
        target_month INTEGER NOT NULL DEFAULT 1 CHECK (target_month >= 1 AND target_month <= 6),
        depends_on TEXT NOT NULL DEFAULT '[]',
        blocks TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'deferred', 'cancelled')) DEFAULT 'proposed',
        confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
        simulated_outcomes TEXT NOT NULL DEFAULT '{}',
        related_tech_debt_ids TEXT NOT NULL DEFAULT '[]',
        related_goal_ids TEXT NOT NULL DEFAULT '[]',
        related_idea_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_strategic_initiatives_project ON strategic_initiatives(project_id);
        CREATE INDEX idx_strategic_initiatives_status ON strategic_initiatives(status);
        CREATE INDEX idx_strategic_initiatives_type ON strategic_initiatives(initiative_type);
        CREATE INDEX idx_strategic_initiatives_quarter ON strategic_initiatives(target_quarter);
        CREATE INDEX idx_strategic_initiatives_priority ON strategic_initiatives(priority DESC);
      `);
      migrationLogger.info('strategic_initiatives table created successfully');
    }
  }, migrationLogger);

  // Create roadmap_milestones table
  safeMigration('roadmapMilestonesTable', () => {
    const created = createTableIfNotExists(db, 'roadmap_milestones', `
      CREATE TABLE roadmap_milestones (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        initiative_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target_date TEXT NOT NULL,
        quarter_index INTEGER NOT NULL CHECK (quarter_index >= 1 AND quarter_index <= 6),
        month_index INTEGER NOT NULL CHECK (month_index >= 1 AND month_index <= 6),
        target_health_score INTEGER NOT NULL DEFAULT 70 CHECK (target_health_score >= 0 AND target_health_score <= 100),
        target_debt_reduction INTEGER NOT NULL DEFAULT 0,
        target_velocity_improvement INTEGER NOT NULL DEFAULT 0,
        actual_health_score INTEGER,
        actual_debt_reduction INTEGER,
        actual_velocity_change INTEGER,
        status TEXT NOT NULL CHECK (status IN ('upcoming', 'current', 'achieved', 'missed', 'skipped')) DEFAULT 'upcoming',
        key_results TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        achieved_at TEXT,
        FOREIGN KEY (initiative_id) REFERENCES strategic_initiatives(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_roadmap_milestones_project ON roadmap_milestones(project_id);
        CREATE INDEX idx_roadmap_milestones_initiative ON roadmap_milestones(initiative_id);
        CREATE INDEX idx_roadmap_milestones_status ON roadmap_milestones(status);
        CREATE INDEX idx_roadmap_milestones_month ON roadmap_milestones(month_index);
      `);
      migrationLogger.info('roadmap_milestones table created successfully');
    }
  }, migrationLogger);

  // Create impact_predictions table
  safeMigration('impactPredictionsTable', () => {
    const created = createTableIfNotExists(db, 'impact_predictions', `
      CREATE TABLE impact_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        subject_type TEXT NOT NULL CHECK (subject_type IN ('initiative', 'tech_debt', 'feature', 'refactoring')),
        subject_id TEXT NOT NULL,
        prediction_horizon TEXT NOT NULL CHECK (prediction_horizon IN ('1_month', '3_months', '6_months')),
        predicted_at TEXT NOT NULL DEFAULT (datetime('now')),
        debt_impact INTEGER NOT NULL DEFAULT 0 CHECK (debt_impact >= -100 AND debt_impact <= 100),
        velocity_impact INTEGER NOT NULL DEFAULT 0 CHECK (velocity_impact >= -100 AND velocity_impact <= 100),
        risk_impact INTEGER NOT NULL DEFAULT 0 CHECK (risk_impact >= -100 AND risk_impact <= 100),
        complexity_impact INTEGER NOT NULL DEFAULT 0 CHECK (complexity_impact >= -100 AND complexity_impact <= 100),
        confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
        methodology TEXT NOT NULL DEFAULT '',
        interactions TEXT NOT NULL DEFAULT '[]',
        nash_equilibrium TEXT,
        pareto_optimal INTEGER NOT NULL DEFAULT 0,
        simulation_runs INTEGER NOT NULL DEFAULT 0,
        best_case_outcome TEXT NOT NULL DEFAULT '{}',
        worst_case_outcome TEXT NOT NULL DEFAULT '{}',
        most_likely_outcome TEXT NOT NULL DEFAULT '{}',
        actual_outcome TEXT,
        prediction_accuracy INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        validated_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_impact_predictions_project ON impact_predictions(project_id);
        CREATE INDEX idx_impact_predictions_subject ON impact_predictions(subject_type, subject_id);
        CREATE INDEX idx_impact_predictions_horizon ON impact_predictions(prediction_horizon);
      `);
      migrationLogger.info('impact_predictions table created successfully');
    }
  }, migrationLogger);

  // Create feature_interactions table
  safeMigration('featureInteractionsTable', () => {
    const created = createTableIfNotExists(db, 'feature_interactions', `
      CREATE TABLE feature_interactions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        feature_a_id TEXT NOT NULL,
        feature_a_type TEXT NOT NULL CHECK (feature_a_type IN ('initiative', 'idea', 'tech_debt', 'goal')),
        feature_b_id TEXT NOT NULL,
        feature_b_type TEXT NOT NULL CHECK (feature_b_type IN ('initiative', 'idea', 'tech_debt', 'goal')),
        interaction_type TEXT NOT NULL CHECK (interaction_type IN ('synergy', 'conflict', 'dependency', 'neutral')),
        interaction_strength INTEGER NOT NULL DEFAULT 50 CHECK (interaction_strength >= 0 AND interaction_strength <= 100),
        is_bidirectional INTEGER NOT NULL DEFAULT 1,
        impact_a_on_b INTEGER NOT NULL DEFAULT 0 CHECK (impact_a_on_b >= -100 AND impact_a_on_b <= 100),
        impact_b_on_a INTEGER NOT NULL DEFAULT 0 CHECK (impact_b_on_a >= -100 AND impact_b_on_a <= 100),
        shared_files TEXT NOT NULL DEFAULT '[]',
        shared_contexts TEXT NOT NULL DEFAULT '[]',
        analysis TEXT NOT NULL DEFAULT '',
        recommendations TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_feature_interactions_project ON feature_interactions(project_id);
        CREATE INDEX idx_feature_interactions_a ON feature_interactions(feature_a_type, feature_a_id);
        CREATE INDEX idx_feature_interactions_b ON feature_interactions(feature_b_type, feature_b_id);
        CREATE INDEX idx_feature_interactions_type ON feature_interactions(interaction_type);
      `);
      migrationLogger.info('feature_interactions table created successfully');
    }
  }, migrationLogger);

  // Create debt_prevention_rules table
  safeMigration('debtPreventionRulesTable', () => {
    const created = createTableIfNotExists(db, 'debt_prevention_rules', `
      CREATE TABLE debt_prevention_rules (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        debt_pattern_id TEXT,
        target_category TEXT NOT NULL,
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('file_change', 'complexity_threshold', 'dependency_added', 'pattern_detected')),
        trigger_conditions TEXT NOT NULL DEFAULT '{}',
        action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'suggestion', 'auto_refactor', 'block')),
        action_template TEXT NOT NULL DEFAULT '',
        apply_at TEXT NOT NULL CHECK (apply_at IN ('pre_commit', 'on_save', 'on_scan', 'scheduled')) DEFAULT 'on_scan',
        times_triggered INTEGER NOT NULL DEFAULT 0,
        times_prevented INTEGER NOT NULL DEFAULT 0,
        estimated_debt_prevented INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (debt_pattern_id) REFERENCES debt_patterns(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_debt_prevention_rules_project ON debt_prevention_rules(project_id);
        CREATE INDEX idx_debt_prevention_rules_active ON debt_prevention_rules(is_active);
        CREATE INDEX idx_debt_prevention_rules_pattern ON debt_prevention_rules(debt_pattern_id);
      `);
      migrationLogger.info('debt_prevention_rules table created successfully');
    }
  }, migrationLogger);

  // Create velocity_tracking table
  safeMigration('velocityTrackingTable', () => {
    const created = createTableIfNotExists(db, 'velocity_tracking', `
      CREATE TABLE velocity_tracking (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
        ideas_implemented INTEGER NOT NULL DEFAULT 0,
        tech_debt_resolved INTEGER NOT NULL DEFAULT 0,
        features_completed INTEGER NOT NULL DEFAULT 0,
        refactorings_completed INTEGER NOT NULL DEFAULT 0,
        bugs_introduced INTEGER NOT NULL DEFAULT 0,
        bugs_fixed INTEGER NOT NULL DEFAULT 0,
        test_coverage_change INTEGER NOT NULL DEFAULT 0,
        total_effort_hours INTEGER NOT NULL DEFAULT 0,
        effective_effort_hours INTEGER NOT NULL DEFAULT 0,
        health_score INTEGER NOT NULL DEFAULT 0,
        debt_score INTEGER NOT NULL DEFAULT 0,
        complexity_score INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_velocity_tracking_project ON velocity_tracking(project_id);
        CREATE INDEX idx_velocity_tracking_period ON velocity_tracking(period_start, period_end);
        CREATE INDEX idx_velocity_tracking_type ON velocity_tracking(period_type);
      `);
      migrationLogger.info('velocity_tracking table created successfully');
    }
  }, migrationLogger);

  // Create roadmap_simulations table
  safeMigration('roadmapSimulationsTable', () => {
    const created = createTableIfNotExists(db, 'roadmap_simulations', `
      CREATE TABLE roadmap_simulations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        simulation_type TEXT NOT NULL CHECK (simulation_type IN ('baseline', 'optimistic', 'pessimistic', 'custom')) DEFAULT 'baseline',
        input_parameters TEXT NOT NULL DEFAULT '{}',
        assumptions TEXT NOT NULL DEFAULT '[]',
        projected_initiatives TEXT NOT NULL DEFAULT '[]',
        projected_milestones TEXT NOT NULL DEFAULT '[]',
        projected_health_scores TEXT NOT NULL DEFAULT '[]',
        projected_velocity TEXT NOT NULL DEFAULT '[]',
        total_debt_reduction INTEGER NOT NULL DEFAULT 0,
        velocity_improvement INTEGER NOT NULL DEFAULT 0,
        risk_reduction INTEGER NOT NULL DEFAULT 0,
        is_selected INTEGER NOT NULL DEFAULT 0,
        comparison_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_roadmap_simulations_project ON roadmap_simulations(project_id);
        CREATE INDEX idx_roadmap_simulations_selected ON roadmap_simulations(is_selected);
        CREATE INDEX idx_roadmap_simulations_type ON roadmap_simulations(simulation_type);
      `);
      migrationLogger.info('roadmap_simulations table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Strategic Roadmap Engine tables created successfully');
}

/**
 * Migration 38: Create hypothesis-driven testing tables
 * Tables for hypothesis testing, invariants, fuzzing, property tests, and knowledge
 */
function migrateHypothesisTestingTables() {
  const db = getConnection();

  // Create hypotheses table
  safeMigration('hypothesesTable', () => {
    const created = createTableIfNotExists(db, 'hypotheses', `
      CREATE TABLE hypotheses (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,
        title TEXT NOT NULL,
        statement TEXT NOT NULL,
        hypothesis_type TEXT NOT NULL CHECK (hypothesis_type IN (
          'complexity', 'behavior', 'invariant', 'boundary', 'performance',
          'security', 'concurrency', 'state', 'integration'
        )),
        target_code TEXT NOT NULL,
        target_lines TEXT,
        reasoning TEXT,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        discovery_source TEXT NOT NULL,
        verification_method TEXT NOT NULL CHECK (verification_method IN (
          'unit_test', 'property_test', 'fuzz_test', 'benchmark',
          'static_analysis', 'runtime_check', 'integration_test'
        )),
        status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
          'proposed', 'testing', 'proven', 'disproven', 'inconclusive', 'refined'
        )),
        priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        test_count INTEGER NOT NULL DEFAULT 0,
        pass_count INTEGER NOT NULL DEFAULT 0,
        fail_count INTEGER NOT NULL DEFAULT 0,
        evidence TEXT,
        conclusion TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        tested_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_hypotheses_project ON hypotheses(project_id);
        CREATE INDEX idx_hypotheses_context ON hypotheses(context_id);
        CREATE INDEX idx_hypotheses_type ON hypotheses(hypothesis_type);
        CREATE INDEX idx_hypotheses_status ON hypotheses(status);
        CREATE INDEX idx_hypotheses_priority ON hypotheses(priority DESC);
        CREATE INDEX idx_hypotheses_target ON hypotheses(target_code);
      `);
      migrationLogger.info('hypotheses table created successfully');
    }
  }, migrationLogger);

  // Create invariants table
  safeMigration('invariantsTable', () => {
    const created = createTableIfNotExists(db, 'invariants', `
      CREATE TABLE invariants (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'null_safety', 'range_bounds', 'type_constraints', 'relationship',
          'ordering', 'uniqueness', 'immutability', 'idempotence', 'custom'
        )),
        scope TEXT NOT NULL CHECK (scope IN ('function', 'class', 'module', 'global')),
        target_code TEXT NOT NULL,
        expression TEXT NOT NULL,
        validated INTEGER NOT NULL DEFAULT 0,
        validation_count INTEGER NOT NULL DEFAULT 0,
        violation_count INTEGER NOT NULL DEFAULT 0,
        last_violation TEXT,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        auto_generated INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_invariants_project ON invariants(project_id);
        CREATE INDEX idx_invariants_hypothesis ON invariants(hypothesis_id);
        CREATE INDEX idx_invariants_category ON invariants(category);
        CREATE INDEX idx_invariants_target ON invariants(target_code);
        CREATE INDEX idx_invariants_validated ON invariants(validated);
      `);
      migrationLogger.info('invariants table created successfully');
    }
  }, migrationLogger);

  // Create fuzz_sessions table
  safeMigration('fuzzSessionsTable', () => {
    const created = createTableIfNotExists(db, 'fuzz_sessions', `
      CREATE TABLE fuzz_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,
        target_function TEXT NOT NULL,
        target_file TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        strategy TEXT NOT NULL DEFAULT 'random' CHECK (strategy IN (
          'random', 'mutation', 'grammar', 'coverage', 'property', 'vulnerability'
        )),
        vulnerability_targets TEXT,
        max_iterations INTEGER NOT NULL DEFAULT 10000,
        timeout_ms INTEGER NOT NULL DEFAULT 5000,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'running', 'completed', 'stopped', 'crashed'
        )),
        iterations_completed INTEGER NOT NULL DEFAULT 0,
        crashes_found INTEGER NOT NULL DEFAULT 0,
        hangs_found INTEGER NOT NULL DEFAULT 0,
        coverage_increase REAL,
        findings TEXT,
        best_inputs TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_fuzz_sessions_project ON fuzz_sessions(project_id);
        CREATE INDEX idx_fuzz_sessions_hypothesis ON fuzz_sessions(hypothesis_id);
        CREATE INDEX idx_fuzz_sessions_status ON fuzz_sessions(status);
        CREATE INDEX idx_fuzz_sessions_target ON fuzz_sessions(target_file);
      `);
      migrationLogger.info('fuzz_sessions table created successfully');
    }
  }, migrationLogger);

  // Create property_tests table
  safeMigration('propertyTestsTable', () => {
    const created = createTableIfNotExists(db, 'property_tests', `
      CREATE TABLE property_tests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,
        invariant_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        property_type TEXT NOT NULL CHECK (property_type IN (
          'for_all', 'there_exists', 'commutative', 'associative',
          'idempotent', 'inverse', 'monotonic', 'bounded', 'custom'
        )),
        target_function TEXT NOT NULL,
        target_file TEXT NOT NULL,
        generator_code TEXT NOT NULL,
        predicate_code TEXT NOT NULL,
        shrink_code TEXT,
        num_tests INTEGER NOT NULL DEFAULT 100,
        seed INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'running', 'passed', 'failed'
        )),
        tests_run INTEGER NOT NULL DEFAULT 0,
        counterexamples TEXT,
        shrunk_example TEXT,
        execution_time_ms INTEGER,
        last_run_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL,
        FOREIGN KEY (invariant_id) REFERENCES invariants(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_property_tests_project ON property_tests(project_id);
        CREATE INDEX idx_property_tests_hypothesis ON property_tests(hypothesis_id);
        CREATE INDEX idx_property_tests_invariant ON property_tests(invariant_id);
        CREATE INDEX idx_property_tests_status ON property_tests(status);
        CREATE INDEX idx_property_tests_target ON property_tests(target_file);
      `);
      migrationLogger.info('property_tests table created successfully');
    }
  }, migrationLogger);

  // Create test_knowledge table
  safeMigration('testKnowledgeTable', () => {
    const created = createTableIfNotExists(db, 'test_knowledge', `
      CREATE TABLE test_knowledge (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,
        knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
          'invariant_discovered', 'bug_found', 'performance_baseline',
          'security_issue', 'behavior_documented', 'edge_case_identified'
        )),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        related_files TEXT NOT NULL,
        related_functions TEXT,
        source_test_id TEXT,
        evidence_summary TEXT NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        impact_assessment TEXT,
        recommendations TEXT,
        acknowledged INTEGER NOT NULL DEFAULT 0,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolution_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_test_knowledge_project ON test_knowledge(project_id);
        CREATE INDEX idx_test_knowledge_hypothesis ON test_knowledge(hypothesis_id);
        CREATE INDEX idx_test_knowledge_type ON test_knowledge(knowledge_type);
        CREATE INDEX idx_test_knowledge_acknowledged ON test_knowledge(acknowledged);
        CREATE INDEX idx_test_knowledge_resolved ON test_knowledge(resolved);
      `);
      migrationLogger.info('test_knowledge table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Hypothesis-driven testing tables created successfully');
}

/**
 * Migration 39: Create project health score tables
 */
function migrateProjectHealthTables() {
  const db = getConnection();

  // Create project_health table for health score snapshots
  safeMigration('projectHealthTable', () => {
    const created = createTableIfNotExists(db, 'project_health', `
      CREATE TABLE project_health (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        overall_score INTEGER NOT NULL CHECK(overall_score >= 0 AND overall_score <= 100),
        status TEXT NOT NULL CHECK(status IN ('excellent', 'good', 'fair', 'poor', 'critical')),
        category_scores TEXT NOT NULL,
        trend REAL DEFAULT 0,
        trend_direction TEXT DEFAULT 'stable' CHECK(trend_direction IN ('up', 'down', 'stable')),
        ai_explanation TEXT,
        ai_recommendation TEXT,
        created_at TEXT NOT NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_project_health_project ON project_health(project_id);
        CREATE INDEX idx_project_health_created ON project_health(created_at DESC);
        CREATE INDEX idx_project_health_status ON project_health(status);
      `);
      migrationLogger.info('project_health table created successfully');
    }
  }, migrationLogger);

  // Create health_score_config table for project-specific configuration
  safeMigration('healthScoreConfigTable', () => {
    const created = createTableIfNotExists(db, 'health_score_config', `
      CREATE TABLE health_score_config (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        enabled INTEGER DEFAULT 1,
        auto_calculate INTEGER DEFAULT 1,
        calculation_frequency TEXT DEFAULT 'on_change' CHECK(calculation_frequency IN ('on_change', 'hourly', 'daily')),
        category_weights TEXT NOT NULL,
        thresholds TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_health_config_project ON health_score_config(project_id);
      `);
      migrationLogger.info('health_score_config table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Project health score tables created successfully');
}

/**
 * Migration 40: Create daily standup tables
 */
function migrateDailyStandupTables() {
  const db = getConnection();

  // Create standup_summaries table
  safeMigration('standupSummariesTable', () => {
    const created = createTableIfNotExists(db, 'standup_summaries', `
      CREATE TABLE standup_summaries (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,

        title TEXT NOT NULL,
        summary TEXT NOT NULL,

        implementations_count INTEGER NOT NULL DEFAULT 0,
        ideas_generated INTEGER NOT NULL DEFAULT 0,
        ideas_accepted INTEGER NOT NULL DEFAULT 0,
        ideas_rejected INTEGER NOT NULL DEFAULT 0,
        ideas_implemented INTEGER NOT NULL DEFAULT 0,
        scans_count INTEGER NOT NULL DEFAULT 0,

        blockers TEXT,
        highlights TEXT,

        velocity_trend TEXT CHECK (velocity_trend IN ('increasing', 'stable', 'decreasing')),
        burnout_risk TEXT CHECK (burnout_risk IN ('low', 'medium', 'high')),
        focus_areas TEXT,

        input_tokens INTEGER,
        output_tokens INTEGER,

        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        UNIQUE(project_id, period_type, period_start)
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_standup_summaries_project ON standup_summaries(project_id);
        CREATE INDEX idx_standup_summaries_period_type ON standup_summaries(period_type);
        CREATE INDEX idx_standup_summaries_period_start ON standup_summaries(period_start);
        CREATE INDEX idx_standup_summaries_generated_at ON standup_summaries(generated_at DESC);
      `);
      migrationLogger.info('standup_summaries table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Daily standup tables created successfully');
}

/**
 * Migration 41: Create red team testing tables
 * Adversarial testing with specialized AI agents
 */
function migrateRedTeamTestingTables() {
  const db = getConnection();

  // Create red_team_sessions table
  safeMigration('redTeamSessionsTable', () => {
    const created = createTableIfNotExists(db, 'red_team_sessions', `
      CREATE TABLE red_team_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        target_scope TEXT NOT NULL,
        attack_categories TEXT NOT NULL,
        participating_agents TEXT NOT NULL,
        agent_roles TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
          'planning', 'attacking', 'debating', 'validating', 'reporting', 'completed'
        )),
        current_phase TEXT,
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        total_attacks INTEGER NOT NULL DEFAULT 0,
        successful_attacks INTEGER NOT NULL DEFAULT 0,
        vulnerabilities_found INTEGER NOT NULL DEFAULT 0,
        critical_count INTEGER NOT NULL DEFAULT 0,
        high_count INTEGER NOT NULL DEFAULT 0,
        medium_count INTEGER NOT NULL DEFAULT 0,
        low_count INTEGER NOT NULL DEFAULT 0,
        overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
        risk_summary TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_sessions_project ON red_team_sessions(project_id);
        CREATE INDEX idx_red_team_sessions_status ON red_team_sessions(status);
      `);
      migrationLogger.info('red_team_sessions table created successfully');
    }
  }, migrationLogger);

  // Create red_team_attacks table
  safeMigration('redTeamAttacksTable', () => {
    const created = createTableIfNotExists(db, 'red_team_attacks', `
      CREATE TABLE red_team_attacks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'security', 'performance', 'edge_case',
          'state', 'concurrency', 'input', 'integration'
        )),
        agent_type TEXT NOT NULL,
        target_component TEXT NOT NULL,
        target_code TEXT,
        attack_vector TEXT NOT NULL,
        payloads TEXT,
        prerequisites TEXT,
        expected_outcome TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
          'planned', 'executing', 'succeeded', 'failed', 'blocked', 'error'
        )),
        severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        executed_at TEXT,
        execution_time_ms INTEGER,
        vulnerability_found INTEGER NOT NULL DEFAULT 0,
        actual_outcome TEXT,
        error_message TEXT,
        stack_trace TEXT,
        evidence TEXT,
        success_probability INTEGER NOT NULL DEFAULT 50 CHECK (success_probability >= 0 AND success_probability <= 100),
        impact_score INTEGER NOT NULL DEFAULT 5 CHECK (impact_score >= 1 AND impact_score <= 10),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_attacks_session ON red_team_attacks(session_id);
        CREATE INDEX idx_red_team_attacks_project ON red_team_attacks(project_id);
        CREATE INDEX idx_red_team_attacks_status ON red_team_attacks(status);
      `);
      migrationLogger.info('red_team_attacks table created successfully');
    }
  }, migrationLogger);

  // Create red_team_vulnerabilities table
  safeMigration('redTeamVulnerabilitiesTable', () => {
    const created = createTableIfNotExists(db, 'red_team_vulnerabilities', `
      CREATE TABLE red_team_vulnerabilities (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        attack_id TEXT,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'injection', 'broken_auth', 'sensitive_exposure', 'xxe',
          'broken_access', 'misconfig', 'xss', 'deserialization',
          'components', 'logging', 'dos', 'a11y', 'logic', 'race_condition'
        )),
        cwe_id TEXT,
        owasp_category TEXT,
        affected_component TEXT NOT NULL,
        affected_file TEXT,
        affected_lines TEXT,
        code_snippet TEXT,
        severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        cvss_score REAL CHECK (cvss_score >= 0 AND cvss_score <= 10),
        exploitability INTEGER CHECK (exploitability >= 1 AND exploitability <= 10),
        business_impact INTEGER CHECK (business_impact >= 1 AND business_impact <= 10),
        reproduction_steps TEXT NOT NULL,
        proof_of_concept TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
          'open', 'confirmed', 'disputed', 'fixed', 'wont_fix', 'false_positive'
        )),
        confirmed_by TEXT,
        disputed_by TEXT,
        remediation_suggestion TEXT,
        fix_effort INTEGER CHECK (fix_effort >= 1 AND fix_effort <= 10),
        fix_priority INTEGER CHECK (fix_priority >= 1 AND fix_priority <= 10),
        discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
        confirmed_at TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (attack_id) REFERENCES red_team_attacks(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_vulns_session ON red_team_vulnerabilities(session_id);
        CREATE INDEX idx_red_team_vulns_project ON red_team_vulnerabilities(project_id);
        CREATE INDEX idx_red_team_vulns_severity ON red_team_vulnerabilities(severity);
        CREATE INDEX idx_red_team_vulns_status ON red_team_vulnerabilities(status);
      `);
      migrationLogger.info('red_team_vulnerabilities table created successfully');
    }
  }, migrationLogger);

  // Create vulnerability_debates table
  safeMigration('vulnerabilityDebatesTable', () => {
    const created = createTableIfNotExists(db, 'vulnerability_debates', `
      CREATE TABLE vulnerability_debates (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        vulnerability_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        participating_agents TEXT NOT NULL,
        max_rounds INTEGER NOT NULL DEFAULT 3,
        consensus_threshold REAL NOT NULL DEFAULT 0.7,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'in_progress', 'completed'
        )),
        current_round INTEGER NOT NULL DEFAULT 0,
        turns TEXT NOT NULL DEFAULT '[]',
        outcome TEXT CHECK (outcome IN (
          'vulnerability_confirmed', 'vulnerability_disputed',
          'false_positive', 'needs_more_evidence', 'escalated'
        )),
        consensus_level REAL CHECK (consensus_level >= 0 AND consensus_level <= 1),
        final_severity TEXT CHECK (final_severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        reasoning_summary TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (vulnerability_id) REFERENCES red_team_vulnerabilities(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_vuln_debates_session ON vulnerability_debates(session_id);
        CREATE INDEX idx_vuln_debates_vulnerability ON vulnerability_debates(vulnerability_id);
        CREATE INDEX idx_vuln_debates_status ON vulnerability_debates(status);
      `);
      migrationLogger.info('vulnerability_debates table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Red team testing tables created successfully');
}

/**
 * Migration 42: Create architecture graph tables
 * Living Architecture Evolution Graph for dependency tracking and drift detection
 */
function migrateArchitectureGraphTables() {
  const db = getConnection();

  // Create architecture_nodes table
  safeMigration('architectureNodesTable', () => {
    const created = createTableIfNotExists(db, 'architecture_nodes', `
      CREATE TABLE architecture_nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        node_type TEXT NOT NULL DEFAULT 'module' CHECK (node_type IN (
          'module', 'component', 'api_route', 'utility', 'store',
          'hook', 'context', 'service', 'repository', 'external', 'config'
        )),
        layer TEXT CHECK (layer IN ('pages', 'client', 'server', 'external')),
        context_group_id TEXT,
        complexity_score INTEGER NOT NULL DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),
        stability_score INTEGER NOT NULL DEFAULT 50 CHECK (stability_score >= 0 AND stability_score <= 100),
        coupling_score INTEGER NOT NULL DEFAULT 0 CHECK (coupling_score >= 0 AND coupling_score <= 100),
        cohesion_score INTEGER NOT NULL DEFAULT 50 CHECK (cohesion_score >= 0 AND cohesion_score <= 100),
        loc INTEGER NOT NULL DEFAULT 0,
        incoming_count INTEGER NOT NULL DEFAULT 0,
        outgoing_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_modified TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, path),
        FOREIGN KEY (context_group_id) REFERENCES context_groups(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_nodes_project ON architecture_nodes(project_id);
        CREATE INDEX idx_arch_nodes_layer ON architecture_nodes(project_id, layer);
        CREATE INDEX idx_arch_nodes_type ON architecture_nodes(project_id, node_type);
        CREATE INDEX idx_arch_nodes_context ON architecture_nodes(context_group_id);
      `);
      migrationLogger.info('architecture_nodes table created successfully');
    }
  }, migrationLogger);

  // Create architecture_edges table
  safeMigration('architectureEdgesTable', () => {
    const created = createTableIfNotExists(db, 'architecture_edges', `
      CREATE TABLE architecture_edges (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        weight TEXT NOT NULL DEFAULT 'required' CHECK (weight IN (
          'required', 'optional', 'circular', 'weak', 'strong'
        )),
        import_count INTEGER NOT NULL DEFAULT 1,
        import_types TEXT NOT NULL DEFAULT '[]',
        is_circular INTEGER NOT NULL DEFAULT 0,
        strength INTEGER NOT NULL DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, source_node_id, target_node_id),
        FOREIGN KEY (source_node_id) REFERENCES architecture_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES architecture_nodes(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_edges_project ON architecture_edges(project_id);
        CREATE INDEX idx_arch_edges_source ON architecture_edges(source_node_id);
        CREATE INDEX idx_arch_edges_target ON architecture_edges(target_node_id);
        CREATE INDEX idx_arch_edges_circular ON architecture_edges(project_id, is_circular);
      `);
      migrationLogger.info('architecture_edges table created successfully');
    }
  }, migrationLogger);

  // Create architecture_drifts table
  safeMigration('architectureDriftsTable', () => {
    const created = createTableIfNotExists(db, 'architecture_drifts', `
      CREATE TABLE architecture_drifts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        node_id TEXT,
        edge_id TEXT,
        drift_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        detected_pattern TEXT,
        ideal_pattern TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
          'active', 'acknowledged', 'resolved', 'ignored'
        )),
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (node_id) REFERENCES architecture_nodes(id) ON DELETE SET NULL,
        FOREIGN KEY (edge_id) REFERENCES architecture_edges(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_drifts_project ON architecture_drifts(project_id);
        CREATE INDEX idx_arch_drifts_status ON architecture_drifts(project_id, status);
        CREATE INDEX idx_arch_drifts_severity ON architecture_drifts(project_id, severity);
      `);
      migrationLogger.info('architecture_drifts table created successfully');
    }
  }, migrationLogger);

  // Create architecture_suggestions table
  safeMigration('architectureSuggestionsTable', () => {
    const created = createTableIfNotExists(db, 'architecture_suggestions', `
      CREATE TABLE architecture_suggestions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scan_id TEXT,
        suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
          'extract_module', 'merge_modules', 'break_circular', 'move_to_layer',
          'introduce_interface', 'remove_dependency', 'consolidate_utilities'
        )),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
          'low', 'medium', 'high', 'critical'
        )),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reasoning TEXT,
        affected_nodes TEXT NOT NULL DEFAULT '[]',
        affected_edges TEXT NOT NULL DEFAULT '[]',
        predicted_effort INTEGER CHECK (predicted_effort >= 1 AND predicted_effort <= 10),
        predicted_impact INTEGER CHECK (predicted_impact >= 1 AND predicted_impact <= 10),
        predicted_risk INTEGER CHECK (predicted_risk >= 1 AND predicted_risk <= 10),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'accepted', 'rejected', 'implemented'
        )),
        user_feedback TEXT,
        implemented_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_suggestions_project ON architecture_suggestions(project_id);
        CREATE INDEX idx_arch_suggestions_status ON architecture_suggestions(project_id, status);
        CREATE INDEX idx_arch_suggestions_priority ON architecture_suggestions(project_id, priority);
      `);
      migrationLogger.info('architecture_suggestions table created successfully');
    }
  }, migrationLogger);

  // Create architecture_ideals table
  safeMigration('architectureIdealsTable', () => {
    const created = createTableIfNotExists(db, 'architecture_ideals', `
      CREATE TABLE architecture_ideals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        rule_type TEXT NOT NULL DEFAULT 'custom' CHECK (rule_type IN (
          'layer_rule', 'dependency_rule', 'naming_rule', 'structure_rule', 'custom'
        )),
        rule_config TEXT NOT NULL DEFAULT '{}',
        example_compliant TEXT,
        example_violation TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
        violations_count INTEGER NOT NULL DEFAULT 0,
        last_checked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_ideals_project ON architecture_ideals(project_id);
        CREATE INDEX idx_arch_ideals_enabled ON architecture_ideals(project_id, enabled);
      `);
      migrationLogger.info('architecture_ideals table created successfully');
    }
  }, migrationLogger);

  // Create architecture_snapshots table
  safeMigration('architectureSnapshotsTable', () => {
    const created = createTableIfNotExists(db, 'architecture_snapshots', `
      CREATE TABLE architecture_snapshots (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        snapshot_type TEXT NOT NULL DEFAULT 'manual' CHECK (snapshot_type IN (
          'manual', 'scheduled', 'before_refactor', 'milestone'
        )),
        name TEXT NOT NULL,
        description TEXT,
        nodes_count INTEGER NOT NULL DEFAULT 0,
        edges_count INTEGER NOT NULL DEFAULT 0,
        circular_count INTEGER NOT NULL DEFAULT 0,
        avg_complexity REAL NOT NULL DEFAULT 0,
        avg_coupling REAL NOT NULL DEFAULT 0,
        graph_data TEXT NOT NULL DEFAULT '{}',
        git_commit TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_arch_snapshots_project ON architecture_snapshots(project_id);
        CREATE INDEX idx_arch_snapshots_type ON architecture_snapshots(project_id, snapshot_type);
      `);
      migrationLogger.info('architecture_snapshots table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('Architecture graph tables created successfully');
}

/**
 * Migration 43: Create focus mode tables
 * Focus sessions, pomodoro tracking, and productivity analytics
 */
function migrateFocusModeTables() {
  // Import and call the migration from the dedicated file
  const { migrateFocusModeTables: migrate } = require('./034_focus_mode');
  migrate(migrationLogger);
}

/**
 * Migration 44: Create Autonomous CI tables
 * AI-driven continuous integration automation
 */
function migrateAutonomousCITables() {
  // Import and call the migration from the dedicated file
  const { migrateAutonomousCITables: migrate } = require('./035_autonomous_ci');
  migrate(migrationLogger);
}

/**
 * Migration 45: Create ROI Simulator tables
 * Development economics ROI simulation engine
 */
function migrateROISimulatorTables() {
  // Import and call the migration from the dedicated file
  const { migrateROISimulatorTables: migrate } = require('./036_roi_simulator');
  migrate(migrationLogger);
}

/**
 * Migration 46: Create Goal Hub tables
 * Central orchestration for goal-driven development with hypothesis tracking
 */
function migrateGoalHub() {
  // Import and call the migration from the dedicated file
  const { migrateGoalHub: migrate } = require('./037_goal_hub');
  migrate();
}

function migrateSocialChannelConfigs() {
  safeMigration('socialChannelConfigs', () => {
    const db = getConnection();
    const { migrate038SocialChannelConfigs } = require('./038_social_channel_configs');
    migrate038SocialChannelConfigs(db);
  }, migrationLogger);
}

function migrateSocialFeedbackItems() {
  safeMigration('socialFeedbackItems', () => {
    const db = getConnection();
    const { migrate039SocialFeedbackItems } = require('./039_social_feedback_items');
    migrate039SocialFeedbackItems(db);
  }, migrationLogger);
}

function migrateSocialDiscoveryConfigs() {
  safeMigration('socialDiscoveryConfigs', () => {
    const db = getConnection();
    const { migrate040SocialDiscoveryConfigs } = require('./040_social_discovery_configs');
    migrate040SocialDiscoveryConfigs(db);
  }, migrationLogger);
}

// migrateOffloadSystem removed - migrated to Supabase Realtime

function migrateClaudeCodeSessions() {
  safeMigration('claudeCodeSessions', () => {
    const db = getConnection();
    const { migrate042ClaudeCodeSessions } = require('./042_claude_code_sessions');
    migrate042ClaudeCodeSessions(db);
  }, migrationLogger);
}

function migrateAutomationSessions() {
  safeMigration('automationSessions', () => {
    const db = getConnection();
    const { migrate043AutomationSessions } = require('./043_automation_sessions');
    migrate043AutomationSessions(db);
  }, migrationLogger);
}

function migrateAutomationSessionEvents() {
  safeMigration('automationSessionEvents', () => {
    const db = getConnection();
    const { migrate044AutomationSessionEvents } = require('./044_automation_session_events');
    migrate044AutomationSessionEvents(db);
  }, migrationLogger);
}

function migrateIntegrationFramework() {
  safeMigration('integrationFramework', () => {
    const db = getConnection();
    const { migrate045IntegrationFramework } = require('./045_integration_framework');
    migrate045IntegrationFramework(db);
  }, migrationLogger);
}

function migrateObservatory() {
  safeMigration('observatory', () => {
    const db = getConnection();
    const { migrate046Observatory } = require('./046_observatory');
    migrate046Observatory(db);
  }, migrationLogger);
}

function migrateIdeasRiskColumn() {
  safeMigration('ideas_risk_column', () => {
    const db = getConnection();
    const { migrate047 } = require('./047_ideas_risk_column');
    migrate047(db);
  }, migrationLogger);
}

function migrateAutomationSessionPausedPhase() {
  safeMigration('automation_session_paused_phase', () => {
    const db = getConnection();
    const { migrate048AutomationSessionPausedPhase } = require('./048_automation_session_paused_phase');
    migrate048AutomationSessionPausedPhase(db);
  }, migrationLogger);
}

/**
 * Migration 58: Create questions table for guided idea generation
 * Questions are generated per context_map entry and when answered, auto-create Goals
 */
function migrateQuestionsTable() {
  safeMigration('questionsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'questions', `
      CREATE TABLE questions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_map_id TEXT NOT NULL,
        context_map_title TEXT NOT NULL,
        goal_id TEXT,
        question TEXT NOT NULL,
        answer TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      // Create indexes for efficient queries
      db.exec(`
        CREATE INDEX idx_questions_project_id ON questions(project_id);
        CREATE INDEX idx_questions_context_map_id ON questions(context_map_id);
        CREATE INDEX idx_questions_status ON questions(status);
        CREATE INDEX idx_questions_goal_id ON questions(goal_id);
      `);
      migrationLogger.info('questions table created successfully');
    }
  }, migrationLogger);
}

/**
 * Migration 59: Create Claude Terminal tables
 * Tables for the CLI-like UI component using Claude Agent SDK
 */
function migrateClaudeTerminalTables() {
  safeMigration('claudeTerminalTables', () => {
    const db = getConnection();

    // Create terminal_sessions table
    const sessionsCreated = createTableIfNotExists(db, 'terminal_sessions', `
      CREATE TABLE terminal_sessions (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'waiting_approval', 'completed', 'error')),
        message_count INTEGER NOT NULL DEFAULT 0,
        last_prompt TEXT,
        total_tokens_in INTEGER NOT NULL DEFAULT 0,
        total_tokens_out INTEGER NOT NULL DEFAULT 0,
        total_cost_usd REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (sessionsCreated) {
      db.exec(`
        CREATE INDEX idx_terminal_sessions_project_path ON terminal_sessions(project_path);
        CREATE INDEX idx_terminal_sessions_status ON terminal_sessions(status);
        CREATE INDEX idx_terminal_sessions_updated_at ON terminal_sessions(updated_at);
      `);
      migrationLogger.info('terminal_sessions table created successfully');
    }

    // Create terminal_messages table
    const messagesCreated = createTableIfNotExists(db, 'terminal_messages', `
      CREATE TABLE terminal_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('user', 'assistant', 'tool_use', 'tool_result', 'error', 'system', 'approval_request', 'streaming')),
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES terminal_sessions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (messagesCreated) {
      db.exec(`
        CREATE INDEX idx_terminal_messages_session_id ON terminal_messages(session_id);
        CREATE INDEX idx_terminal_messages_type ON terminal_messages(type);
        CREATE INDEX idx_terminal_messages_timestamp ON terminal_messages(timestamp);
      `);
      migrationLogger.info('terminal_messages table created successfully');
    }

    // Create pending_approvals table
    const approvalsCreated = createTableIfNotExists(db, 'pending_approvals', `
      CREATE TABLE pending_approvals (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        tool_use_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        tool_input TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
        decision TEXT CHECK (decision IN ('approve', 'deny')),
        decision_reason TEXT,
        decided_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES terminal_sessions(id) ON DELETE CASCADE
      )
    `, migrationLogger);

    if (approvalsCreated) {
      db.exec(`
        CREATE INDEX idx_pending_approvals_session_id ON pending_approvals(session_id);
        CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
      `);
      migrationLogger.info('pending_approvals table created successfully');
    }
  }, migrationLogger);
}

/**
 * Migration 60: Create directions table for actionable development guidance
 * Directions are generated per context_map entry and when accepted, create Claude Code requirements
 */
function migrateDirectionsTable() {
  safeMigration('directionsTable', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'directions', `
      CREATE TABLE directions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_map_id TEXT NOT NULL,
        context_map_title TEXT NOT NULL,
        direction TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        requirement_id TEXT,
        requirement_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      // Create indexes for efficient queries
      db.exec(`
        CREATE INDEX idx_directions_project_id ON directions(project_id);
        CREATE INDEX idx_directions_context_map_id ON directions(context_map_id);
        CREATE INDEX idx_directions_status ON directions(status);
      `);
      migrationLogger.info('directions table created successfully');
    }
  }, migrationLogger);
}

/**
 * Create hall_of_fame_stars table for persisting featured component selections
 */
function migrateHallOfFameStars() {
  safeMigration('hallOfFameStars', () => {
    const db = getConnection();
    const created = createTableIfNotExists(db, 'hall_of_fame_stars', `
      CREATE TABLE hall_of_fame_stars (
        component_id TEXT PRIMARY KEY,
        starred_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      migrationLogger.info('hall_of_fame_stars table created successfully');
    }
  }, migrationLogger);
}

/**
 * Migration 62: Create API Observability tables
 * Tracks API endpoint usage, response times, and error rates
 */
function migrateApiObservability() {
  safeMigration('api_observability', () => {
    const db = getConnection();
    const { migrate049ApiObservability } = require('./049_api_observability');
    migrate049ApiObservability(db);
  }, migrationLogger);
}

/**
 * Migration 63: Create context_api_routes table
 * Maps API endpoints to contexts for X-Ray visualization
 */
function migrateContextApiRoutes() {
  safeMigration('context_api_routes', () => {
    const db = getConnection();
    const { migrate050ContextApiRoutes } = require('./050_context_api_routes');
    migrate050ContextApiRoutes(db);
  }, migrationLogger);
}

/**
 * Migration 64: Create obs_xray_events table
 * Persists X-Ray traffic events with context mapping
 */
function migrateObsXRayEvents() {
  safeMigration('obs_xray_events', () => {
    const db = getConnection();
    const { migrate051ObsXRayEvents } = require('./051_obs_xray_events');
    migrate051ObsXRayEvents(db);
  }, migrationLogger);
}

/**
 * Migration 65: Add SQLite context references to directions table
 * Links directions to contexts and context groups
 */
function migrateDirectionsContextLink() {
  safeMigration('directions_context_link', () => {
    const db = getConnection();
    const { migrate052DirectionsContextLink } = require('./052_directions_context_link');
    migrate052DirectionsContextLink(db);
  }, migrationLogger);
}

/**
 * Migration 66: Prompt Templates
 * Creates prompt_templates table for reusable prompt composition
 */
function migratePromptTemplates() {
  safeMigration('prompt_templates', () => {
    const db = getConnection();
    const { migrate053PromptTemplates } = require('./053_prompt_templates');
    migrate053PromptTemplates(db);
  }, migrationLogger);
}

/**
 * Migration 67: Brain 2.0 - Behavioral Learning + Autonomous Reflection
 * Creates tables for behavioral signals, direction outcomes, and brain reflections
 */
function migrateBrainV2() {
  safeMigration('brain_v2', () => {
    const db = getConnection();
    const { migrate054BrainV2 } = require('./054_brain_v2');
    migrate054BrainV2(db);
  }, migrationLogger);
}

/**
 * Migration 68: Brain Global Reflection - Add scope column
 * Adds scope column to brain_reflections for global vs per-project distinction
 */
function migrateBrainGlobalReflection() {
  safeMigration('brain_global_reflection', () => {
    const db = getConnection();
    const { migrate055BrainGlobalReflection } = require('./055_brain_global_reflection');
    migrate055BrainGlobalReflection(db);
  }, migrationLogger);
}

/**
 * Migration 69: Annette 2.0 - Conversational AI with Deep Memory
 * Creates tables for sessions, messages, memory topics, preferences, and audio cache
 */
function migrateAnnetteV2() {
  safeMigration('annette_v2', () => {
    const db = getConnection();
    const { migrate056AnnetteV2 } = require('./056_annette_v2');
    migrate056AnnetteV2(db);
  }, migrationLogger);
}

/**
 * Migration 70: Workspaces - Project Grouping
 * Creates tables for organizing projects into workspaces
 */
function migrateWorkspaces() {
  safeMigration('workspaces', () => {
    const db = getConnection();
    const { migrate057Workspaces } = require('./057_workspaces');
    migrate057Workspaces(db);
  }, migrationLogger);
}

/**
 * Migration 71: Annette Memory System - Persistent Memory & Knowledge Graph
 * Creates tables for memories, knowledge graph nodes, edges, and consolidation history
 */
function migrateAnnetteMemorySystem() {
  safeMigration('annette_memory_system', () => {
    const db = getConnection();
    const { migrate058AnnetteMemorySystem } = require('./058_annette_memory_system');
    migrate058AnnetteMemorySystem(db);
  }, migrationLogger);
}

/**
 * Migration 72: Executive Analysis - AI-driven executive insights
 * Creates table for executive analysis sessions
 */
function migrateExecutiveAnalysis() {
  safeMigration('executive_analysis', () => {
    const db = getConnection();
    const { migrate059ExecutiveAnalysis } = require('./059_executive_analysis');
    migrate059ExecutiveAnalysis(db);
  }, migrationLogger);
}

/**
 * Migration 73: Cross-Project Architecture - workspace-level visualization
 * Creates tables for cross-project relationships, analysis sessions, and project metadata
 */
function migrateCrossProjectArchitecture() {
  safeMigration('cross_project_architecture', () => {
    const db = getConnection();
    const { migrate060CrossProjectArchitecture } = require('./060_cross_project_architecture');
    migrate060CrossProjectArchitecture(db);
  }, migrationLogger);
}

/**
 * Migration 74: Workspace & Project Enhancements
 * Adds base_path column to workspaces table for workspace-specific root directories
 */
function migrateWorkspaceProjectEnhancements() {
  safeMigration('workspace_project_enhancements', () => {
    const db = getConnection();
    const { migrate061WorkspaceProjectEnhancements } = require('./061_workspace_project_enhancements');
    migrate061WorkspaceProjectEnhancements(db);
  }, migrationLogger);
}

/**
 * Migration 75: Group Health Scans
 * Creates table for tracking code health scans per context group
 */
function migrateGroupHealth() {
  safeMigration('group_health', () => {
    const db = getConnection();
    const { migrate062GroupHealth } = require('./062_group_health');
    migrate062GroupHealth(db);
  }, migrationLogger);
}

/**
 * Migration 76: Remote Message Broker Config
 * Creates table for storing Supabase credentials for remote integration
 */
function migrateRemoteConfig() {
  safeMigration('remote_config', () => {
    const db = getConnection();
    const { migrate063RemoteConfig } = require('./063_remote_config');
    migrate063RemoteConfig(db);
  }, migrationLogger);
}
