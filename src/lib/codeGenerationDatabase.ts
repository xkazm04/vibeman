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

function initializeTables() {
  if (!db) return;

  // Create code_generation_sessions table
  db.exec(`
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
    db.exec(`ALTER TABLE code_generation_sessions ADD COLUMN project_path TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create generated_files table
  db.exec(`
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

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_code_sessions_task_id ON code_generation_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_code_sessions_project_id ON code_generation_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_code_sessions_status ON code_generation_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_generated_files_session_id ON generated_files(session_id);
    CREATE INDEX IF NOT EXISTS idx_generated_files_status ON generated_files(status);
    CREATE INDEX IF NOT EXISTS idx_generated_files_filepath ON generated_files(filepath);
  `);
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
    const selectStmt = db.prepare('SELECT * FROM code_generation_sessions WHERE id = ?');
    return selectStmt.get(session.id) as DbCodeGenerationSession;
  },

  // Update session status
  updateSession: (sessionId: string, updates: {
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    completed_at?: string;
    error_message?: string;
    processed_files?: number;
  }): DbCodeGenerationSession | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

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
      const selectStmt = db.prepare('SELECT * FROM code_generation_sessions WHERE id = ?');
      return selectStmt.get(sessionId) as DbCodeGenerationSession | null;
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
    const selectStmt = db.prepare('SELECT * FROM code_generation_sessions WHERE id = ?');
    return selectStmt.get(sessionId) as DbCodeGenerationSession;
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
    const selectStmt = db.prepare('SELECT * FROM generated_files WHERE id = ?');
    return selectStmt.get(file.id) as DbGeneratedFile;
  },

  // Update generated file status
  updateGeneratedFile: (fileId: string, updates: {
    status?: 'pending' | 'accepted' | 'rejected';
    applied_at?: string;
  }): DbGeneratedFile | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      if (updates.status === 'accepted') {
        updateFields.push('applied_at = ?');
        values.push(updates.applied_at || now);
      }
    }

    if (updateFields.length === 0) {
      const selectStmt = db.prepare('SELECT * FROM generated_files WHERE id = ?');
      return selectStmt.get(fileId) as DbGeneratedFile | null;
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
    const selectStmt = db.prepare('SELECT * FROM generated_files WHERE id = ?');
    return selectStmt.get(fileId) as DbGeneratedFile;
  },

  // Get session by ID
  getSession: (sessionId: string): DbCodeGenerationSession | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM code_generation_sessions WHERE id = ?');
    return stmt.get(sessionId) as DbCodeGenerationSession | null;
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
    const stmt = db.prepare('SELECT * FROM generated_files WHERE id = ?');
    return stmt.get(fileId) as DbGeneratedFile | null;
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