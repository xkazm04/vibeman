import { getDatabase } from '../connection';

/**
 * Run all database migrations
 * Handles schema updates for existing databases
 */
export function runMigrations() {
  const db = getDatabase();

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

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
    // Don't throw the error to prevent app from crashing
    // The app should still work with the existing schema
  }
}

/**
 * Add input_tokens and output_tokens columns to scans table
 */
function migrateScansTokenColumns() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(scans)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasInputTokens = tableInfo.some(col => col.name === 'input_tokens');
    const hasOutputTokens = tableInfo.some(col => col.name === 'output_tokens');

    if (!hasInputTokens) {
      console.log('Adding input_tokens column to scans table');
      db.exec(`ALTER TABLE scans ADD COLUMN input_tokens INTEGER`);
    }

    if (!hasOutputTokens) {
      console.log('Adding output_tokens column to scans table');
      db.exec(`ALTER TABLE scans ADD COLUMN output_tokens INTEGER`);
    }

    if (hasInputTokens && hasOutputTokens) {
      console.log('Scans table already has token tracking columns');
    }
  } catch (error) {
    console.error('Error migrating scans table:', error);
  }
}

/**
 * Update contexts table with new columns
 */
function migrateContextsTable() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(contexts)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasContextFileColumn = tableInfo.some(col => col.name === 'has_context_file');
    const hasContextFilePathColumn = tableInfo.some(col => col.name === 'context_file_path');
    const hasPreviewColumn = tableInfo.some(col => col.name === 'preview');

    // Add missing columns if they don't exist
    if (!hasContextFileColumn) {
      console.log('Adding has_context_file column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN has_context_file INTEGER DEFAULT 0`);
    }

    if (!hasContextFilePathColumn) {
      console.log('Adding context_file_path column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN context_file_path TEXT`);
    }

    if (!hasPreviewColumn) {
      console.log('Adding preview column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN preview TEXT`);
    }

    // Check if group_id constraint needs to be updated to allow NULL
    const groupIdColumn = tableInfo.find(col => col.name === 'group_id');

    // If group_id is NOT NULL, we need to update the schema
    if (groupIdColumn && groupIdColumn.notnull === 1) {
      console.log('Updating contexts table to make group_id optional...');

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

        for (const context of existingContexts as any[]) {
          insertStmt.run(
            context.id,
            context.project_id,
            context.group_id,
            context.name,
            context.description,
            context.file_paths,
            context.has_context_file || 0,
            context.context_file_path || null,
            context.preview || null,
            context.created_at,
            context.updated_at
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE contexts_backup');

      console.log('Contexts table migration completed successfully');
    } else {
      console.log('Contexts table already supports optional group_id');
    }
  } catch (error) {
    console.error('Error during contexts table migration:', error);
  }
}

/**
 * Update goals table with context_id support
 */
function migrateGoalsTable() {
  const db = getDatabase();

  try {
    const goalsTableInfo = db.prepare("PRAGMA table_info(goals)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasContextIdColumn = goalsTableInfo.some(col => col.name === 'context_id');

    // If context_id doesn't exist, we need to recreate the table
    if (!hasContextIdColumn) {
      console.log('Goals table needs context_id column, recreating table...');

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

        for (const goal of existingGoals as any[]) {
          insertStmt.run(
            goal.id,
            goal.project_id,
            null, // context_id defaults to null for existing goals
            goal.order_index,
            goal.title,
            goal.description,
            goal.status,
            goal.created_at,
            goal.updated_at
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE goals_backup');

      console.log('Goals table migration with context_id completed successfully');
    } else {
      console.log('Goals table already has context_id column');
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

      console.log('Goals table already supports new status values');
    } catch (constraintError) {
      console.log('Goals table needs status constraint migration, recreating table...');

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

        for (const goal of existingGoals as any[]) {
          insertStmt.run(
            goal.id,
            goal.project_id,
            goal.context_id || null,
            goal.order_index,
            goal.title,
            goal.description,
            goal.status,
            goal.created_at,
            goal.updated_at
          );
        }
      }

      // Clean up backup table
      db.exec('DROP TABLE goals_backup');

      console.log('Goals table migration completed successfully');
    }
  } catch (error) {
    console.error('Error during goals table migration:', error);
  }
}

/**
 * Add scan_type column to ideas table
 */
function migrateIdeasScanType() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasScanType = tableInfo.some(col => col.name === 'scan_type');

    if (!hasScanType) {
      console.log('Adding scan_type column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN scan_type TEXT DEFAULT 'overall'`);
    } else {
      console.log('Ideas table already has scan_type column');
    }
  } catch (error) {
    console.error('Error migrating ideas table scan_type:', error);
  }
}

/**
 * Add effort and impact columns to ideas table
 */
function migrateIdeasEffortImpact() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasEffort = tableInfo.some(col => col.name === 'effort');
    const hasImpact = tableInfo.some(col => col.name === 'impact');

    if (!hasEffort) {
      console.log('Adding effort column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3))`);
    }

    if (!hasImpact) {
      console.log('Adding impact column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3))`);
    }

    if (hasEffort && hasImpact) {
      console.log('Ideas table already has effort and impact columns');
    }
  } catch (error) {
    console.error('Error migrating ideas table effort/impact:', error);
  }
}

/**
 * Add implemented_at column to ideas table
 */
function migrateIdeasImplementedAt() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasImplementedAt = tableInfo.some(col => col.name === 'implemented_at');

    if (!hasImplementedAt) {
      console.log('Adding implemented_at column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN implemented_at TEXT`);
    } else {
      console.log('Ideas table already has implemented_at column');
    }
  } catch (error) {
    console.error('Error migrating ideas table implemented_at:', error);
  }
}

/**
 * Remove category CHECK constraint from ideas table
 * This allows any string value for category instead of restricting to specific values
 */
function migrateIdeasCategoryConstraint() {
  const db = getDatabase();

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

      console.log('Ideas table already supports flexible category values');
      return;
    } catch (constraintError) {
      console.log('Ideas table has category constraint, removing it...');

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

        for (const idea of existingIdeas as any[]) {
          insertStmt.run(
            idea.id,
            idea.scan_id,
            idea.project_id,
            idea.context_id || null,
            idea.scan_type || 'overall',
            idea.category || 'general',
            idea.title,
            idea.description || null,
            idea.reasoning || null,
            idea.status || 'pending',
            idea.user_feedback || null,
            idea.user_pattern || 0,
            idea.effort || null,
            idea.impact || null,
            idea.implemented_at || null,
            idea.created_at,
            idea.updated_at
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

      console.log('Ideas table category constraint removed successfully');
    }
  } catch (error) {
    console.error('Error during ideas category constraint migration:', error);
  }
}

/**
 * Add requirement_id and goal_id columns to ideas table
 */
function migrateIdeasRequirementAndGoal() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(ideas)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasRequirementId = tableInfo.some(col => col.name === 'requirement_id');
    const hasGoalId = tableInfo.some(col => col.name === 'goal_id');

    if (!hasRequirementId) {
      console.log('Adding requirement_id column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN requirement_id TEXT`);
    }

    if (!hasGoalId) {
      console.log('Adding goal_id column to ideas table');
      db.exec(`ALTER TABLE ideas ADD COLUMN goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL`);
    }

    if (hasRequirementId && hasGoalId) {
      console.log('Ideas table already has requirement_id and goal_id columns');
    }
  } catch (error) {
    console.error('Error migrating ideas table requirement_id and goal_id:', error);
  }
}

/**
 * Add test_scenario and test_updated columns to contexts table
 */
function migrateContextsTestingColumns() {
  const db = getDatabase();

  try {
    const tableInfo = db.prepare("PRAGMA table_info(contexts)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const hasTestScenario = tableInfo.some(col => col.name === 'test_scenario');
    const hasTestUpdated = tableInfo.some(col => col.name === 'test_updated');

    if (!hasTestScenario) {
      console.log('Adding test_scenario column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN test_scenario TEXT`);
    }

    if (!hasTestUpdated) {
      console.log('Adding test_updated column to contexts table');
      db.exec(`ALTER TABLE contexts ADD COLUMN test_updated TEXT`);
    }

    if (hasTestScenario && hasTestUpdated) {
      console.log('Contexts table already has testing columns');
    }
  } catch (error) {
    console.error('Error migrating contexts table testing columns:', error);
  }
}
