import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'code_generation.db');

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

function createSessionsTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS code_generation_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_path TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      error_message TEXT,
      total_files INTEGER DEFAULT 0,
      processed_files INTEGER DEFAULT 0
    );
  `);

  // Add project_path column if it doesn't exist (for existing databases)
  try {
    database.exec(`ALTER TABLE code_generation_sessions ADD COLUMN project_path TEXT;`);
  } catch {
    // Column already exists, ignore error
  }
}

function createGeneratedFilesTable(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS generated_files (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      filepath TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create', 'update')),
      generated_content TEXT NOT NULL,
      original_content TEXT, -- For update actions
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      applied_at TEXT,
      FOREIGN KEY (session_id) REFERENCES code_generation_sessions(id) ON DELETE CASCADE
    );
  `);
}

function createDatabaseIndexes(database: Database.Database) {
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_code_sessions_task_id ON code_generation_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_code_sessions_project_id ON code_generation_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_code_sessions_status ON code_generation_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_generated_files_session_id ON generated_files(session_id);
    CREATE INDEX IF NOT EXISTS idx_generated_files_status ON generated_files(status);
    CREATE INDEX IF NOT EXISTS idx_generated_files_filepath ON generated_files(filepath);
  `);
}

function initializeTables() {
  if (!db) return;

  createSessionsTable(db);
  createGeneratedFilesTable(db);
  createDatabaseIndexes(db);
}

// Database interfaces
export interface DbCodeGenerationSession {
  id: string;
  task_id: string;
  project_id: string;
  project_path: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  total_files: number;
  processed_files: number;
}

export interface DbGeneratedFile {
  id: string;
  session_id: string;
  filepath: string;
  action: 'create' | 'update';
  generated_content: string;
  original_content: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  applied_at: string | null;
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

// Code generation database operations
export const codeGenerationDb = {
  // Create a new code generation session
  createSession: (session: {
    id: string;
    task_id: string;
    project_id: string;
    project_path?: string;
    total_files: number;
  }): DbCodeGenerationSession => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO code_generation_sessions (
        id, task_id, project_id, project_path, status, started_at, total_files, processed_files
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.task_id,
      session.project_id,
      session.project_path || null,
      'pending',
      now,
      session.total_files,
      0
    );

    // Return the created session
    return getRecordById<DbCodeGenerationSession>(db, 'code_generation_sessions', session.id)!;
  },

  // Update session status
  updateSession: (sessionId: string, updates: {
    status?: DbCodeGenerationSession['status'];
    completed_at?: string;
    error_message?: string;
    processed_files?: number;
  }): DbCodeGenerationSession | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      if (updates.status === 'completed' || updates.status === 'failed') {
        updateFields.push('completed_at = ?');
        values.push(updates.completed_at || now);
      }
    }
    if (updates.error_message !== undefined) {
      updateFields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.processed_files !== undefined) {
      updateFields.push('processed_files = ?');
      values.push(updates.processed_files);
    }

    if (updateFields.length === 0) {
      return getRecordById<DbCodeGenerationSession>(db, 'code_generation_sessions', sessionId);
    }

    values.push(sessionId);

    const stmt = db.prepare(`
      UPDATE code_generation_sessions
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    // Return the updated session
    return getRecordById<DbCodeGenerationSession>(db, 'code_generation_sessions', sessionId);
  },

  // Create a generated file record
  createGeneratedFile: (file: {
    id: string;
    session_id: string;
    filepath: string;
    action: 'create' | 'update';
    generated_content: string;
    original_content?: string;
  }): DbGeneratedFile => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO generated_files (
        id, session_id, filepath, action, generated_content, original_content, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      file.id,
      file.session_id,
      file.filepath,
      file.action,
      file.generated_content,
      file.original_content || null,
      'pending',
      now
    );

    // Return the created file
    return getRecordById<DbGeneratedFile>(db, 'generated_files', file.id)!;
  },

  // Update generated file status
  updateGeneratedFile: (fileId: string, updates: {
    status?: DbGeneratedFile['status'];
    applied_at?: string;
  }): DbGeneratedFile | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: string[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      if (updates.status === 'accepted') {
        updateFields.push('applied_at = ?');
        values.push(updates.applied_at || now);
      }
    }

    if (updateFields.length === 0) {
      return getRecordById<DbGeneratedFile>(db, 'generated_files', fileId);
    }

    values.push(fileId);

    const stmt = db.prepare(`
      UPDATE generated_files
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    // Return the updated file
    return getRecordById<DbGeneratedFile>(db, 'generated_files', fileId);
  },

  // Get session by ID
  getSession: (sessionId: string): DbCodeGenerationSession | null => {
    const db = getDatabase();
    return getRecordById<DbCodeGenerationSession>(db, 'code_generation_sessions', sessionId);
  },

  // Get sessions by task ID
  getSessionsByTaskId: (taskId: string): DbCodeGenerationSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM code_generation_sessions 
      WHERE task_id = ? 
      ORDER BY started_at DESC
    `);
    return stmt.all(taskId) as DbCodeGenerationSession[];
  },

  // Get sessions by project ID
  getSessionsByProjectId: (projectId: string): DbCodeGenerationSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM code_generation_sessions 
      WHERE project_id = ? 
      ORDER BY started_at DESC
    `);
    return stmt.all(projectId) as DbCodeGenerationSession[];
  },

  // Get generated files by session ID
  getGeneratedFilesBySession: (sessionId: string): DbGeneratedFile[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM generated_files 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as DbGeneratedFile[];
  },

  // Get pending generated files by project ID
  getPendingFilesByProject: (projectId: string): DbGeneratedFile[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT gf.* FROM generated_files gf
      JOIN code_generation_sessions cgs ON gf.session_id = cgs.id
      WHERE cgs.project_id = ? AND gf.status = 'pending'
      ORDER BY gf.created_at DESC
    `);
    return stmt.all(projectId) as DbGeneratedFile[];
  },

  // Get sessions with pending files by project ID
  getSessionsWithPendingFiles: (projectId: string): DbCodeGenerationSession[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT DISTINCT cgs.* FROM code_generation_sessions cgs
      JOIN generated_files gf ON cgs.id = gf.session_id
      WHERE cgs.project_id = ? AND gf.status = 'pending'
      ORDER BY cgs.started_at DESC
    `);
    return stmt.all(projectId) as DbCodeGenerationSession[];
  },

  // Get pending generated files by session ID
  getPendingFilesBySession: (sessionId: string): DbGeneratedFile[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM generated_files 
      WHERE session_id = ? AND status = 'pending'
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as DbGeneratedFile[];
  },

  // Get generated file by ID
  getGeneratedFileById: (fileId: string): DbGeneratedFile | null => {
    const db = getDatabase();
    return getRecordById<DbGeneratedFile>(db, 'generated_files', fileId);
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
  codeGenerationDb.close();
});

process.on('SIGINT', () => {
  codeGenerationDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  codeGenerationDb.close();
  process.exit(0);
});