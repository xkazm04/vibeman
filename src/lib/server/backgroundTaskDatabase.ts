import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'background_tasks.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getBackgroundTaskDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Initialize tables
    initializeBackgroundTaskTables();
  }
  
  return db;
}

function initializeBackgroundTaskTables() {
  if (!db) return;
  
  // Check if we need to recreate the table with updated schema
  try {
    // Check if the table exists and has the correct constraint
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='background_tasks'").get() as any;
    
    if (tableInfo && !tableInfo.sql.includes('coding_task')) {
      console.log('Recreating background_tasks table with updated schema...');
      
      // Drop the existing table (since you're okay with starting from zero)
      db.exec('DROP TABLE IF EXISTS background_tasks');
      console.log('Dropped existing background_tasks table');
    }
  } catch (error) {
    console.warn('Error checking table schema:', error);
  }
  
  // Create background_tasks table with correct schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS background_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_path TEXT NOT NULL,
      task_type TEXT NOT NULL CHECK (task_type IN ('docs', 'tasks', 'goals', 'context', 'code', 'coding_task')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'error', 'cancelled')) DEFAULT 'pending',
      priority INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      error_message TEXT,
      result_data TEXT, -- JSON string of task results
      task_data TEXT, -- JSON string of task-specific data
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );
  `);
  
  console.log('Background tasks table initialized with coding_task support');

  // Create task_queue_settings table for queue configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_queue_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton table
      is_active INTEGER NOT NULL DEFAULT 0, -- Boolean: is queue processing active
      poll_interval INTEGER NOT NULL DEFAULT 5000, -- Polling interval in milliseconds
      max_concurrent_tasks INTEGER NOT NULL DEFAULT 1, -- Max tasks to process simultaneously
      last_poll_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Insert default settings if not exists
  db.exec(`
    INSERT OR IGNORE INTO task_queue_settings (id, is_active, poll_interval, max_concurrent_tasks)
    VALUES (1, 0, 5000, 1);
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_background_tasks_project_id ON background_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_background_tasks_status ON background_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_background_tasks_priority ON background_tasks(priority DESC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_background_tasks_created_at ON background_tasks(created_at DESC);
  `);
}

// Background Task database operations
export interface DbBackgroundTask {
  id: string;
  project_id: string;
  project_name: string;
  project_path: string;
  task_type: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'coding_task';
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  result_data: string | null; // JSON string
  task_data: string | null; // JSON string of task-specific data
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface DbTaskQueueSettings {
  id: number;
  is_active: number; // SQLite boolean (0/1)
  poll_interval: number;
  max_concurrent_tasks: number;
  last_poll_at: string | null;
  created_at: string;
  updated_at: string;
}

export const backgroundTaskDb = {
  // Get all background tasks
  getAllTasks: (limit: number = 100): DbBackgroundTask[] => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare(`
      SELECT * FROM background_tasks 
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit) as DbBackgroundTask[];
  },

  // Get tasks by status
  getTasksByStatus: (status: string, limit: number = 100): DbBackgroundTask[] => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare(`
      SELECT * FROM background_tasks 
      WHERE status = ?
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    return stmt.all(status, limit) as DbBackgroundTask[];
  },

  // Get pending tasks for processing (ordered by priority and creation time)
  getPendingTasks: (limit: number = 10): DbBackgroundTask[] => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare(`
      SELECT * FROM background_tasks 
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit) as DbBackgroundTask[];
  },

  // Get tasks by project
  getTasksByProject: (projectId: string): DbBackgroundTask[] => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare(`
      SELECT * FROM background_tasks 
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbBackgroundTask[];
  },

  // Create a new background task
  createTask: (task: {
    id: string;
    project_id: string;
    project_name: string;
    project_path: string;
    task_type: 'docs' | 'tasks' | 'goals' | 'context' | 'code' | 'coding_task';
    priority?: number;
    max_retries?: number;
    task_data?: string;
  }): DbBackgroundTask => {
    const db = getBackgroundTaskDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO background_tasks (
        id, project_id, project_name, project_path, task_type, 
        priority, max_retries, task_data, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      task.id,
      task.project_id,
      task.project_name,
      task.project_path,
      task.task_type,
      task.priority || 0,
      task.max_retries || 3,
      task.task_data || null,
      now,
      now
    );
    
    // Return the created task
    const selectStmt = db.prepare('SELECT * FROM background_tasks WHERE id = ?');
    return selectStmt.get(task.id) as DbBackgroundTask;
  },

  // Update task status and related fields
  updateTask: (id: string, updates: {
    status?: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
    error_message?: string | null;
    result_data?: any;
    retry_count?: number;
    started_at?: string | null;
    completed_at?: string | null;
  }): DbBackgroundTask | null => {
    const db = getBackgroundTaskDatabase();
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.error_message !== undefined) {
      updateFields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.result_data !== undefined) {
      updateFields.push('result_data = ?');
      values.push(updates.result_data ? JSON.stringify(updates.result_data) : null);
    }
    if (updates.retry_count !== undefined) {
      updateFields.push('retry_count = ?');
      values.push(updates.retry_count);
    }
    if (updates.started_at !== undefined) {
      updateFields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      updateFields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    
    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM background_tasks WHERE id = ?');
      return selectStmt.get(id) as DbBackgroundTask | null;
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE background_tasks 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return null; // Task not found
    }
    
    // Return the updated task
    const selectStmt = db.prepare('SELECT * FROM background_tasks WHERE id = ?');
    return selectStmt.get(id) as DbBackgroundTask;
  },

  // Delete a task
  deleteTask: (id: string): boolean => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare('DELETE FROM background_tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Cancel a task (set status to cancelled)
  cancelTask: (id: string): DbBackgroundTask | null => {
    return backgroundTaskDb.updateTask(id, { 
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
  },

  // Retry a failed task (reset status to pending and increment retry count)
  retryTask: (id: string): DbBackgroundTask | null => {
    const db = getBackgroundTaskDatabase();
    const task = db.prepare('SELECT * FROM background_tasks WHERE id = ?').get(id) as DbBackgroundTask;
    
    if (!task) return null;
    
    if (task.retry_count >= task.max_retries) {
      throw new Error('Task has exceeded maximum retry attempts');
    }
    
    return backgroundTaskDb.updateTask(id, {
      status: 'pending',
      retry_count: task.retry_count + 1,
      error_message: null,
      started_at: null,
      completed_at: null
    });
  },

  // Get queue settings
  getQueueSettings: (): DbTaskQueueSettings => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare('SELECT * FROM task_queue_settings WHERE id = 1');
    return stmt.get() as DbTaskQueueSettings;
  },

  // Update queue settings
  updateQueueSettings: (updates: {
    is_active?: boolean;
    poll_interval?: number;
    max_concurrent_tasks?: number;
    last_poll_at?: string;
  }): DbTaskQueueSettings => {
    const db = getBackgroundTaskDatabase();
    const now = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    if (updates.poll_interval !== undefined) {
      updateFields.push('poll_interval = ?');
      values.push(updates.poll_interval);
    }
    if (updates.max_concurrent_tasks !== undefined) {
      updateFields.push('max_concurrent_tasks = ?');
      values.push(updates.max_concurrent_tasks);
    }
    if (updates.last_poll_at !== undefined) {
      updateFields.push('last_poll_at = ?');
      values.push(updates.last_poll_at);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    
    const stmt = db.prepare(`
      UPDATE task_queue_settings 
      SET ${updateFields.join(', ')} 
      WHERE id = 1
    `);
    
    stmt.run(...values);
    
    // Return updated settings
    return backgroundTaskDb.getQueueSettings();
  },

  // Get task counts by status
  getTaskCounts: (): Record<string, number> => {
    const db = getBackgroundTaskDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM background_tasks 
      GROUP BY status
    `);
    
    const results = stmt.all() as Array<{ status: string; count: number }>;
    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0,
      cancelled: 0
    };
    
    results.forEach(({ status, count }) => {
      counts[status] = count;
    });
    
    return counts;
  },

  // Clean up old completed/cancelled tasks
  cleanupOldTasks: (keepDays: number = 7): number => {
    const db = getBackgroundTaskDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    
    const stmt = db.prepare(`
      DELETE FROM background_tasks 
      WHERE status IN ('completed', 'cancelled') 
      AND completed_at < ?
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
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
  backgroundTaskDb.close();
});

process.on('SIGINT', () => {
  backgroundTaskDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backgroundTaskDb.close();
  process.exit(0);
});