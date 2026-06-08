import { describe, it, expect, vi } from 'vitest';
import { PreparedStatementCache } from './PreparedStatementCache';
import Database from 'better-sqlite3';

describe('PreparedStatementCache', () => {
  it('should cache and return the same statement for identical SQL', () => {
    const cache = new PreparedStatementCache();
    const mockStmt = { source: 'SELECT 1' } as Database.Statement;
    const factory = vi.fn().mockReturnValue(mockStmt);

    const sql = 'SELECT 1';
    const result1 = cache.get(sql, factory);
    const result2 = cache.get(sql, factory);

    expect(result1).toBe(mockStmt);
    expect(result2).toBe(mockStmt);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(1);
  });

  it('should create new statements for different SQL', () => {
    const cache = new PreparedStatementCache();
    const mockStmt1 = { source: 'SELECT 1' } as Database.Statement;
    const mockStmt2 = { source: 'SELECT 2' } as Database.Statement;
    const factory = vi.fn()
      .mockReturnValueOnce(mockStmt1)
      .mockReturnValueOnce(mockStmt2);

    const result1 = cache.get('SELECT 1', factory);
    const result2 = cache.get('SELECT 2', factory);

    expect(result1).toBe(mockStmt1);
    expect(result2).toBe(mockStmt2);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(2);
  });

  it('should clear the cache', () => {
    const cache = new PreparedStatementCache();
    const mockStmt = { source: 'SELECT 1' } as Database.Statement;
    const factory = vi.fn().mockReturnValue(mockStmt);

    cache.get('SELECT 1', factory);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should never grow beyond maxSize', () => {
    const cache = new PreparedStatementCache(3);
    const factory = (sql: string) => ({ source: sql } as Database.Statement);

    for (let i = 0; i < 10; i++) {
      cache.get(`SELECT ${i}`, factory);
    }

    expect(cache.size).toBe(3);
  });

  it('should evict the least-recently-used statement when full', () => {
    const cache = new PreparedStatementCache(2);
    const factory = vi.fn((sql: string) => ({ source: sql } as Database.Statement));

    cache.get('SELECT a', factory); // [a]
    cache.get('SELECT b', factory); // [a, b]
    cache.get('SELECT a', factory); // refresh a -> [b, a]
    cache.get('SELECT c', factory); // evicts b -> [a, c]

    expect(factory).toHaveBeenCalledTimes(3);

    // a survived (was refreshed), so this hit does not call the factory
    cache.get('SELECT a', factory);
    expect(factory).toHaveBeenCalledTimes(3);

    // b was evicted, so this miss re-creates it
    cache.get('SELECT b', factory);
    expect(factory).toHaveBeenCalledTimes(4);
  });

  it('should keep returning the same instance after a recency refresh', () => {
    const cache = new PreparedStatementCache(2);
    const mockStmt = { source: 'SELECT 1' } as Database.Statement;
    const factory = vi.fn().mockReturnValue(mockStmt);

    const first = cache.get('SELECT 1', factory);
    const second = cache.get('SELECT 1', factory);

    expect(first).toBe(mockStmt);
    expect(second).toBe(mockStmt);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
