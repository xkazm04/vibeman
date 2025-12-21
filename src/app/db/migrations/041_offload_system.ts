/**
 * Migration 041: Cross-Device Offload System
 * Creates tables for device pairing and task offloading between Vibeman instances
 */

import Database from 'better-sqlite3';

export function migrate041OffloadSystem(db: Database.Database): void {
  // Create device_pairs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_pairs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_role TEXT NOT NULL CHECK (device_role IN ('active', 'passive')),
      pairing_code TEXT UNIQUE,
      partner_url TEXT,
      partner_device_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paired', 'disconnected')),
      last_heartbeat_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for device_pairs
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_device_pairs_project_id
      ON device_pairs(project_id);
    CREATE INDEX IF NOT EXISTS idx_device_pairs_pairing_code
      ON device_pairs(pairing_code);
    CREATE INDEX IF NOT EXISTS idx_device_pairs_status
      ON device_pairs(status);
  `);

  // Create offload_queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offload_queue (
      id TEXT PRIMARY KEY,
      device_pair_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      requirement_name TEXT NOT NULL,
      requirement_content TEXT NOT NULL,
      context_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'running', 'completed', 'failed')),
      priority INTEGER NOT NULL DEFAULT 5,
      synced_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      result_summary TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_pair_id) REFERENCES device_pairs(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for offload_queue
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_offload_queue_device_pair_id
      ON offload_queue(device_pair_id);
    CREATE INDEX IF NOT EXISTS idx_offload_queue_project_id
      ON offload_queue(project_id);
    CREATE INDEX IF NOT EXISTS idx_offload_queue_status
      ON offload_queue(status);
    CREATE INDEX IF NOT EXISTS idx_offload_queue_priority
      ON offload_queue(priority DESC, created_at ASC);
  `);

  console.log('[Migration 041] Created offload system tables (device_pairs, offload_queue)');
}
