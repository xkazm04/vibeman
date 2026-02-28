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

  // Note: Testing WeakRef/FinalizationRegistry behavior is hard in unit tests
  // as it depends on GC timing. We trust the V8 implementation of these features.
});
