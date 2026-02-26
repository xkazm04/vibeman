/**
 * Query Pattern Collector
 *
 * Lightweight in-memory buffer that collects SQL query execution metadata
 * (query template, duration, tables touched) and periodically flushes
 * aggregated patterns to the schema_intelligence tables.
 *
 * Design:
 * - No runtime overhead on the hot path beyond a Map lookup + increment
 * - Flush is batched (every 60s or 100 queries) and runs in a try/catch
 *   so failures never block the caller
 * - Query templates are normalized (params replaced with ?) for grouping
 * - Uses a simple FNV-1a hash for pattern deduplication
 */

import { createHash } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────

interface QueryRecord {
  queryTemplate: string;
  queryHash: string;
  tableNames: string[];
  operationType: 'select' | 'insert' | 'update' | 'delete';
  totalDurationMs: number;
  maxDurationMs: number;
  count: number;
  lastSeen: number;
}

// ─── Constants ────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 60_000;   // Flush every 60 seconds
const FLUSH_THRESHOLD = 100;        // Or after 100 new recordings
const MAX_BUFFER_SIZE = 500;        // Prevent unbounded growth

// ─── Normalization ────────────────────────────────────────────────

/** Normalize a SQL query by replacing literal values with ? placeholders */
function normalizeQuery(sql: string): string {
  return sql
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Replace string literals
    .replace(/'[^']*'/g, '?')
    // Replace numeric literals (but not in identifiers)
    .replace(/\b\d+\b/g, '?')
    // Normalize IN lists: IN (?, ?, ?) → IN (?)
    .replace(/IN\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi, 'IN (?)')
    // Normalize VALUES tuples: VALUES (?, ?, ?) → VALUES (?)
    .replace(/VALUES\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi, 'VALUES (?)');
}

/** Extract table names from a SQL query */
function extractTableNames(sql: string): string[] {
  const tables = new Set<string>();
  const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  // FROM table
  const fromMatches = normalized.matchAll(/\bFROM\s+([A-Z_][A-Z0-9_]*)/gi);
  for (const m of fromMatches) tables.add(m[1].toLowerCase());

  // JOIN table
  const joinMatches = normalized.matchAll(/\bJOIN\s+([A-Z_][A-Z0-9_]*)/gi);
  for (const m of joinMatches) tables.add(m[1].toLowerCase());

  // INSERT INTO table
  const insertMatch = normalized.match(/\bINSERT\s+INTO\s+([A-Z_][A-Z0-9_]*)/i);
  if (insertMatch) tables.add(insertMatch[1].toLowerCase());

  // UPDATE table
  const updateMatch = normalized.match(/\bUPDATE\s+([A-Z_][A-Z0-9_]*)/i);
  if (updateMatch) tables.add(updateMatch[1].toLowerCase());

  // DELETE FROM table
  const deleteMatch = normalized.match(/\bDELETE\s+FROM\s+([A-Z_][A-Z0-9_]*)/i);
  if (deleteMatch) tables.add(deleteMatch[1].toLowerCase());

  // Filter out SQLite internal tables and common keywords that might match
  const excluded = new Set(['sqlite_master', 'sqlite_temp_master', 'pragma', 'table_info']);
  return Array.from(tables).filter(t => !excluded.has(t));
}

/** Detect operation type from SQL */
function detectOperationType(sql: string): 'select' | 'insert' | 'update' | 'delete' {
  const trimmed = sql.trimStart().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) return 'select';
  if (trimmed.startsWith('INSERT')) return 'insert';
  if (trimmed.startsWith('UPDATE')) return 'update';
  if (trimmed.startsWith('DELETE')) return 'delete';
  return 'select'; // default
}

/** Hash a query template for deduplication */
function hashQuery(template: string): string {
  return createHash('md5').update(template).digest('hex').slice(0, 16);
}

// ─── Collector ────────────────────────────────────────────────────

class QueryPatternCollector {
  private buffer: Map<string, QueryRecord> = new Map();
  private pendingCount = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushCallback: ((records: QueryRecord[]) => void) | null = null;

  /**
   * Register a flush callback. Called when the buffer is flushed.
   * The callback receives aggregated query records.
   */
  onFlush(callback: (records: QueryRecord[]) => void): void {
    this.flushCallback = callback;
  }

  /**
   * Record a query execution. Called after every DB query.
   * This is the hot path — optimized for minimal overhead.
   */
  record(sql: string, durationMs: number): void {
    // Skip DDL, PRAGMA, and migration queries
    const trimmed = sql.trimStart().toUpperCase();
    if (
      trimmed.startsWith('CREATE') ||
      trimmed.startsWith('ALTER') ||
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('PRAGMA') ||
      trimmed.startsWith('BEGIN') ||
      trimmed.startsWith('COMMIT') ||
      trimmed.startsWith('ROLLBACK')
    ) {
      return;
    }

    // Skip queries on schema_intelligence tables (avoid self-referential loop)
    if (sql.includes('query_patterns') || sql.includes('schema_recommendations') || sql.includes('schema_optimization_history')) {
      return;
    }

    const template = normalizeQuery(sql);
    const hash = hashQuery(template);

    const existing = this.buffer.get(hash);
    if (existing) {
      existing.count++;
      existing.totalDurationMs += durationMs;
      existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
      existing.lastSeen = Date.now();
    } else {
      if (this.buffer.size >= MAX_BUFFER_SIZE) {
        // Evict least-used entry
        let minKey = '';
        let minCount = Infinity;
        for (const [key, record] of this.buffer) {
          if (record.count < minCount) {
            minCount = record.count;
            minKey = key;
          }
        }
        if (minKey) this.buffer.delete(minKey);
      }

      this.buffer.set(hash, {
        queryTemplate: template,
        queryHash: hash,
        tableNames: extractTableNames(sql),
        operationType: detectOperationType(sql),
        totalDurationMs: durationMs,
        maxDurationMs: durationMs,
        count: 1,
        lastSeen: Date.now(),
      });
    }

    this.pendingCount++;

    // Start periodic flush timer if not running
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    }

    // Flush if threshold reached
    if (this.pendingCount >= FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  /**
   * Flush buffered patterns to the database.
   */
  flush(): void {
    if (this.buffer.size === 0 || !this.flushCallback) return;

    const records = Array.from(this.buffer.values());
    this.pendingCount = 0;

    try {
      this.flushCallback(records);
    } catch (error) {
      // Never let flush errors propagate — this is a background operation
      console.error('[QueryPatternCollector] Flush error:', error);
    }

    // Clear buffer after successful flush
    this.buffer.clear();
  }

  /**
   * Get current buffer stats (for diagnostics).
   */
  getBufferStats(): { size: number; pending: number } {
    return { size: this.buffer.size, pending: this.pendingCount };
  }

  /**
   * Stop the collector and flush remaining data.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

/** Singleton collector instance */
export const queryPatternCollector = new QueryPatternCollector();
