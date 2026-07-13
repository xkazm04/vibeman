/**
 * Orphan / stale-session reaper tests.
 *
 * Exercises the DB-backed reaping paths against an isolated in-memory database
 * (via __setTestDatabase) with process.kill mocked so no real signals are sent.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import { sessionRepository } from '@/app/db/repositories/session.repository';
import {
  reapOrphanedProcesses,
  reapStaleSessions,
  startStaleSessionSweeper,
} from './orphanReaper';

function createSessionsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE claude_code_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      claude_session_id TEXT,
      status TEXT NOT NULL,
      context_tokens INTEGER DEFAULT 0,
      pid INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/** Insert a session row directly with explicit timestamps for staleness control. */
function insertSession(
  db: Database.Database,
  row: {
    id: string;
    status: string;
    pid?: number | null;
    updatedAt?: string;
    createdAt?: string;
  }
) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO claude_code_sessions (id, project_id, name, status, context_tokens, pid, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    row.id,
    'proj-1',
    'terminal:claude',
    row.status,
    row.pid ?? null,
    row.createdAt ?? now,
    row.updatedAt ?? now
  );
}

describe('orphanReaper', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    createSessionsTable(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
    vi.restoreAllMocks();
  });

  describe('reapOrphanedProcesses', () => {
    it('kills a live orphan process and marks its session failed', () => {
      insertSession(db, { id: 's-live', status: 'running', pid: 4242 });

      const killed: Array<{ pid: number; sig: unknown }> = [];
      // signal 0 → liveness probe returns true; SIGTERM → record the kill.
      vi.spyOn(process, 'kill').mockImplementation(((pid: number, sig?: unknown) => {
        if (sig === 0) return true;
        killed.push({ pid, sig });
        return true;
      }) as typeof process.kill);

      const result = reapOrphanedProcesses(sessionRepository);

      expect(result.reaped).toBe(1);
      expect(killed).toEqual([{ pid: 4242, sig: 'SIGTERM' }]);

      const row = sessionRepository.getById('s-live');
      expect(row?.status).toBe('failed');
      // PIDs are cleared after reaping.
      expect(row?.pid).toBeNull();
    });

    it('counts an already-dead process without killing and still fails the session', () => {
      insertSession(db, { id: 's-dead', status: 'running', pid: 9999 });

      const sigterms: number[] = [];
      vi.spyOn(process, 'kill').mockImplementation(((pid: number, sig?: unknown) => {
        if (sig === 0) throw new Error('ESRCH'); // process no longer exists
        sigterms.push(pid);
        return true;
      }) as typeof process.kill);

      const result = reapOrphanedProcesses(sessionRepository);

      expect(result.alreadyDead).toBe(1);
      expect(result.reaped).toBe(0);
      expect(sigterms).toHaveLength(0);
      expect(sessionRepository.getById('s-dead')?.status).toBe('failed');
    });

    it('is a no-op when there are no sessions with pids', () => {
      insertSession(db, { id: 's-nopid', status: 'running', pid: null });
      const spy = vi.spyOn(process, 'kill');
      const result = reapOrphanedProcesses(sessionRepository);
      expect(result).toEqual({ reaped: 0, alreadyDead: 0 });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('reapStaleSessions', () => {
    it('deletes a stale running session and kills its live process', () => {
      const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
      insertSession(db, { id: 's-stale', status: 'running', pid: 7777, updatedAt: stale });

      const killed: number[] = [];
      vi.spyOn(process, 'kill').mockImplementation(((pid: number, sig?: unknown) => {
        if (sig === 0) return true;
        killed.push(pid);
        return true;
      }) as typeof process.kill);

      const result = reapStaleSessions({ runningMinutes: 30, pausedHours: 24, pendingHours: 6 }, sessionRepository);

      expect(result.deleted).toBe(1);
      expect(killed).toEqual([7777]);
      expect(sessionRepository.getById('s-stale')).toBeNull();
    });

    it('leaves a freshly heartbeating running session untouched', () => {
      insertSession(db, { id: 's-fresh', status: 'running', pid: 1234 }); // updated_at = now
      vi.spyOn(process, 'kill').mockImplementation((() => true) as typeof process.kill);

      const result = reapStaleSessions({ runningMinutes: 30, pausedHours: 24, pendingHours: 6 }, sessionRepository);

      expect(result.deleted).toBe(0);
      expect(sessionRepository.getById('s-fresh')).not.toBeNull();
    });
  });

  describe('startStaleSessionSweeper', () => {
    it('registers a single unref-d interval and is idempotent', () => {
      const g = globalThis as unknown as { staleSessionSweeper?: NodeJS.Timeout };
      // Ensure a clean slate for this assertion.
      if (g.staleSessionSweeper) {
        clearInterval(g.staleSessionSweeper);
        g.staleSessionSweeper = undefined;
      }

      startStaleSessionSweeper(undefined, 60_000);
      const first = g.staleSessionSweeper;
      expect(first).toBeDefined();

      startStaleSessionSweeper(undefined, 60_000);
      expect(g.staleSessionSweeper).toBe(first); // no second interval created

      if (g.staleSessionSweeper) {
        clearInterval(g.staleSessionSweeper);
        g.staleSessionSweeper = undefined;
      }
    });
  });
});
