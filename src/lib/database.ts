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
      order_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  
  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
    CREATE INDEX IF NOT EXISTS idx_goals_order_index ON goals(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_goal_id ON backlog_items(goal_id);
    CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(project_id, status);
  `);
}

// Goal database operations
export interface DbGoal {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
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
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'done';
    order_index: number;
  }): DbGoal => {
    const db = getDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO goals (id, project_id, order_index, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      goal.id,
      goal.project_id,
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
    status?: 'open' | 'in_progress' | 'done';
    order_index?: number;
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

// Cleanup on process exit
process.on('exit', () => {
  goalDb.close();
  backlogDb.close();
});

process.on('SIGINT', () => {
  goalDb.close();
  backlogDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  goalDb.close();
  backlogDb.close();
  process.exit(0);
});