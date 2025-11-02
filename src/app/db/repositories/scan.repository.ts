import { getDatabase } from '../connection';
import { DbScan } from '../models/types';
import { LRUCache, generateCacheKey } from '@/lib/lru-cache';

/**
 * LRU cache instance for scan queries
 * Caches up to 200 query results to reduce SQLite access
 */
const scanCache = new LRUCache<any>({ maxSize: 200 });

/**
 * Invalidate all scan cache entries
 * Called on any write operation (create, update, delete)
 */
const invalidateScanCache = () => {
  scanCache.clear();
};

/**
 * Scan Repository
 * Handles all database operations for scans with token tracking
 */
export const scanRepository = {
  /**
   * Get all scans for a project
   */
  getScansByProject: (projectId: string): DbScan[] => {
    const cacheKey = generateCacheKey('getScansByProject', projectId);
    const cached = scanCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scans
      WHERE project_id = ?
      ORDER BY timestamp DESC
    `);
    const result = stmt.all(projectId) as DbScan[];
    scanCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get a single scan by ID
   */
  getScanById: (scanId: string): DbScan | null => {
    const cacheKey = generateCacheKey('getScanById', scanId);
    const cached = scanCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    const scan = stmt.get(scanId) as DbScan | undefined;
    const result = scan || null;
    scanCache.set(cacheKey, result);
    return result;
  },

  /**
   * Create a new scan with optional token tracking
   */
  createScan: (scan: {
    id: string;
    project_id: string;
    scan_type: string;
    summary?: string;
    input_tokens?: number;
    output_tokens?: number;
  }): DbScan => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO scans (id, project_id, scan_type, timestamp, summary, input_tokens, output_tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scan.id,
      scan.project_id,
      scan.scan_type,
      now,
      scan.summary || null,
      scan.input_tokens || null,
      scan.output_tokens || null,
      now
    );

    // Invalidate cache on write operation
    invalidateScanCache();

    const selectStmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    return selectStmt.get(scan.id) as DbScan;
  },

  /**
   * Update scan token usage (after LLM response)
   */
  updateTokenUsage: (scanId: string, inputTokens: number, outputTokens: number): DbScan | null => {
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE scans
      SET input_tokens = ?, output_tokens = ?
      WHERE id = ?
    `);

    const result = stmt.run(inputTokens, outputTokens, scanId);

    if (result.changes === 0) {
      return null; // Scan not found
    }

    // Invalidate cache on write operation
    invalidateScanCache();

    const selectStmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    return selectStmt.get(scanId) as DbScan;
  },

  /**
   * Delete a scan (will cascade delete associated ideas)
   */
  deleteScan: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
    const result = stmt.run(id);

    // Invalidate cache on write operation
    if (result.changes > 0) {
      invalidateScanCache();
    }

    return result.changes > 0;
  },

  /**
   * Get total token usage statistics for a project
   */
  getTokenStatsByProject: (projectId: string): { totalInputTokens: number; totalOutputTokens: number; scanCount: number } => {
    const cacheKey = generateCacheKey('getTokenStatsByProject', projectId);
    const cached = scanCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as totalInputTokens,
        COALESCE(SUM(output_tokens), 0) as totalOutputTokens,
        COUNT(*) as scanCount
      FROM scans
      WHERE project_id = ? AND (input_tokens IS NOT NULL OR output_tokens IS NOT NULL)
    `);

    const result = stmt.get(projectId) as any;
    const statsResult = {
      totalInputTokens: result.totalInputTokens || 0,
      totalOutputTokens: result.totalOutputTokens || 0,
      scanCount: result.scanCount || 0
    };
    scanCache.set(cacheKey, statsResult);
    return statsResult;
  }
};
