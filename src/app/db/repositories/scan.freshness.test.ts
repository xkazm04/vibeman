/**
 * Scan-freshness persistence tests: per-scan content_hash round-trips and the
 * (project, scanType, context) lookup returns the most recent hashed scan.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '../connection';
import { scanRepository } from './scan.repository';

function createScansTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE scans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      provider TEXT,
      model TEXT,
      context_id TEXT,
      content_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const PROJECT = 'proj-1';

describe('scanRepository — content-hash freshness', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    createScansTable(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
  });

  it('records and reads back a per-scan content hash for a context', () => {
    scanRepository.createScan({
      id: 's1',
      project_id: PROJECT,
      scan_type: 'zen_architect',
      context_id: 'ctx-1',
      content_hash: 'hash-A',
    });
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-1')).toBe('hash-A');
  });

  it('returns null when there is no prior hashed scan', () => {
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-1')).toBeNull();
  });

  it('scopes the lookup by context', () => {
    scanRepository.createScan({ id: 's1', project_id: PROJECT, scan_type: 'zen_architect', context_id: 'ctx-1', content_hash: 'hash-A' });
    scanRepository.createScan({ id: 's2', project_id: PROJECT, scan_type: 'zen_architect', context_id: 'ctx-2', content_hash: 'hash-B' });
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-1')).toBe('hash-A');
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-2')).toBe('hash-B');
  });

  it('scopes by scan type', () => {
    scanRepository.createScan({ id: 's1', project_id: PROJECT, scan_type: 'zen_architect', context_id: 'ctx-1', content_hash: 'hash-A' });
    expect(scanRepository.getLatestContentHash(PROJECT, 'bug_hunter', 'ctx-1')).toBeNull();
  });

  it('returns the most recent hash when a context is re-scanned', () => {
    scanRepository.createScan({ id: 's1', project_id: PROJECT, scan_type: 'zen_architect', context_id: 'ctx-1', content_hash: 'hash-old' });
    // Force a strictly later timestamp so ORDER BY timestamp DESC is unambiguous.
    db.prepare("UPDATE scans SET timestamp = '2000-01-01T00:00:00.000Z' WHERE id = 's1'").run();
    scanRepository.createScan({ id: 's2', project_id: PROJECT, scan_type: 'zen_architect', context_id: 'ctx-1', content_hash: 'hash-new' });
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-1')).toBe('hash-new');
  });

  it('matches project-wide (null context) scans distinctly from context scans', () => {
    scanRepository.createScan({ id: 's1', project_id: PROJECT, scan_type: 'zen_architect', context_id: null, content_hash: 'hash-proj' });
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', null)).toBe('hash-proj');
    expect(scanRepository.getLatestContentHash(PROJECT, 'zen_architect', 'ctx-1')).toBeNull();
  });
});
