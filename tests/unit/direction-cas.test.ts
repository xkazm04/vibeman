/**
 * Repository CAS tests for directions (manager #1 + #2, 2026-06-19).
 *
 *  - claimDirectionForProcessing: an atomic pending->processing claim; only one caller wins.
 *  - acceptPairedDirection: BEGIN IMMEDIATE accept-one + reject-the-other; the pair invariant
 *    "exactly one accepted, one rejected" must hold, and a second accept of the now-rejected
 *    partner must throw (terminal rejected->accepted).
 *
 * Exercised through the real repository against an in-memory DB via the connection hook.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { directionRepository } from '@/app/db/repositories/direction.repository';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  // Live schema (no CHECK so 'processing' + terminal statuses insert freely in tests).
  db.exec(`
    CREATE TABLE IF NOT EXISTS directions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'p1',
      context_map_id TEXT NOT NULL DEFAULT 'cm1',
      context_map_title TEXT NOT NULL DEFAULT 'title',
      direction TEXT NOT NULL DEFAULT 'dir',
      summary TEXT NOT NULL DEFAULT 'sum',
      status TEXT NOT NULL DEFAULT 'pending',
      requirement_id TEXT,
      requirement_path TEXT,
      pair_id TEXT,
      decision_record TEXT,
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

function insertDirection(id: string, status: string, pairId?: string) {
  db.prepare(
    `INSERT INTO directions (id, status, pair_id) VALUES (?, ?, ?)`
  ).run(id, status, pairId ?? null);
}

const statusOf = (id: string) =>
  (db.prepare(`SELECT status FROM directions WHERE id = ?`).get(id) as { status: string } | undefined)?.status;

describe('claimDirectionForProcessing', () => {
  it('claims a pending direction and lets only the first claim win', () => {
    insertDirection('d1', 'pending');

    expect(directionRepository.claimDirectionForProcessing('d1')).toBe(true);
    expect(statusOf('d1')).toBe('processing');

    // Second claim — no longer pending, so the CAS misses.
    expect(directionRepository.claimDirectionForProcessing('d1')).toBe(false);
  });

  it('does not claim a non-pending direction', () => {
    insertDirection('d2', 'accepted');
    expect(directionRepository.claimDirectionForProcessing('d2')).toBe(false);
  });
});

describe('acceptPairedDirection', () => {
  it('accepts one variant and rejects its partner (exactly one accepted)', () => {
    // Both claimed to 'processing' (as the workflow does before accepting).
    insertDirection('a', 'processing', 'pair1');
    insertDirection('b', 'processing', 'pair1');

    const result = directionRepository.acceptPairedDirection('a', 'req-a', '/path/a.md');

    expect(result.accepted?.status).toBe('accepted');
    expect(statusOf('a')).toBe('accepted');
    expect(statusOf('b')).toBe('rejected');
  });

  it('throws if the now-rejected partner is then accepted (no double-accept)', () => {
    insertDirection('a', 'processing', 'pair2');
    insertDirection('b', 'processing', 'pair2');

    directionRepository.acceptPairedDirection('a', 'req-a', '/path/a.md'); // a accepted, b rejected

    // The losing request tries to accept b — terminal rejected->accepted must throw.
    expect(() => directionRepository.acceptPairedDirection('b', 'req-b', '/path/b.md')).toThrow();

    // Invariant preserved: a accepted, b still rejected.
    expect(statusOf('a')).toBe('accepted');
    expect(statusOf('b')).toBe('rejected');
  });
});
