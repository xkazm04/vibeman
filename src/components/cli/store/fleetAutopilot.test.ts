/**
 * Rate-limit-aware fleet autopilot tests.
 *
 * Drives the orchestration in cliExecutionManager with a fake execution
 * strategy (no network / no real CLI) so the pause-gate and auto-resume logic
 * are exercised deterministically.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerStrategy, type ExecutionStrategy, type ExecutionEventHandler } from '@/app/features/TaskRunner/lib/executionStrategy';
import { useCLISessionStore, type CLISessionId } from './cliSessionStore';
import { useFleetAutopilotStore } from './fleetAutopilotStore';
import { createQueuedStatus } from '@/app/features/TaskRunner/lib/types';
import type { QueuedTask } from '../types';

// ── Fake strategy: records launches, lets the test drive completion ──
const launches: string[] = [];
const streamHandlers = new Map<string, ExecutionEventHandler>();

class FakeStrategy implements ExecutionStrategy {
  readonly name = 'fake';
  readonly capabilities = ['stream', 'status'] as const;
  async execute(task: { id: string }) {
    launches.push(task.id);
    return { success: true, executionId: `exec-${task.id}`, streamUrl: 'x' };
  }
  async cancel() { return true; }
  stream(executionId: string, onEvent: ExecutionEventHandler) {
    streamHandlers.set(executionId, onEvent);
    return () => streamHandlers.delete(executionId);
  }
  cleanup() {}
}

/** Fire a synthetic 'result' event to complete a launched task. */
function completeTask(taskId: string) {
  const handler = streamHandlers.get(`exec-${taskId}`);
  handler?.({ type: 'result', data: { data: { sessionId: 'sess-x' } }, timestamp: Date.now() });
}

const flush = () => Promise.resolve().then(() => Promise.resolve());

function makeTask(id: string): QueuedTask {
  return {
    id,
    projectId: '',            // empty → skips remoteEvents network in handleTaskComplete
    projectPath: '/tmp/proj',
    projectName: 'proj',
    requirementName: id,
    status: createQueuedStatus(),
    addedAt: Date.now(),
    directPrompt: `do ${id}`,
  };
}

const SESSION: CLISessionId = 'cliSession1';

function seedSession(taskIds: string[]) {
  useCLISessionStore.setState((state) => ({
    sessions: {
      ...state.sessions,
      [SESSION]: {
        ...state.sessions[SESSION],
        projectPath: '/tmp/proj',
        projectId: 'p1',
        provider: 'claude',
        autoStart: true,
        isRunning: true,
        queue: taskIds.map(makeTask),
      },
    },
  }));
}

// Imported after the fake is defined so registration wins over the real one.
import {
  executeReadyTasks,
  pauseFleetForRateLimit,
  resumeFleet,
  clearSessionStrategy,
} from './cliExecutionManager';

describe('fleet autopilot', () => {
  beforeEach(() => {
    registerStrategy('terminal', () => new FakeStrategy());
    clearSessionStrategy(SESSION);
    launches.length = 0;
    streamHandlers.clear();
    useFleetAutopilotStore.getState().clearPause();
    useFleetAutopilotStore.setState({ backoffLevel: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    resumeFleet(); // clear any pending timer
    useFleetAutopilotStore.getState().clearPause();
  });

  it('a structured rate-limit event pauses all pending launches', () => {
    seedSession(['t1', 't2', 't3']);

    // Fleet is paused first (as the stream handler would do on a rate_limit event).
    pauseFleetForRateLimit({ retryAfterMs: 60_000, reason: 'overage', taskId: 't1' });

    const fleet = useFleetAutopilotStore.getState();
    expect(fleet.paused).toBe(true);
    expect(fleet.resumeAt).toBeGreaterThan(Date.now());
    expect(fleet.waitingTaskIds).toContain('t1');

    // With the fleet paused, no launches happen.
    executeReadyTasks(SESSION);
    expect(launches).toHaveLength(0);

    // Tasks remain queued (not failed).
    const q = useCLISessionStore.getState().sessions[SESSION].queue;
    expect(q.every((t) => t.status.type === 'queued')).toBe(true);
  });

  it('uses exponential backoff (from 60s) when the event carries no ETA', () => {
    seedSession(['t1']);
    const before = Date.now();
    pauseFleetForRateLimit({ reason: 'no eta' });
    const fleet = useFleetAutopilotStore.getState();
    // First ETA-less pause → ~60s window, backoffLevel escalates to 1.
    expect(fleet.resumeAt! - before).toBeGreaterThanOrEqual(60_000);
    expect(fleet.resumeAt! - before).toBeLessThan(61_000);
    expect(fleet.backoffLevel).toBe(1);
  });

  it('auto-resumes after the window and completes the remaining tasks', async () => {
    vi.useFakeTimers();
    seedSession(['t1', 't2']);

    // Paused → no launches yet.
    pauseFleetForRateLimit({ retryAfterMs: 60_000, taskId: 't1' });
    executeReadyTasks(SESSION);
    expect(launches).toHaveLength(0);

    // Advance past the window → auto-resume fires and relaunches queued work.
    await vi.advanceTimersByTimeAsync(60_000);
    await flush();

    expect(useFleetAutopilotStore.getState().paused).toBe(false);
    expect(launches).toEqual(expect.arrayContaining(['t1', 't2']));
    expect(launches).toHaveLength(2);

    // Drive both launched tasks to completion via the fake stream.
    completeTask('t1');
    completeTask('t2');
    await flush();

    const queue = useCLISessionStore.getState().sessions[SESSION].queue;
    for (const t of queue) {
      expect(t.status.type).toBe('completed');
    }
  });
});
