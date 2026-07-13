/**
 * Direction 1 — "a worker that survives everything" repository guarantees:
 *  - resetAllRunning recovers a crashed 'running' row regardless of age
 *  - completeWithScan links the scan + completes atomically, and a mid-run
 *    cancel makes it a no-op (the cancel-vs-completion race is closed)
 *  - cleanupOldItemsAllProjects prunes old terminal rows + cascades their
 *    notifications, but spares any row still carrying an UNREAD notification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '../connection';
import { scanQueueRepository } from './scanQueue.repository';

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE scan_queue (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      context_id TEXT,
      trigger_type TEXT NOT NULL,
      trigger_metadata TEXT,
      status TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      progress_message TEXT,
      current_step TEXT,
      total_steps INTEGER,
      scan_id TEXT,
      result_summary TEXT,
      error_message TEXT,
      auto_merge_enabled INTEGER DEFAULT 0,
      auto_merge_status TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE scan_notifications (
      id TEXT PRIMARY KEY,
      queue_item_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (queue_item_id) REFERENCES scan_queue(id) ON DELETE CASCADE
    );
  `);
}

const PROJECT = 'proj-1';

function insertItem(
  db: Database.Database,
  overrides: Partial<{
    id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    scan_id: string | null;
  }> = {}
) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO scan_queue (id, project_id, scan_type, trigger_type, status, started_at, completed_at, scan_id, created_at, updated_at)
    VALUES (@id, @project_id, 'bug_hunter', 'manual', @status, @started_at, @completed_at, @scan_id, @created_at, @updated_at)
  `).run({
    id: overrides.id ?? 'q1',
    project_id: PROJECT,
    status: overrides.status ?? 'running',
    started_at: overrides.started_at ?? now,
    completed_at: overrides.completed_at ?? null,
    scan_id: overrides.scan_id ?? null,
    created_at: now,
    updated_at: now,
  });
}

describe('scanQueue robustness', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createSchema(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
  });

  describe('resetAllRunning', () => {
    it('recovers a freshly-crashed running row that age-based recovery would miss', () => {
      // started_at = NOW → younger than the 10-min stale threshold.
      insertItem(db, { id: 'q1', status: 'running', started_at: new Date().toISOString() });

      // Age-based recovery leaves a fresh row alone...
      expect(scanQueueRepository.resetOrphanedRunning(10)).toBe(0);
      expect(scanQueueRepository.getQueueItemById('q1')!.status).toBe('running');

      // ...but boot recovery requeues it regardless of age.
      expect(scanQueueRepository.resetAllRunning()).toBe(1);
      const row = scanQueueRepository.getQueueItemById('q1')!;
      expect(row.status).toBe('queued');
      expect(row.started_at).toBeNull();
    });

    it('only touches running rows', () => {
      insertItem(db, { id: 'q1', status: 'running' });
      insertItem(db, { id: 'q2', status: 'completed', completed_at: new Date().toISOString() });
      insertItem(db, { id: 'q3', status: 'queued', started_at: null });

      expect(scanQueueRepository.resetAllRunning()).toBe(1);
      expect(scanQueueRepository.getQueueItemById('q2')!.status).toBe('completed');
      expect(scanQueueRepository.getQueueItemById('q3')!.status).toBe('queued');
    });
  });

  describe('completeWithScan (cancel-vs-completion race)', () => {
    it('links the scan and completes in one write when still running', () => {
      insertItem(db, { id: 'q1', status: 'running' });

      const result = scanQueueRepository.completeWithScan('q1', 'scan-99', 'Generated 4 ideas', 'running');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('completed');
      expect(result!.scan_id).toBe('scan-99');
      expect(result!.result_summary).toBe('Generated 4 ideas');
      expect(result!.completed_at).not.toBeNull();
    });

    it('is a no-op when the item was cancelled mid-run — cancel is not clobbered', () => {
      insertItem(db, { id: 'q1', status: 'running' });
      // User cancels while the worker is still finishing.
      scanQueueRepository.updateStatus('q1', 'cancelled');

      const result = scanQueueRepository.completeWithScan('q1', 'scan-99', 'Generated 4 ideas', 'running');
      expect(result).toBeNull();

      const row = scanQueueRepository.getQueueItemById('q1')!;
      expect(row.status).toBe('cancelled');
      // The cancelled row was NOT stamped with this run's scan.
      expect(row.scan_id).toBeNull();
      expect(row.result_summary).toBeNull();
    });

    it('preserves an existing scan_id when passed a null scanId', () => {
      insertItem(db, { id: 'q1', status: 'running', scan_id: 'pre-existing' });
      const result = scanQueueRepository.completeWithScan('q1', null, undefined, 'running');
      expect(result!.scan_id).toBe('pre-existing');
      expect(result!.status).toBe('completed');
    });
  });

  describe('cleanupOldItemsAllProjects', () => {
    const OLD = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const RECENT = new Date().toISOString();

    function addNotification(queueItemId: string, read: number) {
      db.prepare(`
        INSERT INTO scan_notifications (id, queue_item_id, project_id, notification_type, title, message, read)
        VALUES (?, ?, ?, 'scan_completed', 't', 'm', ?)
      `).run(`n-${queueItemId}`, queueItemId, PROJECT, read);
    }

    it('prunes old terminal rows and cascades their read notifications', () => {
      insertItem(db, { id: 'old-read', status: 'completed', completed_at: OLD });
      addNotification('old-read', 1); // read

      const pruned = scanQueueRepository.cleanupOldItemsAllProjects(30);
      expect(pruned).toBe(1);
      expect(scanQueueRepository.getQueueItemById('old-read')).toBeNull();
      // Cascade removed the notification.
      const remaining = db.prepare('SELECT COUNT(*) AS c FROM scan_notifications').get() as { c: number };
      expect(remaining.c).toBe(0);
    });

    it('spares an old terminal row that still has an UNREAD notification', () => {
      insertItem(db, { id: 'old-unread', status: 'failed', completed_at: OLD });
      addNotification('old-unread', 0); // unread

      expect(scanQueueRepository.cleanupOldItemsAllProjects(30)).toBe(0);
      expect(scanQueueRepository.getQueueItemById('old-unread')).not.toBeNull();
    });

    it('leaves recent terminal rows and non-terminal rows untouched', () => {
      insertItem(db, { id: 'recent', status: 'completed', completed_at: RECENT });
      insertItem(db, { id: 'running', status: 'running' });

      expect(scanQueueRepository.cleanupOldItemsAllProjects(30)).toBe(0);
      expect(scanQueueRepository.getQueueItemById('recent')).not.toBeNull();
      expect(scanQueueRepository.getQueueItemById('running')).not.toBeNull();
    });
  });
});
