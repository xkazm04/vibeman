/**
 * File watcher — the three behaviors the drift-gate feed depends on:
 *  1. Enabled watchers rehydrate at boot (a fresh manager re-attaches them),
 *     disabled configs are skipped — a configured watcher survives a restart.
 *  2. A burst of edits collapses into ONE queue item whose trigger_metadata
 *     lists ALL changed files (not just the last event's file).
 *  3. Auto-triggered queue items never enable auto-merge and carry no force flag,
 *     so the worker runs them force=false and the round-1 drift gate governs cost.
 *
 * chokidar and the project registry are mocked; the scan-queue repository runs
 * against a real in-memory SQLite DB (the true createQueueItem/notification path).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// ── Mocks ────────────────────────────────────────────────────────────────
type ChangeHandler = (path: string) => void;

const { chokidarState } = vi.hoisted(() => ({
  chokidarState: {
    handlers: new Map<string, ChangeHandler>(),
    watchCalls: [] as Array<{ patterns: string[] }>,
    closed: 0,
  },
}));

vi.mock('chokidar', () => ({
  default: {
    watch: (patterns: string[]) => {
      chokidarState.watchCalls.push({ patterns });
      const watcher = {
        on(event: string, handler: ChangeHandler) {
          chokidarState.handlers.set(event, handler);
          return watcher;
        },
        close() {
          chokidarState.closed++;
          return Promise.resolve();
        },
      };
      return watcher;
    },
  },
}));

const { projectGet } = vi.hoisted(() => ({ projectGet: vi.fn() }));
vi.mock('@/lib/project_database', () => ({
  projectDb: { projects: { get: projectGet } },
}));

// Keep the worker inert — we only assert on the DB rows it would consume.
vi.mock('@/lib/scanQueueWorker', () => ({
  scanQueueWorker: { start: vi.fn(), notifyNewItem: vi.fn() },
}));

import { __setTestDatabase } from '@/app/db/connection';
import { scanQueueRepository } from '@/app/db/repositories/scanQueue.repository';
import { FileWatcherManager } from './fileWatcher';

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
    CREATE TABLE file_watch_config (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      watch_patterns TEXT NOT NULL,
      ignore_patterns TEXT,
      scan_types TEXT NOT NULL,
      debounce_ms INTEGER DEFAULT 5000,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

const PROJECT = 'proj-1';

describe('FileWatcherManager', () => {
  let db: Database.Database;
  let manager: FileWatcherManager;

  beforeEach(() => {
    vi.useFakeTimers();
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createSchema(db);
    __setTestDatabase(db);

    chokidarState.handlers.clear();
    chokidarState.watchCalls = [];
    chokidarState.closed = 0;
    projectGet.mockReset();
    projectGet.mockReturnValue({ id: PROJECT, name: 'Proj', path: '/tmp/proj' });

    manager = new FileWatcherManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    __setTestDatabase(null);
    db.close();
  });

  it('rehydrates enabled watchers at boot and skips disabled ones', () => {
    scanQueueRepository.upsertFileWatchConfig({
      id: 'watch-a', project_id: PROJECT, enabled: true,
      watch_patterns: ['src/**/*.ts'], scan_types: ['bug_hunter'], debounce_ms: 5000,
    });
    scanQueueRepository.upsertFileWatchConfig({
      id: 'watch-b', project_id: 'proj-2', enabled: false,
      watch_patterns: ['src/**/*.ts'], scan_types: ['bug_hunter'], debounce_ms: 5000,
    });

    // A fresh manager stands in for a fresh process after a restart.
    const started = manager.rehydrateWatchers();

    expect(started).toBe(1);
    expect(manager.isWatching(PROJECT)).toBe(true);
    expect(manager.isWatching('proj-2')).toBe(false);
    expect(chokidarState.watchCalls).toHaveLength(1);
  });

  it('collapses an edit burst into ONE queue item listing ALL changed files', () => {
    scanQueueRepository.upsertFileWatchConfig({
      id: 'watch-a', project_id: PROJECT, enabled: true,
      watch_patterns: ['src/**/*.ts'], scan_types: ['bug_hunter'], debounce_ms: 5000,
    });
    manager.startWatching(PROJECT, '/tmp/proj');

    const onChange = chokidarState.handlers.get('change')!;
    const onAdd = chokidarState.handlers.get('add')!;
    expect(onChange).toBeTypeOf('function');

    // A burst: three distinct files touched inside the debounce window.
    onChange('/tmp/proj/src/a.ts');
    onChange('/tmp/proj/src/b.ts');
    onAdd('/tmp/proj/src/c.ts');
    onChange('/tmp/proj/src/a.ts'); // duplicate — must not double-count

    // Nothing enqueued until the debounce settles.
    expect(scanQueueRepository.getQueueByProject(PROJECT)).toHaveLength(0);

    vi.advanceTimersByTime(5000);

    const items = scanQueueRepository.getQueueByProject(PROJECT);
    expect(items).toHaveLength(1);

    const meta = JSON.parse(items[0].trigger_metadata!);
    expect(items[0].trigger_type).toBe('file_change');
    expect(new Set(meta.files)).toEqual(
      new Set(['/tmp/proj/src/a.ts', '/tmp/proj/src/b.ts', '/tmp/proj/src/c.ts']),
    );
    expect(meta.fileCount).toBe(3);
    expect(meta).not.toHaveProperty('force');
  });

  it('never enables auto-merge on watcher-triggered items (drift gate is the cost control)', () => {
    scanQueueRepository.upsertFileWatchConfig({
      id: 'watch-a', project_id: PROJECT, enabled: true,
      watch_patterns: ['src/**/*.ts'], scan_types: ['bug_hunter'], debounce_ms: 1000,
    });
    manager.startWatching(PROJECT, '/tmp/proj');

    chokidarState.handlers.get('change')!('/tmp/proj/src/a.ts');
    vi.advanceTimersByTime(1000);

    const item = scanQueueRepository.getQueueByProject(PROJECT)[0];
    // force=false path: worker calls executeLlmScan with no force override, so the
    // content-hash drift gate governs whether an unchanged context actually scans.
    expect(item.auto_merge_enabled).toBe(0);
  });
});
