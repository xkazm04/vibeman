import { describe, it, expect } from 'vitest';
import {
  resolveDownstreamStage,
  indexTasksByRequirement,
  type DownstreamTask,
} from './downstreamStage';
import type { DbIdea } from '@/app/db/models/types';

const idea = (over: Partial<DbIdea>): Pick<DbIdea, 'status' | 'requirement_id'> => ({
  status: 'accepted',
  requirement_id: 'idea-abcd1234-fix',
  ...over,
} as DbIdea);

describe('resolveDownstreamStage', () => {
  it('returns null for a pending idea with no requirement', () => {
    expect(resolveDownstreamStage(idea({ status: 'pending', requirement_id: null }))).toBeNull();
  });

  it('shows "Requirement" when accepted but no task has run', () => {
    const s = resolveDownstreamStage(idea({ status: 'accepted' }), null);
    expect(s?.key).toBe('requirement');
    expect(s?.step).toBe(0);
  });

  it('maps live task statuses to the ladder', () => {
    expect(resolveDownstreamStage(idea({}), { requirementName: 'x', status: 'pending' })?.key).toBe('queued');
    expect(resolveDownstreamStage(idea({}), { requirementName: 'x', status: 'running' })?.key).toBe('running');
    expect(resolveDownstreamStage(idea({}), { requirementName: 'x', status: 'completed' })?.key).toBe('done');
    expect(resolveDownstreamStage(idea({}), { requirementName: 'x', status: 'failed' })?.key).toBe('failed');
    expect(resolveDownstreamStage(idea({}), { requirementName: 'x', status: 'session-limit' })?.key).toBe('failed');
  });

  it('treats an implemented idea as done even without a live task', () => {
    expect(resolveDownstreamStage(idea({ status: 'implemented' }), null)?.key).toBe('done');
  });

  it('treats an implemented idea with no requirement link as done', () => {
    expect(resolveDownstreamStage(idea({ status: 'implemented', requirement_id: null }), null)?.key).toBe('done');
  });
});

describe('indexTasksByRequirement', () => {
  it('keeps the most active task per requirement', () => {
    const tasks: DownstreamTask[] = [
      { requirementName: 'req-a', status: 'completed' },
      { requirementName: 'req-a', status: 'running' },
      { requirementName: 'req-b', status: 'pending' },
    ];
    const map = indexTasksByRequirement(tasks);
    expect(map.get('req-a')?.status).toBe('running');
    expect(map.get('req-b')?.status).toBe('pending');
  });

  it('ignores tasks without a requirement name', () => {
    const map = indexTasksByRequirement([{ requirementName: '', status: 'running' }]);
    expect(map.size).toBe(0);
  });
});
