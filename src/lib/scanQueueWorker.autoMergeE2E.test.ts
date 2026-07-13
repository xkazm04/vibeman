/**
 * Direction 3 — with the per-run auto-merge toggle ON, a queued item carrying
 * auto_merge_enabled=1 drives the worker to auto-accept exactly the eligible
 * (impact ≥ 8, effort ≤ 3) ideas the scan produced, end-to-end through the
 * queue path. The band is unchanged; ineligible ideas stay pending.
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
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { ScanQueueWorker } from './scanQueueWorker';

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE scan_queue (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, scan_type TEXT NOT NULL, context_id TEXT,
      trigger_type TEXT NOT NULL, trigger_metadata TEXT, status TEXT NOT NULL, priority INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0, progress_message TEXT, current_step TEXT, total_steps INTEGER,
      scan_id TEXT, result_summary TEXT, error_message TEXT, auto_merge_enabled INTEGER DEFAULT 0,
      auto_merge_status TEXT, started_at TEXT, completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE scan_notifications (
      id TEXT PRIMARY KEY, queue_item_id TEXT NOT NULL, project_id TEXT NOT NULL,
      notification_type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, data TEXT,
      read INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (queue_item_id) REFERENCES scan_queue(id) ON DELETE CASCADE
    );
    CREATE TABLE ideas (
      id TEXT PRIMARY KEY, scan_id TEXT NOT NULL, project_id TEXT NOT NULL, context_id TEXT,
      scan_type TEXT DEFAULT 'overall', category TEXT NOT NULL DEFAULT 'general', title TEXT NOT NULL,
      description TEXT, reasoning TEXT, status TEXT NOT NULL DEFAULT 'pending',
      user_feedback TEXT, user_pattern INTEGER DEFAULT 0, effort INTEGER, impact INTEGER, risk INTEGER,
      requirement_id TEXT, goal_id TEXT, implemented_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const PROJECT = 'proj-1';
const SCAN_ID = 'scan-am';

function addIdea(db: Database.Database, id: string, impact: number, effort: number) {
  db.prepare(`
    INSERT INTO ideas (id, scan_id, project_id, scan_type, category, title, status, impact, effort)
    VALUES (?, ?, ?, 'bug_hunter', 'general', ?, 'pending', ?, ?)
  `).run(id, SCAN_ID, PROJECT, `idea ${id}`, impact, effort);
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('ScanQueueWorker — auto-merge through the queue path', () => {
  let db: Database.Database;
  let worker: ScanQueueWorker;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createSchema(db);
    __setTestDatabase(db);
    executorMock.mockReset();
    executorMock.mockResolvedValue({ count: 2, scanId: SCAN_ID, unchanged: false });
    worker = new ScanQueueWorker();
  });

  afterEach(() => {
    worker.stop();
    __setTestDatabase(null);
    db.close();
  });

  it('auto-accepts only the eligible idea when the toggle is on', async () => {
    addIdea(db, 'eligible', 9, 2);   // impact ≥ 8, effort ≤ 3 → accepted
    addIdea(db, 'ineligible', 5, 5); // outside the band → stays pending

    scanQueueRepository.createQueueItem({
      id: 'q1',
      project_id: PROJECT,
      scan_type: 'bug_hunter',
      context_id: null,
      trigger_type: 'manual',
      auto_merge_enabled: true,
    });

    worker.start();

    await waitFor(() => scanQueueRepository.getQueueItemById('q1')?.auto_merge_status === 'completed');

    expect(ideaRepository.getIdeaById('eligible')!.status).toBe('accepted');
    expect(ideaRepository.getIdeaById('ineligible')!.status).toBe('pending');

    const notes = scanQueueRepository.getNotifications(PROJECT);
    expect(notes.some((n) => n.notification_type === 'auto_merge_completed')).toBe(true);
  });

  it('leaves ideas pending when the toggle is off (default)', async () => {
    addIdea(db, 'eligible', 9, 2);

    scanQueueRepository.createQueueItem({
      id: 'q2',
      project_id: PROJECT,
      scan_type: 'bug_hunter',
      context_id: null,
      trigger_type: 'manual',
      // auto_merge_enabled omitted → defaults to false
    });

    worker.start();
    await waitFor(() => scanQueueRepository.getQueueItemById('q2')?.status === 'completed');

    expect(ideaRepository.getIdeaById('eligible')!.status).toBe('pending');
    expect(scanQueueRepository.getQueueItemById('q2')!.auto_merge_status).toBeNull();
  });
});
