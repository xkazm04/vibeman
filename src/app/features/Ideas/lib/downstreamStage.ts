/**
 * Idea → requirement → task downstream ladder (Direction 3).
 *
 * Once an idea is accepted, `idea.requirement_id` holds the requirement file
 * name (set atomically by the acceptance workflow — it survives reload). This
 * module resolves the HONEST downstream stage of that requirement by matching
 * it against the live Claude-Code execution tasks. We only ever report a stage
 * we can actually resolve:
 *   - a matching execution task → its real status (queued/running/done/failed)
 *   - no task but idea is 'implemented' → done (minimal valid ladder)
 *   - no task, requirement exists → 'requirement' (created, not yet run)
 *   - otherwise → null (no downstream to show)
 */

import type { DbIdea } from '@/app/db/models/types';

/** Minimal shape of a Claude-Code execution task we depend on. */
export interface DownstreamTask {
  requirementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
}

export type DownstreamStageKey = 'requirement' | 'queued' | 'running' | 'done' | 'failed';

export interface DownstreamStage {
  key: DownstreamStageKey;
  label: string;
  /** Index in the ladder for ordering/progress (0..3). */
  step: number;
}

const STAGE_LABEL: Record<DownstreamStageKey, string> = {
  requirement: 'Requirement',
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
};

const STAGE_STEP: Record<DownstreamStageKey, number> = {
  requirement: 0,
  queued: 1,
  running: 2,
  done: 3,
  failed: 2,
};

function stage(key: DownstreamStageKey): DownstreamStage {
  return { key, label: STAGE_LABEL[key], step: STAGE_STEP[key] };
}

/**
 * Resolve the downstream stage for an idea, given its matching execution task
 * (if any). Returns null when there is nothing honest to show.
 */
export function resolveDownstreamStage(
  idea: Pick<DbIdea, 'status' | 'requirement_id'>,
  task?: DownstreamTask | null
): DownstreamStage | null {
  // No requirement link → nothing downstream yet (idea not accepted).
  if (!idea.requirement_id) {
    // An implemented idea with no link is still terminally done.
    return idea.status === 'implemented' ? stage('done') : null;
  }

  if (task) {
    switch (task.status) {
      case 'running':
        return stage('running');
      case 'pending':
        return stage('queued');
      case 'completed':
        return stage('done');
      case 'failed':
      case 'session-limit':
        return stage('failed');
    }
  }

  // No live task. If the idea itself is implemented, it's done.
  if (idea.status === 'implemented') return stage('done');

  // Requirement exists but hasn't been run.
  return stage('requirement');
}

/**
 * Build a lookup of requirementName → task from a task list, keeping the most
 * advanced/active task per requirement (running > pending > terminal, newest last).
 */
export function indexTasksByRequirement(tasks: DownstreamTask[]): Map<string, DownstreamTask> {
  const map = new Map<string, DownstreamTask>();
  for (const task of tasks) {
    if (!task.requirementName) continue;
    const existing = map.get(task.requirementName);
    // Prefer an active (running/pending) task over a terminal one.
    if (!existing || rank(task.status) > rank(existing.status)) {
      map.set(task.requirementName, task);
    }
  }
  return map;
}

function rank(status: DownstreamTask['status']): number {
  switch (status) {
    case 'running': return 3;
    case 'pending': return 2;
    case 'failed':
    case 'session-limit': return 1;
    case 'completed': return 0;
  }
}
