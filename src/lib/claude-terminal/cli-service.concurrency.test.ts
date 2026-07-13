/**
 * Concurrency-gate tests for the terminal engine.
 *
 * Verifies that spawn attempts beyond the global cap are DEFERRED (queued)
 * rather than throwing task-failure, and that a freed slot promotes the next
 * queued execution. child_process.spawn and the session repository are mocked
 * so no real CLI process or database is touched.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

const hoisted = vi.hoisted(() => {
  const children: Array<EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; pid: number }> = [];
  return { children };
});

vi.mock('child_process', () => ({
  spawn: () => {
    const cp = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      stdin: { write: () => void; end: () => void; destroyed: boolean };
      pid: number;
      killed: boolean;
    };
    cp.stdout = new EventEmitter();
    cp.stderr = new EventEmitter();
    cp.stdin = { write: () => {}, end: () => {}, destroyed: false };
    cp.pid = 20000 + hoisted.children.length;
    cp.killed = false;
    hoisted.children.push(cp);
    return cp;
  },
  execSync: () => '',
}));

// Keep the DB entirely out of the picture — the liveness-token writes are best
// effort and irrelevant to the gating logic under test.
vi.mock('@/app/db/repositories/session.repository', () => ({
  sessionRepository: {
    createTerminalSession: () => ({ id: 'db-token' }),
    updatePid: () => true,
    updateClaudeSessionId: () => null,
    updateHeartbeat: () => 'updated',
    delete: () => true,
  },
}));

import {
  startExecution,
  getPendingExecutionCount,
  getExecution,
} from './cli-service';
import { MAX_CONCURRENT_EXECUTIONS } from './types';

const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-conc-'));

describe('terminal engine concurrency gate', () => {
  beforeEach(() => {
    hoisted.children.length = 0;
  });

  it('defers spawns beyond the cap instead of throwing, and promotes on free slot', () => {
    const cap = MAX_CONCURRENT_EXECUTIONS;
    const total = cap + 2;
    const ids: string[] = [];

    // Launch cap + 2 executions. None should throw.
    for (let i = 0; i < total; i++) {
      expect(() => {
        ids.push(startExecution(projectPath, `prompt ${i}`));
      }).not.toThrow();
    }

    // Exactly `cap` processes were spawned; the remaining 2 are queued.
    expect(hoisted.children.length).toBe(cap);
    expect(getPendingExecutionCount()).toBe(2);

    // The queued executions exist and are registered (running, no process yet).
    const queuedId = ids[cap];
    const queuedExec = getExecution(queuedId);
    expect(queuedExec?.status).toBe('running');
    expect(queuedExec?.process).toBeNull();

    // Finish one running execution → a slot frees → next queued one spawns.
    hoisted.children[0].emit('close', 0);

    expect(hoisted.children.length).toBe(cap + 1); // one promoted spawn
    expect(getPendingExecutionCount()).toBe(1);
    expect(getExecution(queuedId)?.process).not.toBeNull();

    // Finish another → last queued promoted, queue drains to empty.
    hoisted.children[1].emit('close', 0);
    expect(getPendingExecutionCount()).toBe(0);
    expect(hoisted.children.length).toBe(cap + 2);
  });
});
