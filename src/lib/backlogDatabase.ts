import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'backlog.db');

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

  // Create backlog_items table with updated schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS backlog_items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      goal_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      steps TEXT, -- JSON string of implementation steps
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'undecided')),
      type TEXT NOT NULL CHECK (type IN ('feature', 'optimization')),
      impacted_files TEXT, -- JSON string of ImpactedFile[]
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      rejected_at TEXT
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_goal_id ON backlog_items(goal_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_type ON backlog_items(project_id, type);
  `);
}

// Backlog database operations
export interface DbBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  title: string;
  description: string;
  steps: string | null; // JSON string of implementation steps
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'undecided';
  type: 'feature' | 'optimization';
  impacted_files: string | null; // JSON string
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

// Helper function to get a record by ID
function getRecordById<T>(
  db: Database.Database,
  tableName: string,
  id: string
): T | null {
  const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
  return stmt.get(id) as T | null;
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

  // Get all backlog items for a project including rejected
  getAllBacklogItemsByProject: (projectId: string): DbBacklogItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM backlog_items 
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbBacklogItem[];
  },

  // Create a new backlog item
  createBacklogItem: (item: {
    id: string;
    project_id: string;
    goal_id?: string | null;
    title: string;
    description: string;
    steps?: string[];
    status: DbBacklogItem['status'];
    type: DbBacklogItem['type'];
    impacted_files?: Array<{ path: string; reason: string; [key: string]: unknown }>;
  }): DbBacklogItem => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO backlog_items (
        id, project_id, goal_id, title, description, steps,
        status, type, impacted_files, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.goal_id || null,
      item.title,
      item.description,
      item.steps ? JSON.stringify(item.steps) : null,
      item.status,
      item.type,
      item.impacted_files ? JSON.stringify(item.impacted_files) : null,
      now,
      now
    );

    // Return the created item
    return getRecordById<DbBacklogItem>(db, 'backlog_items', item.id)!;
  },

  // Update a backlog item
  updateBacklogItem: (id: string, updates: {
    status?: DbBacklogItem['status'];
    goal_id?: string | null;
    title?: string;
    description?: string;
    steps?: string[];
    impacted_files?: Array<{ path: string; reason: string; [key: string]: unknown }>;
  }): DbBacklogItem | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: (string | null)[] = [];

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
    if (updates.steps !== undefined) {
      updateFields.push('steps = ?');
      values.push(updates.steps ? JSON.stringify(updates.steps) : null);
    }
    if (updates.impacted_files !== undefined) {
      updateFields.push('impacted_files = ?');
      values.push(updates.impacted_files ? JSON.stringify(updates.impacted_files) : null);
    }

    if (updateFields.length === 0) {
      // No updates to make
      return getRecordById<DbBacklogItem>(db, 'backlog_items', id);
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
    return getRecordById<DbBacklogItem>(db, 'backlog_items', id);
  },

  // Delete a backlog item
  deleteBacklogItem: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM backlog_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get backlog items by status
  getBacklogItemsByStatus: (projectId: string, status: string): DbBacklogItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM backlog_items 
      WHERE project_id = ? AND status = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, status) as DbBacklogItem[];
  },

  // Get backlog items by type
  getBacklogItemsByType: (projectId: string, type: DbBacklogItem['type']): DbBacklogItem[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM backlog_items 
      WHERE project_id = ? AND type = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, type) as DbBacklogItem[];
  },

  // Get backlog item by ID
  getBacklogItemById: (id: string): DbBacklogItem | null => {
    const db = getDatabase();
    return getRecordById<DbBacklogItem>(db, 'backlog_items', id);
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Cleanup on process exit
process.on('exit', () => {
  backlogDb.close();
});

process.on('SIGINT', () => {
  backlogDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backlogDb.close();
  process.exit(0);
});