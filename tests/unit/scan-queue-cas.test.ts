/**
 * Repository CAS test for scanQueueCoreRepository.updateStatus (scan-queue #3, 2026-06-19).
 *
 * The worker's terminal writes pass expectedCurrentStatus='running' so a user's mid-run
 * cancel (status set to 'cancelled' by DELETE) is not clobbered back to completed/failed.
 * Exercised through the real repository against an in-memory DB via the connection hook.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { scanQueueCoreRepository } from '@/app/db/repositories/scanQueue.core.repository';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  // Minimal schema (no CHECK so any status inserts in tests).
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_queue (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'p1',
      scan_type TEXT NOT NULL DEFAULT 'bug_hunter',
      context_id TEXT,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'queued',
      scan_id TEXT,
      result_summary TEXT,
      error_message TEXT,
      auto_merge_enabled INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  __setTestDatabase(db);
});

afterEach(() => {
  __setTestDatabase(null);
  db.close();
});

function insertItem(id: string, status: string) {
  db.prepare(`INSERT INTO scan_queue (id, status) VALUES (?, ?)`).run(id, status);
}

const statusOf = (id: string) =>
  (db.prepare(`SELECT status FROM scan_queue WHERE id = ?`).get(id) as { status: string } | undefined)?.status;

describe('scanQueueCoreRepository.updateStatus CAS', () => {
  it('updates unconditionally when no precondition is given', () => {
    insertItem('q1', 'running');
    const res = scanQueueCoreRepository.updateStatus('q1', 'completed');
    expect(res?.status).toBe('completed');
  });

  it('completes a running item when expecting running', () => {
    insertItem('q2', 'running');
    const res = scanQueueCoreRepository.updateStatus('q2', 'completed', undefined, 'running');
    expect(res?.status).toBe('completed');
  });

  it('does NOT clobber a cancelled item (CAS on running misses)', () => {
    insertItem('q3', 'cancelled'); // user cancelled mid-run
    const res = scanQueueCoreRepository.updateStatus('q3', 'completed', undefined, 'running');
    expect(res).toBeNull();
    expect(statusOf('q3')).toBe('cancelled'); // cancel preserved

    // same for the failure path
    const failRes = scanQueueCoreRepository.updateStatus('q3', 'failed', 'boom', 'running');
    expect(failRes).toBeNull();
    expect(statusOf('q3')).toBe('cancelled');
  });
});
