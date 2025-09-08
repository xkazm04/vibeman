import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'events.db');

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

  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected')),
      agent TEXT,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(project_id, type);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_project_created ON events(project_id, created_at DESC);
  `);
}

// Event database operations
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
  // Create a new event
  createEvent: (event: {
    project_id: string;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
    agent?: string | null;
    message?: string | null;
  }): DbEvent => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (project_id, title, description, type, agent, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

    const result = stmt.get(
      event.project_id,
      event.title,
      event.description,
      event.type,
      event.agent || null,
      event.message || null,
      now
    ) as DbEvent;

    return result;
  },

  // Get events by project ID with pagination
  getEventsByProject: (
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
    }
  ): DbEvent[] => {
    const db = getDatabase();
    const { limit = 50, offset = 0, type } = options || {};

    let query = `
      SELECT * FROM events 
      WHERE project_id = ?
    `;
    const params: any[] = [projectId];

    if (type && type !== 'all') {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbEvent[];
  },

  // Get all events with pagination (for admin/debugging)
  getAllEvents: (options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }): DbEvent[] => {
    const db = getDatabase();
    const { limit = 50, offset = 0, type } = options || {};

    let query = `SELECT * FROM events`;
    const params: any[] = [];

    if (type && type !== 'all') {
      query += ` WHERE type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbEvent[];
  },

  // Get event by ID
  getEventById: (id: string): DbEvent | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    return stmt.get(id) as DbEvent | null;
  },

  // Get event counts by type for a project
  getEventCountsByProject: (projectId: string): Record<string, number> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM events 
      WHERE project_id = ? 
      GROUP BY type
    `);

    const results = stmt.all(projectId) as Array<{ type: string; count: number }>;

    const counts: Record<string, number> = {
      info: 0,
      warning: 0,
      error: 0,
      success: 0,
      proposal_accepted: 0,
      proposal_rejected: 0
    };

    results.forEach(result => {
      counts[result.type] = result.count;
    });

    return counts;
  },

  // Delete old events (cleanup)
  deleteOldEvents: (olderThanDays: number = 30): number => {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const stmt = db.prepare(`
      DELETE FROM events 
      WHERE created_at < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  },

  // Delete events by project
  deleteEventsByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM events WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  // Get recent events across all projects (for dashboard)
  getRecentEvents: (limit: number = 20): DbEvent[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as DbEvent[];
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
  eventDb.close();
});

process.on('SIGINT', () => {
  eventDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  eventDb.close();
  process.exit(0);
});