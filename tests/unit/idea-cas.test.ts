/**
 * Repository CAS test for ideaRepository.claimIdeaForAcceptance (ideas #1, 2026-06-19).
 *
 * The single-statement CAS is the only thing that prevents a concurrent/retried accept
 * from both writing the requirement file + double-firing signals (the state machine
 * allows accepted->accepted as a no-op, so it can't guard this). Exactly one claim from a
 * given fromStatus must win. Exercised through the real repository against an in-memory DB
 * injected via the connection test hook.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { ideaRepository } from '@/app/db/repositories/idea.repository';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  // Minimal schema — claimIdeaForAcceptance only touches status/requirement_id/updated_at.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      requirement_id TEXT,
      updated_at TEXT
    );
  `);
  __setTestDatabase(db);
});

afterEach(() => {
  __setTestDatabase(null);
  db.close();
});

const rowOf = (id: string) =>
  db.prepare(`SELECT status, requirement_id FROM ideas WHERE id = ?`).get(id) as
    | { status: string; requirement_id: string | null }
    | undefined;

describe('ideaRepository.claimIdeaForAcceptance', () => {
  beforeEach(() => {
    db.prepare(`INSERT INTO ideas (id, status) VALUES ('i1', 'pending')`).run();
  });

  it('claims a pending idea and stamps status + requirement_id', () => {
    const won = ideaRepository.claimIdeaForAcceptance('i1', 'pending', 'req-1');
    expect(won).toBe(true);
    expect(rowOf('i1')).toMatchObject({ status: 'accepted', requirement_id: 'req-1' });
  });

  it('lets only the first claim win — a second claim from pending loses (no double-accept)', () => {
    expect(ideaRepository.claimIdeaForAcceptance('i1', 'pending', 'req-1')).toBe(true);
    // Second concurrent/retried accept: the row is no longer 'pending', so the CAS misses.
    expect(ideaRepository.claimIdeaForAcceptance('i1', 'pending', 'req-2')).toBe(false);
    // requirement_id must remain the first winner's value.
    expect(rowOf('i1')).toMatchObject({ status: 'accepted', requirement_id: 'req-1' });
  });

  it('does not claim from a non-matching fromStatus', () => {
    expect(ideaRepository.claimIdeaForAcceptance('i1', 'rejected', 'req-x')).toBe(false);
    expect(rowOf('i1')?.status).toBe('pending');
  });

  it('returns false for an unknown id', () => {
    expect(ideaRepository.claimIdeaForAcceptance('nope', 'pending', 'req')).toBe(false);
  });
});
