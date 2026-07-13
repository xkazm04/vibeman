/**
 * Direction 1 — worker behavior end-to-end against a real in-memory DB:
 *  - a queued item is processed to completion by a freshly-started worker with
 *    NO Ideas-UI involvement (start() is exactly what boot does)
 *  - maxConcurrent is configurable and >1 genuinely runs scans in parallel
 *
 * The LLM executor and the project registry are mocked; everything else (queue
 * repository, notifications, claim/complete CAS) is the real code path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

const { executorMock } = vi.hoisted(() => ({ executorMock: vi.fn() }));

vi.mock('@/app/features/Ideas/sub_IdeasSetup/lib/ideaExecutor', () => ({
  executeLlmScan: executorMock,
}));
vi.mock('@/lib/project_database', () => ({
  projectDb: { projects: { get: () => ({ name: 'proj', path: '/tmp/proj' }) } },
}));

import { __setTestDatabase } from '@/app/db/connection';
import { scanQueueRepository } from '@/app/db/repositories/scanQueue.repository';
import { ScanQueueWorker } from './scanQueueWorker';

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

function enqueue(id: string) {
  return scanQueueRepository.createQueueItem({
    id,
    project_id: PROJECT,
    scan_type: 'bug_hunter',
    context_id: null,
    trigger_type: 'manual',
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('ScanQueueWorker — boot processing & concurrency', () => {
  let db: Database.Database;
  let worker: ScanQueueWorker;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createSchema(db);
    __setTestDatabase(db);
    executorMock.mockReset();
    worker = new ScanQueueWorker();
  });

  afterEach(() => {
    worker.stop();
    __setTestDatabase(null);
    db.close();
  });

  it('processes a queued item to completion with no UI visit', async () => {
    executorMock.mockResolvedValue({ count: 2, scanId: 'scan-1', unchanged: false });
    enqueue('q1');

    // start() is exactly what schema.postinit's boot hook calls — no Ideas screen.
    worker.start({ recoverAllRunning: true });

    await waitFor(() => scanQueueRepository.getQueueItemById('q1')?.status === 'completed');

    const row = scanQueueRepository.getQueueItemById('q1')!;
    expect(row.status).toBe('completed');
    expect(row.scan_id).toBe('scan-1');

    const notes = scanQueueRepository.getNotifications(PROJECT);
    expect(notes.some((n) => n.notification_type === 'scan_completed')).toBe(true);
  });

  it('runs >1 scan concurrently when maxConcurrent is raised', async () => {
    const releasers: Array<() => void> = [];
    executorMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          const i = releasers.length;
          releasers.push(() => resolve({ count: 1, scanId: `scan-${i}`, unchanged: false }));
        })
    );

    enqueue('a');
    enqueue('b');

    worker.start({ maxConcurrent: 2 });

    // Both scans are dispatched and in-flight simultaneously (neither resolved yet).
    await waitFor(() => releasers.length === 2);
    expect(worker.getStatus().config.maxConcurrent).toBe(2);
    expect(worker.getStatus().currentlyProcessing).toBe(2);
    expect(scanQueueRepository.getQueueItemById('a')!.status).toBe('running');
    expect(scanQueueRepository.getQueueItemById('b')!.status).toBe('running');

    // Release both; both complete.
    releasers.forEach((r) => r());
    await waitFor(
      () =>
        scanQueueRepository.getQueueItemById('a')?.status === 'completed' &&
        scanQueueRepository.getQueueItemById('b')?.status === 'completed'
    );
  });
});
