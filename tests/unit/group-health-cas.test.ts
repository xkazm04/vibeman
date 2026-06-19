/**
 * Repository test for group_health_scans.createIfNoActiveScan (context-mgmt #2, 2026-06-19).
 *
 * The atomic create must refuse a second scan while one is already active (pending|running)
 * for the same group — closing the TOCTOU where the old check looked for 'running' but
 * create() inserted 'pending'. Exercised through the real repository against an in-memory
 * DB injected via the connection test hook.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { groupHealthRepository } from '@/app/db/repositories/group-health.repository';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_health_scans (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      execution_id TEXT,
      health_score INTEGER,
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

const activeCount = (groupId: string) =>
  (db
    .prepare(`SELECT COUNT(*) as c FROM group_health_scans WHERE group_id = ? AND status IN ('pending','running')`)
    .get(groupId) as { c: number }).c;

describe('groupHealthRepository.createIfNoActiveScan', () => {
  it('creates a scan when none is active for the group', () => {
    const scan = groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    expect(scan).not.toBeNull();
    expect(scan?.status).toBe('pending');
    expect(activeCount('g1')).toBe(1);
  });

  it('refuses a second scan while one is active for the same group', () => {
    groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    const second = groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    expect(second).toBeNull();
    expect(activeCount('g1')).toBe(1); // still exactly one active scan
  });

  it('does not block a different group', () => {
    groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    const other = groupHealthRepository.createIfNoActiveScan({ group_id: 'g2', project_id: 'p1' });
    expect(other).not.toBeNull();
    expect(activeCount('g2')).toBe(1);
  });

  it('allows a new scan once the previous one is no longer active', () => {
    const first = groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    groupHealthRepository.failScan(first!.id); // -> 'failed' (terminal)

    const again = groupHealthRepository.createIfNoActiveScan({ group_id: 'g1', project_id: 'p1' });
    expect(again).not.toBeNull();
    expect(activeCount('g1')).toBe(1);
  });
});
