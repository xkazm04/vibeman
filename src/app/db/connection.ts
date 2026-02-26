/**
 * Database Connection Module
 * Provides backward-compatible interface using the new driver abstraction
 *
 * This module maintains the old API for compatibility while delegating
 * to the new driver-based architecture underneath.
 *
 * Includes optional query pattern instrumentation for the Schema Intelligence
 * engine. The instrumentation wraps `prepare()` to record query timing metadata
 * without changing the return type or behavior of any existing call.
 */

import Database from 'better-sqlite3';
import { getConnection as getDriverConnection, closeDatabase as closeDriver } from './drivers';
import { queryPatternCollector } from '@/lib/db/queryPatternCollector';
import { queryPatternRepository } from './repositories/schema-intelligence.repository';

// Wire collector flush to persist patterns into the DB
let collectorWired = false;
function wireCollector(): void {
  if (collectorWired) return;
  collectorWired = true;

  queryPatternCollector.onFlush((records) => {
    for (const record of records) {
      try {
        queryPatternRepository.upsert({
          queryHash: record.queryHash,
          queryTemplate: record.queryTemplate,
          tableNames: record.tableNames,
          operationType: record.operationType,
          durationMs: record.totalDurationMs / record.count, // avg for this batch
        });
      } catch {
        // Silently skip — table may not exist yet during initial migration
      }
    }
  });
}

/**
 * Wrap a better-sqlite3 Statement to instrument timing.
 */
function instrumentStatement(stmt: Database.Statement, sql: string): Database.Statement {
  const originalGet = stmt.get.bind(stmt);
  const originalAll = stmt.all.bind(stmt);
  const originalRun = stmt.run.bind(stmt);

  stmt.get = function (...args: unknown[]) {
    const start = performance.now();
    const result = originalGet(...args);
    queryPatternCollector.record(sql, performance.now() - start);
    return result;
  } as typeof stmt.get;

  stmt.all = function (...args: unknown[]) {
    const start = performance.now();
    const result = originalAll(...args);
    queryPatternCollector.record(sql, performance.now() - start);
    return result;
  } as typeof stmt.all;

  stmt.run = function (...args: unknown[]) {
    const start = performance.now();
    const result = originalRun(...args);
    queryPatternCollector.record(sql, performance.now() - start);
    return result;
  } as typeof stmt.run;

  return stmt;
}

/** Cached instrumented DB reference */
let instrumentedDb: Database.Database | null = null;

/**
 * Get or create database connection
 *
 * DEPRECATED: This returns a driver-agnostic connection object.
 * For new code, consider using the driver abstraction directly.
 *
 * @returns Database connection (currently returns better-sqlite3 Database for compatibility)
 */
export function getDatabase(): Database.Database {
  if (instrumentedDb) return instrumentedDb;

  const connection = getDriverConnection();

  // For now, we return the underlying better-sqlite3 instance for compatibility
  // This works because SqliteConnection wraps a Database.Database
  // In the future, repositories should use the DbConnection interface instead
  const rawDb: Database.Database = (connection as any).db || connection;

  // Wrap prepare() to instrument all queries
  const originalPrepare = rawDb.prepare.bind(rawDb);
  rawDb.prepare = function (sql: string) {
    const stmt = originalPrepare(sql);
    return instrumentStatement(stmt, sql);
  } as typeof rawDb.prepare;

  wireCollector();
  instrumentedDb = rawDb;
  return instrumentedDb;
}

/**
 * Close database connection
 * Should be called on app shutdown
 */
export function closeDatabase(): void {
  queryPatternCollector.stop();
  instrumentedDb = null;
  closeDriver();
}

// Cleanup handlers are now managed in drivers/index.ts
// This module just provides backward compatibility
