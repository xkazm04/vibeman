import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'goals.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');

    // Initialize tables
    initializeTables();
  }

  return db;
}

function initializeTables() {
  if (!db) return;

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
  `);
}

function runMigrations() {
  if (!db) return;

  try {
    // Check if contexts table has the new columns
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
    try {
      const contextTableInfo = db.prepare("PRAGMA table_info(contexts)").all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: any;
        pk: number;
      }>;

      const groupIdColumn = contextTableInfo.find(col => col.name === 'group_id');

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
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (group_id) REFERENCES context_groups(id) ON DELETE SET NULL
          )
        `);

        // Restore data
        if (existingContexts.length > 0) {
          const insertStmt = db.prepare(`
            INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const context of existingContexts) {
            insertStmt.run(
              context.id,
              context.project_id,
              context.group_id,
              context.name,
              context.description,
              context.file_paths,
              context.has_context_file || 0,
              context.context_file_path || null,
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
    } catch (contextMigrationError) {
      console.error('Error during contexts table migration:', contextMigrationError);
    }

    // Check if goals table needs status constraint update
    try {
      // First, check if context_id column exists
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

          for (const goal of existingGoals) {
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
        db.exec('DROP TABLE IF EXISTS goals_backup');
        db.exec(`
          CREATE TABLE goals_backup AS SELECT * FROM goals
        `);

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

          for (const goal of existingGoals) {
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
    } catch (migrationError) {
      console.error('Error during goals table migration:', migrationError);
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
    // Don't throw the error to prevent app from crashing
    // The app should still work with the existing schema
  }
}

// Goal database operations
export interface DbGoal {
  id: string;
  project_id: string;
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  created_at: string;
  updated_at: string;
}

export const goalDb = {
  // Get all goals for a project
  getGoalsByProject: (projectId: string): DbGoal[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goals 
      WHERE project_id = ? 
      ORDER BY order_index ASC
    `);
    return stmt.all(projectId) as DbGoal[];
  },

  // Create a new goal
  createGoal: (goal: {
    id: string;
    project_id: string;
    context_id?: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    order_index: number;
  }): DbGoal => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
      goal.project_id,
      goal.context_id || null,
      goal.order_index,
      goal.title,
      goal.description || null,
      goal.status,
      now,
      now
    );

    // Return the created goal
    const selectStmt = db.prepare('SELECT * FROM goals WHERE id = ?');
    return selectStmt.get(goal.id) as DbGoal;
  },

  // Update a goal
  updateGoal: (id: string, updates: {
    title?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
    order_index?: number;
    context_id?: string | null;
  }): DbGoal | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.order_index !== undefined) {
      updateFields.push('order_index = ?');
      values.push(updates.order_index);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM goals WHERE id = ?');
      return selectStmt.get(id) as DbGoal | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE goals 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Goal not found
    }

    // Return the updated goal
    const selectStmt = db.prepare('SELECT * FROM goals WHERE id = ?');
    return selectStmt.get(id) as DbGoal;
  },

  // Delete a goal
  deleteGoal: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get the maximum order index for a project
  getMaxOrderIndex: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(order_index) as max_order 
      FROM goals 
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { max_order: number | null };
    return result.max_order || 0;
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Backlog database operations
export interface DbBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  type: 'proposal' | 'custom';
  impacted_files: string | null; // JSON string
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

export const backlogDb = {
  // Get all backlog items for a project (excluding rejected)
  getBacklogItemsByProject: (projectId: string): DbBacklogItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM backlog_items 
      WHERE project_id = ? AND status != 'rejected'
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbBacklogItem[];
  },

  // Create a new backlog item
  createBacklogItem: (item: {
    id: string;
    project_id: string;
    goal_id?: string | null;
    agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
    title: string;
    description: string;
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
    type: 'proposal' | 'custom';
    impacted_files?: any[];
  }): DbBacklogItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO backlog_items (
        id, project_id, goal_id, agent, title, description, 
        status, type, impacted_files, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.goal_id || null,
      item.agent,
      item.title,
      item.description,
      item.status,
      item.type,
      item.impacted_files ? JSON.stringify(item.impacted_files) : null,
      now,
      now
    );

    // Return the created item
    const selectStmt = db.prepare('SELECT * FROM backlog_items WHERE id = ?');
    return selectStmt.get(item.id) as DbBacklogItem;
  },

  // Update a backlog item
  updateBacklogItem: (id: string, updates: {
    status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
    goal_id?: string | null;
    title?: string;
    description?: string;
    impacted_files?: any[];
  }): DbBacklogItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      // Set accepted_at or rejected_at based on status
      if (updates.status === 'accepted') {
        updateFields.push('accepted_at = ?');
        values.push(now);
      } else if (updates.status === 'rejected') {
        updateFields.push('rejected_at = ?');
        values.push(now);
      }
    }
    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id);
    }
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.impacted_files !== undefined) {
      updateFields.push('impacted_files = ?');
      values.push(updates.impacted_files ? JSON.stringify(updates.impacted_files) : null);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM backlog_items WHERE id = ?');
      return selectStmt.get(id) as DbBacklogItem | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE backlog_items 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Item not found
    }

    // Return the updated item
    const selectStmt = db.prepare('SELECT * FROM backlog_items WHERE id = ?');
    return selectStmt.get(id) as DbBacklogItem;
  },

  // Delete a backlog item
  deleteBacklogItem: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM backlog_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Context Group database operations
export interface DbContextGroup {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export const contextGroupDb = {
  // Get all context groups for a project
  getGroupsByProject: (projectId: string): DbContextGroup[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM context_groups 
      WHERE project_id = ? 
      ORDER BY position ASC
    `);
    return stmt.all(projectId) as DbContextGroup[];
  },

  // Create a new context group
  createGroup: (group: {
    id: string;
    project_id: string;
    name: string;
    color: string;
    position: number;
  }): DbContextGroup => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO context_groups (id, project_id, name, color, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.project_id,
      group.name,
      group.color,
      group.position,
      now,
      now
    );

    // Return the created group
    const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
    return selectStmt.get(group.id) as DbContextGroup;
  },

  // Update a context group
  updateGroup: (id: string, updates: {
    name?: string;
    color?: string;
    position?: number;
  }): DbContextGroup | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      updateFields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.position !== undefined) {
      updateFields.push('position = ?');
      values.push(updates.position);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
      return selectStmt.get(id) as DbContextGroup | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE context_groups 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Group not found
    }

    // Return the updated group
    const selectStmt = db.prepare('SELECT * FROM context_groups WHERE id = ?');
    return selectStmt.get(id) as DbContextGroup;
  },

  // Delete a context group (will cascade delete contexts)
  deleteGroup: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get the maximum position for a project
  getMaxPosition: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT MAX(position) as max_position 
      FROM context_groups 
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { max_position: number | null };
    return result.max_position || 0;
  },

  // Get group count for a project
  getGroupCount: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM context_groups 
      WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number };
    return result.count;
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Context database operations
export interface DbContext {
  id: string;
  project_id: string;
  group_id: string | null; // Optional group assignment
  name: string;
  description: string | null;
  file_paths: string; // JSON string of file paths array
  has_context_file: number; // SQLite boolean (0/1)
  context_file_path: string | null;
  preview: string | null; // Optional preview image path (relative to public folder)
  created_at: string;
  updated_at: string;
}

export const contextDb = {
  // Get all contexts for a project (including those without groups)
  getContextsByProject: (projectId: string): DbContext[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT c.*, cg.name as group_name, cg.color as group_color
      FROM contexts c
      LEFT JOIN context_groups cg ON c.group_id = cg.id
      WHERE c.project_id = ? 
      ORDER BY COALESCE(cg.position, 999) ASC, c.created_at DESC
    `);
    return stmt.all(projectId) as DbContext[];
  },

  // Get contexts by group
  getContextsByGroup: (groupId: string): DbContext[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM contexts 
      WHERE group_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(groupId) as DbContext[];
  },

  // Create a new context
  createContext: (context: {
    id: string;
    project_id: string;
    group_id?: string | null;
    name: string;
    description?: string;
    file_paths: string[];
    has_context_file?: boolean;
    context_file_path?: string;
  }): DbContext => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      context.id,
      context.project_id,
      context.group_id || null,
      context.name,
      context.description || null,
      JSON.stringify(context.file_paths),
      context.has_context_file ? 1 : 0,
      context.context_file_path || null,
      now,
      now
    );

    // Return the created context
    const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
    return selectStmt.get(context.id) as DbContext;
  },

  // Create context from generated file
  createContextFromFile: (context: {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    file_paths: string[];
    context_file_path: string;
  }): DbContext => {
    return contextDb.createContext({
      ...context,
      has_context_file: true,
      context_file_path: context.context_file_path
    });
  },

  // Find context by file path
  findContextByFilePath: (projectId: string, contextFilePath: string): DbContext | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM contexts 
      WHERE project_id = ? AND context_file_path = ?
    `);
    return stmt.get(projectId, contextFilePath) as DbContext | null;
  },

  // Update a context
  updateContext: (id: string, updates: {
    name?: string;
    description?: string;
    file_paths?: string[];
    group_id?: string;
    has_context_file?: boolean;
    context_file_path?: string;
    preview?: string | null;
  }): DbContext | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.file_paths !== undefined) {
      updateFields.push('file_paths = ?');
      values.push(JSON.stringify(updates.file_paths));
    }
    if (updates.group_id !== undefined) {
      updateFields.push('group_id = ?');
      values.push(updates.group_id);
    }
    if (updates.has_context_file !== undefined) {
      updateFields.push('has_context_file = ?');
      values.push(updates.has_context_file ? 1 : 0);
    }
    if (updates.context_file_path !== undefined) {
      updateFields.push('context_file_path = ?');
      values.push(updates.context_file_path);
    }
    if (updates.preview !== undefined) {
      updateFields.push('preview = ?');
      values.push(updates.preview);
    }

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
      return selectStmt.get(id) as DbContext | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE contexts
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Context not found
    }

    // Return the updated context
    const selectStmt = db.prepare('SELECT * FROM contexts WHERE id = ?');
    return selectStmt.get(id) as DbContext;
  },

  // Delete a context
  deleteContext: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM contexts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Move context to different group
  moveContextToGroup: (contextId: string, newGroupId: string): DbContext | null => {
    return contextDb.updateContext(contextId, { group_id: newGroupId });
  },

  // Get context count for a group
  getContextCountByGroup: (groupId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM contexts 
      WHERE group_id = ?
    `);
    const result = stmt.get(groupId) as { count: number };
    return result.count;
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Events database operations
export interface DbEvent {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent: string | null;
  message: string | null;
  created_at: string;
}

export const eventDb = {
  // Get all events for a project
  getEventsByProject: (projectId: string, limit: number = 50): DbEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events 
      WHERE project_id = ? 
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, limit) as DbEvent[];
  },

  // Create a new event
  createEvent: (event: {
    id: string;
    project_id: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
    agent?: string;
    message?: string;
  }): DbEvent => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (id, project_id, title, description, type, agent, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.project_id,
      event.title,
      event.description,
      event.type,
      event.agent || null,
      event.message || null,
      now
    );

    // Return the created event
    const selectStmt = db.prepare('SELECT * FROM events WHERE id = ?');
    return selectStmt.get(event.id) as DbEvent;
  },

  // Delete old events (keep only the latest N events)
  cleanupOldEvents: (projectId: string, keepCount: number = 100): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM events 
      WHERE project_id = ? 
      AND id NOT IN (
        SELECT id FROM events 
        WHERE project_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      )
    `);
    const result = stmt.run(projectId, projectId, keepCount);
    return result.changes;
  },

  // Get events by type
  getEventsByType: (projectId: string, type: string, limit: number = 50): DbEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events 
      WHERE project_id = ? AND type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(projectId, type, limit) as DbEvent[];
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Project operations have been moved to project_database.ts

// Cleanup on process exit
process.on('exit', () => {
  goalDb.close();
  backlogDb.close();
  contextGroupDb.close();
  contextDb.close();
  eventDb.close();
});

process.on('SIGINT', () => {
  goalDb.close();
  backlogDb.close();
  contextGroupDb.close();
  contextDb.close();
  eventDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  goalDb.close();
  backlogDb.close();
  contextGroupDb.close();
  contextDb.close();
  eventDb.close();
  process.exit(0);
});