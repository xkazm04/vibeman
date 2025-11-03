/**
 * Monitor Database
 * SQLite database for voicebot call and message monitoring
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Logger helpers
function log(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(`[MonitorDB] ${message}`, data);
    } else {
      console.log(`[MonitorDB] ${message}`);
    }
  }
}

function logError(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[MonitorDB] ${message}`, error);
  }
}

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'monitor.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getMonitorDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeMonitorTables();
    log('Database initialized', DB_PATH);
  }

  return db;
}

function initializeMonitorTables() {
  if (!db) return;
  
  // Create calls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      call_id TEXT PRIMARY KEY,
      user_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'active',
      intent TEXT,
      outcome TEXT,
      prompt_version_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      node_id TEXT,
      latency_ms INTEGER,
      metadata TEXT,
      eval_ok INTEGER DEFAULT 0,
      review_ok INTEGER DEFAULT 0,
      eval_class TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (call_id) REFERENCES calls(call_id) ON DELETE CASCADE
    );
  `);

  // Create message_classes enum table
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_classes (
      class_id TEXT PRIMARY KEY,
      class_name TEXT NOT NULL UNIQUE,
      description TEXT,
      frequency INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create patterns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      pattern_id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,
      description TEXT,
      frequency INTEGER DEFAULT 1,
      example_call_ids TEXT,
      detected_at TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time);
    CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
    CREATE INDEX IF NOT EXISTS idx_messages_call_id ON messages(call_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_eval_class ON messages(eval_class);
    CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON patterns(detected_at);
    CREATE INDEX IF NOT EXISTS idx_message_classes_name ON message_classes(class_name);
  `);

  log('Tables initialized');
}

// Database operation types
export interface DbCall {
  call_id: string;
  user_id: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: string;
  intent: string | null;
  outcome: string | null;
  prompt_version_id: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  message_id: string;
  call_id: string;
  role: string;
  content: string;
  timestamp: string;
  node_id: string | null;
  latency_ms: number | null;
  metadata: string | null;
  eval_ok: number;
  review_ok: number;
  eval_class: string | null;
  created_at: string;
}

export interface DbMessageClass {
  class_id: string;
  class_name: string;
  description: string | null;
  frequency: number;
  created_at: string;
  updated_at: string;
}

export interface DbPattern {
  pattern_id: string;
  pattern_type: string;
  description: string | null;
  frequency: number;
  example_call_ids: string | null;
  detected_at: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

// Monitor database operations
export const monitorDb = {
  // ============= CALLS OPERATIONS =============
  
  // Get all calls
  getAllCalls: (): DbCall[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calls 
      ORDER BY start_time DESC
    `);
    return stmt.all() as DbCall[];
  },

  // Get call by ID
  getCall: (callId: string): DbCall | null => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM calls WHERE call_id = ?');
    return stmt.get(callId) as DbCall | null;
  },

  // Get calls by status
  getCallsByStatus: (status: string): DbCall[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM calls WHERE status = ? ORDER BY start_time DESC');
    return stmt.all(status) as DbCall[];
  },

  // Get calls by date range
  getCallsByDateRange: (startDate: string, endDate: string): DbCall[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calls 
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time DESC
    `);
    return stmt.all(startDate, endDate) as DbCall[];
  },

  // Create a new call
  createCall: (call: {
    call_id: string;
    user_id?: string;
    start_time: string;
    status?: string;
    intent?: string;
    prompt_version_id?: string;
    metadata?: Record<string, unknown>;
  }): DbCall => {
    const db = getMonitorDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO calls (
        call_id, user_id, start_time, status, intent, prompt_version_id, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      call.call_id,
      call.user_id || null,
      call.start_time,
      call.status || 'active',
      call.intent || null,
      call.prompt_version_id || null,
      call.metadata ? JSON.stringify(call.metadata) : null,
      now,
      now
    );
    
    return monitorDb.getCall(call.call_id)!;
  },

  // Update call
  updateCall: (callId: string, updates: {
    end_time?: string;
    duration?: number;
    status?: string;
    intent?: string;
    outcome?: string;
    prompt_version_id?: string;
    metadata?: Record<string, unknown>;
  }): DbCall | null => {
    const db = getMonitorDatabase();
    const now = new Date().toISOString();
    
    const fields: string[] = [];
    const values: unknown[] = [];
    
    if (updates.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.end_time);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.intent !== undefined) {
      fields.push('intent = ?');
      values.push(updates.intent);
    }
    if (updates.outcome !== undefined) {
      fields.push('outcome = ?');
      values.push(updates.outcome);
    }
    if (updates.prompt_version_id !== undefined) {
      fields.push('prompt_version_id = ?');
      values.push(updates.prompt_version_id);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(callId);
    
    const stmt = db.prepare(`
      UPDATE calls 
      SET ${fields.join(', ')}
      WHERE call_id = ?
    `);
    
    stmt.run(...values);
    return monitorDb.getCall(callId);
  },

  // Delete call
  deleteCall: (callId: string): boolean => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('DELETE FROM calls WHERE call_id = ?');
    const result = stmt.run(callId);
    return result.changes > 0;
  },

  // ============= MESSAGES OPERATIONS =============
  
  // Get all messages for a call
  getCallMessages: (callId: string): DbMessage[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE call_id = ? 
      ORDER BY timestamp ASC
    `);
    return stmt.all(callId) as DbMessage[];
  },

  // Get message by ID
  getMessage: (messageId: string): DbMessage | null => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM messages WHERE message_id = ?');
    return stmt.get(messageId) as DbMessage | null;
  },

  // Create a new message
  createMessage: (message: {
    message_id: string;
    call_id: string;
    role: string;
    content: string;
    timestamp: string;
    node_id?: string;
    latency_ms?: number;
    metadata?: Record<string, unknown>;
  }): DbMessage => {
    const db = getMonitorDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO messages (
        message_id, call_id, role, content, timestamp, node_id, latency_ms, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      message.message_id,
      message.call_id,
      message.role,
      message.content,
      message.timestamp,
      message.node_id || null,
      message.latency_ms || null,
      message.metadata ? JSON.stringify(message.metadata) : null,
      now
    );
    
    return monitorDb.getMessage(message.message_id)!;
  },

  // Delete message
  deleteMessage: (messageId: string): boolean => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('DELETE FROM messages WHERE message_id = ?');
    const result = stmt.run(messageId);
    return result.changes > 0;
  },

  // Update message evaluation fields
  updateMessageEvaluation: (messageId: string, evalData: {
    eval_ok?: boolean;
    review_ok?: boolean;
    eval_class?: string;
  }): DbMessage | null => {
    const db = getMonitorDatabase();
    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (evalData.eval_ok !== undefined) {
      updates.push('eval_ok = ?');
      values.push(evalData.eval_ok ? 1 : 0);
    }
    if (evalData.review_ok !== undefined) {
      updates.push('review_ok = ?');
      values.push(evalData.review_ok ? 1 : 0);
    }
    if (evalData.eval_class !== undefined) {
      updates.push('eval_class = ?');
      values.push(evalData.eval_class);
    }

    if (updates.length === 0) return null;

    values.push(messageId);
    const stmt = db.prepare(`
      UPDATE messages 
      SET ${updates.join(', ')}
      WHERE message_id = ?
    `);
    stmt.run(...values);

    return monitorDb.getMessage(messageId);
  },

  // ============= MESSAGE CLASSES OPERATIONS =============

  // Get all message classes
  getAllMessageClasses: (): DbMessageClass[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      SELECT * FROM message_classes 
      ORDER BY frequency DESC
    `);
    return stmt.all() as DbMessageClass[];
  },

  // Get message class by name
  getMessageClassByName: (className: string): DbMessageClass | null => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM message_classes WHERE class_name = ?');
    return stmt.get(className) as DbMessageClass | null;
  },

  // Create message class
  createMessageClass: (messageClass: {
    class_id: string;
    class_name: string;
    description?: string;
  }): DbMessageClass => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      INSERT INTO message_classes (class_id, class_name, description)
      VALUES (?, ?, ?)
    `);
    stmt.run(
      messageClass.class_id,
      messageClass.class_name,
      messageClass.description || null
    );
    return monitorDb.getMessageClassByName(messageClass.class_name)!;
  },

  // Increment message class frequency
  incrementMessageClassFrequency: (className: string): boolean => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      UPDATE message_classes 
      SET frequency = frequency + 1, updated_at = datetime('now')
      WHERE class_name = ?
    `);
    const result = stmt.run(className);
    return result.changes > 0;
  },

  // ============= PATTERNS OPERATIONS =============
  
  // Get all patterns
  getAllPatterns: (): DbPattern[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare(`
      SELECT * FROM patterns 
      ORDER BY detected_at DESC
    `);
    return stmt.all() as DbPattern[];
  },

  // Get patterns by type
  getPatternsByType: (patternType: string): DbPattern[] => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM patterns WHERE pattern_type = ? ORDER BY frequency DESC');
    return stmt.all(patternType) as DbPattern[];
  },

  // Get pattern by ID
  getPattern: (patternId: string): DbPattern | null => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT * FROM patterns WHERE pattern_id = ?');
    return stmt.get(patternId) as DbPattern | null;
  },

  // Create a new pattern
  createPattern: (pattern: {
    pattern_id: string;
    pattern_type: string;
    description?: string;
    frequency?: number;
    example_call_ids?: string[];
    detected_at: string;
    metadata?: Record<string, unknown>;
  }): DbPattern => {
    const db = getMonitorDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO patterns (
        pattern_id, pattern_type, description, frequency, example_call_ids, detected_at, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      pattern.pattern_id,
      pattern.pattern_type,
      pattern.description || null,
      pattern.frequency || 1,
      pattern.example_call_ids ? JSON.stringify(pattern.example_call_ids) : null,
      pattern.detected_at,
      pattern.metadata ? JSON.stringify(pattern.metadata) : null,
      now,
      now
    );
    
    return monitorDb.getPattern(pattern.pattern_id)!;
  },

  // Update pattern frequency
  updatePatternFrequency: (patternId: string, frequency: number): DbPattern | null => {
    const db = getMonitorDatabase();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE patterns 
      SET frequency = ?, updated_at = ?
      WHERE pattern_id = ?
    `);
    
    stmt.run(frequency, now, patternId);
    return monitorDb.getPattern(patternId);
  },

  // Delete pattern
  deletePattern: (patternId: string): boolean => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('DELETE FROM patterns WHERE pattern_id = ?');
    const result = stmt.run(patternId);
    return result.changes > 0;
  },

  // Delete patterns containing a specific call_id
  deletePatternsForCall: (callId: string): number => {
    const db = getMonitorDatabase();
    // Find patterns that contain this call_id in their example_call_ids JSON array
    const patterns = db.prepare('SELECT * FROM patterns').all() as DbPattern[];
    let deletedCount = 0;
    
    for (const pattern of patterns) {
      if (pattern.example_call_ids) {
        try {
          const callIds = JSON.parse(pattern.example_call_ids) as string[];
          if (callIds.includes(callId)) {
            // Remove this call_id from the array
            const updatedCallIds = callIds.filter(id => id !== callId);
            
            if (updatedCallIds.length === 0) {
              // Delete pattern if no call examples remain
              db.prepare('DELETE FROM patterns WHERE pattern_id = ?').run(pattern.pattern_id);
              deletedCount++;
            } else {
              // Update pattern with remaining call_ids
              db.prepare('UPDATE patterns SET example_call_ids = ?, updated_at = datetime("now") WHERE pattern_id = ?')
                .run(JSON.stringify(updatedCallIds), pattern.pattern_id);
            }
          }
        } catch (error) {
          logError(`Error processing pattern ${pattern.pattern_id}`, error);
        }
      }
    }
    
    return deletedCount;
  },

  // ============= STATISTICS OPERATIONS =============
  
  // Get call statistics
  getCallStatistics: (): {
    total: number;
    completed: number;
    failed: number;
    abandoned: number;
    active: number;
    avgDuration: number | null;
  } => {
    const db = getMonitorDatabase();
    
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM calls');
    const total = (totalStmt.get() as { count: number }).count;
    
    const completedStmt = db.prepare('SELECT COUNT(*) as count FROM calls WHERE status = ?');
    const completed = (completedStmt.get('completed') as { count: number }).count;
    const failed = (completedStmt.get('failed') as { count: number }).count;
    const abandoned = (completedStmt.get('abandoned') as { count: number }).count;
    const active = (completedStmt.get('active') as { count: number }).count;
    
    const avgStmt = db.prepare('SELECT AVG(duration) as avg FROM calls WHERE duration IS NOT NULL');
    const avgDuration = (avgStmt.get() as { avg: number | null }).avg;
    
    return {
      total,
      completed,
      failed,
      abandoned,
      active,
      avgDuration: avgDuration ? Math.round(avgDuration) : null
    };
  },

  // Get message count for a call
  getMessageCount: (callId: string): number => {
    const db = getMonitorDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE call_id = ?');
    return (stmt.get(callId) as { count: number }).count;
  },

  // ============= CLEANUP OPERATIONS =============
  
  // Close database connection
  close: () => {
    if (db) {
      db.close();
      db = null;
      log('Database connection closed');
    }
  }
};

// Cleanup on process exit
process.on('exit', () => {
  monitorDb.close();
});

process.on('SIGINT', () => {
  monitorDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitorDb.close();
  process.exit(0);
});
