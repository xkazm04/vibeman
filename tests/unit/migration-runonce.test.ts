/**
 * Tests for the migration tracking state machine (migration.utils).
 *
 * Locks in the 2026-06-19 critical fix: a migration whose DDL throws must be recorded
 * status='failed' (so it retries), NOT 'applied' — including when the throwing body is
 * wrapped in the deprecated safeMigration(), which previously swallowed the error inside
 * runOnce() and let the failed migration commit as permanently applied.
 *
 * Note: migration.utils expects a DbConnection whose `transaction(fn)` EXECUTES fn
 * immediately (the sqlite driver does `db.transaction(fn)()`), whereas raw better-sqlite3
 * returns a deferred function. The thin adapter below bridges that for the in-memory db.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  ensureMigrationsTable,
  runOnce,
  safeMigration,
  isMigrationApplied,
  getAppliedMigrations,
  getFailedMigrations,
} from '@/app/db/migrations/migration.utils';

// Minimal DbConnection adapter: prepare/exec pass straight through; transaction runs
// immediately (matching the production sqlite driver).
function asDbConnection(raw: Database.Database) {
  return {
    prepare: (sql: string) => raw.prepare(sql),
    exec: (sql: string) => raw.exec(sql),
    transaction: <T>(fn: () => T): T => raw.transaction(fn)(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('migration runOnce / safeMigration', () => {
  let raw: Database.Database;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  beforeEach(() => {
    raw = new Database(':memory:');
    db = asDbConnection(raw);
    ensureMigrationsTable(db);
  });

  afterEach(() => {
    raw.close();
  });

  const statusOf = (name: string) =>
    getAppliedMigrations(db).find((m) => m.name === name)?.status;

  it('records a successful migration as applied and runs it once', () => {
    let calls = 0;
    runOnce(db, 'm-ok', () => { calls++; raw.exec('CREATE TABLE ok_t (id TEXT)'); });

    expect(calls).toBe(1);
    expect(isMigrationApplied(db, 'm-ok')).toBe(true);
    expect(statusOf('m-ok')).toBe('applied');

    // Second call is a no-op — the body must not run again.
    runOnce(db, 'm-ok', () => { calls++; });
    expect(calls).toBe(1);
  });

  it('records a directly-throwing migration as failed (retryable), not applied', () => {
    runOnce(db, 'm-throw', () => { throw new Error('boom'); });

    expect(isMigrationApplied(db, 'm-throw')).toBe(false);
    expect(statusOf('m-throw')).toBe('failed');
    expect(getFailedMigrations(db).some((m) => m.name === 'm-throw')).toBe(true);
  });

  it('rolls back the schema change when the migration throws after a DDL', () => {
    runOnce(db, 'm-rollback', () => {
      raw.exec('CREATE TABLE half_t (id TEXT)');
      throw new Error('after ddl');
    });

    const exists = raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='half_t'")
      .get();
    expect(exists).toBeUndefined(); // transaction rolled back the CREATE TABLE
    expect(statusOf('m-rollback')).toBe('failed');
  });

  it('CRITICAL: safeMigration inside runOnce re-throws so the migration records failed', () => {
    // The regression this guards: safeMigration swallowed the throw, runOnce saw no
    // error, and committed recordMigration(name, 'applied') for a migration whose DDL
    // never landed — permanent silent schema corruption that never retried.
    runOnce(db, 'm-safe-inner', () => {
      safeMigration('inner', () => {
        throw new Error('ddl failed');
      });
    });

    expect(isMigrationApplied(db, 'm-safe-inner')).toBe(false);
    expect(statusOf('m-safe-inner')).toBe('failed');
  });

  it('bare safeMigration (outside runOnce) still swallows errors (boot resilience)', () => {
    // Outside a tracked runOnce, safeMigration must NOT throw — a single failing
    // boot-time migration should be logged and skipped, not crash startup.
    expect(() =>
      safeMigration('bare', () => { throw new Error('x'); })
    ).not.toThrow();
  });
});
