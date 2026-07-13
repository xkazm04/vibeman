/**
 * Direction 2 — goal lifecycle brain signals.
 * Goal create / state-change / complete / delete must emit
 * recordGoalLifecycleSignal so WEIGHT_GOAL_TRANSITION gets real data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { recordGoalLifecycleSignal, recordContextFocus, goalRepo } = vi.hoisted(() => ({
  recordGoalLifecycleSignal: vi.fn(),
  recordContextFocus: vi.fn(),
  goalRepo: {
    createGoal: vi.fn((input: Record<string, unknown>) => ({ ...input })),
    getMaxOrderIndex: vi.fn(() => 0),
    getGoalById: vi.fn(() => ({ id: 'g1', project_id: 'p1', context_id: 'c1', title: 'My goal', status: 'open' })),
    updateGoal: vi.fn((id: string, updates: Record<string, unknown>) => ({
      id, project_id: 'p1', context_id: 'c1', title: 'My goal', status: updates.status ?? 'open',
    })),
    deleteGoal: vi.fn(() => true),
  },
}));

vi.mock('@/lib/brain/signalCollector', () => ({
  signalCollector: { recordGoalLifecycleSignal, recordContextFocus },
}));
vi.mock('@/app/db/repositories/goal.repository', () => ({ goalRepository: goalRepo }));

vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));
vi.mock('@/lib/api-helpers/accessControl', () => ({ checkProjectAccess: () => null }));
vi.mock('@/lib/supabase/goalSync', () => ({
  fireAndForgetSync: vi.fn(),
  syncGoalToSupabase: vi.fn(),
  deleteGoalFromSupabase: vi.fn(),
}));
vi.mock('@/lib/github', () => ({
  fireAndForgetGitHubSync: vi.fn(),
  syncGoalToGitHub: vi.fn(),
  deleteGoalFromGitHub: vi.fn(),
}));
vi.mock('@/lib/goals', () => ({ fireAndForgetGoalAnalysis: vi.fn() }));
vi.mock('@/lib/project_database', () => ({ projectDb: { getProject: () => ({ path: '/tmp/p' }) } }));

import { POST, PUT, DELETE } from './route';

const post = (body: unknown) =>
  (POST as (r: NextRequest) => Promise<Response>)(
    new NextRequest('http://localhost/api/goals', { method: 'POST', body: JSON.stringify(body) })
  );
const put = (body: unknown) =>
  (PUT as (r: NextRequest) => Promise<Response>)(
    new NextRequest('http://localhost/api/goals', { method: 'PUT', body: JSON.stringify(body) })
  );
const del = (qs: string) =>
  (DELETE as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost/api/goals?${qs}`, { method: 'DELETE' })
  );

describe('goal lifecycle brain signals', () => {
  beforeEach(() => {
    recordGoalLifecycleSignal.mockClear();
  });

  it('emits a goal_created signal on create (no transition)', async () => {
    const res = await post({ projectId: 'p1', title: 'My goal', contextId: 'c1', createAnalysis: false });
    expect(res.status).toBe(200);
    expect(recordGoalLifecycleSignal).toHaveBeenCalledTimes(1);
    const [projectId, data] = recordGoalLifecycleSignal.mock.calls[0];
    expect(projectId).toBe('p1');
    expect(data.signalType).toBe('goal_created');
    expect(data.transition).toBeUndefined();
    expect(data.contextId).toBe('c1');
  });

  it('emits a goal_state_change with transition when status moves', async () => {
    goalRepo.getGoalById.mockReturnValueOnce({ id: 'g1', project_id: 'p1', context_id: 'c1', title: 'My goal', status: 'open' });
    const res = await put({ id: 'g1', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(recordGoalLifecycleSignal).toHaveBeenCalledTimes(1);
    const [, data] = recordGoalLifecycleSignal.mock.calls[0];
    expect(data.signalType).toBe('goal_state_change');
    expect(data.transition).toEqual({ from: 'open', to: 'in_progress' });
    expect(data.progress).toBe(50);
  });

  it('emits goal_completed when status moves to done', async () => {
    goalRepo.getGoalById.mockReturnValueOnce({ id: 'g1', project_id: 'p1', context_id: 'c1', title: 'My goal', status: 'in_progress' });
    const res = await put({ id: 'g1', status: 'done' });
    expect(res.status).toBe(200);
    const [, data] = recordGoalLifecycleSignal.mock.calls[0];
    expect(data.signalType).toBe('goal_completed');
    expect(data.progress).toBe(100);
  });

  it('does NOT emit when status is unchanged', async () => {
    goalRepo.getGoalById.mockReturnValueOnce({ id: 'g1', project_id: 'p1', context_id: 'c1', title: 'My goal', status: 'open' });
    const res = await put({ id: 'g1', title: 'renamed only' });
    expect(res.status).toBe(200);
    expect(recordGoalLifecycleSignal).not.toHaveBeenCalled();
  });

  it('emits a goal_deleted signal on delete', async () => {
    const res = await del('id=g1');
    expect(res.status).toBe(200);
    expect(recordGoalLifecycleSignal).toHaveBeenCalledTimes(1);
    const [, data] = recordGoalLifecycleSignal.mock.calls[0];
    expect(data.signalType).toBe('goal_deleted');
  });
});
