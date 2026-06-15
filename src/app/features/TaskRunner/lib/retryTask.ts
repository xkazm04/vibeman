/**
 * retryTask
 *
 * One-click retry / run-again for a single requirement (finding #2).
 * Re-queues the requirement directly via the async execute endpoint and
 * flips its TaskRunner status to `queued`, skipping the manual
 * reset → reselect → batch dance.
 */

import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { createQueuedStatus } from '@/app/features/TaskRunner/lib/types';
import type { ProjectRequirement } from '@/app/features/TaskRunner/lib/types';

export interface RetryTaskResult {
  ok: boolean;
  error?: string;
}

/**
 * Re-queue a single requirement for execution.
 *
 * Posts to POST /api/claude-code/execute in async (queued) mode, then
 * optimistically marks the task `queued` in the TaskRunner store on success.
 *
 * @param requirement - The requirement to re-run (provides projectPath/name/id)
 * @param reqId - The composite requirement id used as the task key
 */
export async function retryTask(
  requirement: Pick<ProjectRequirement, 'projectPath' | 'requirementName' | 'projectId'>,
  reqId: string,
): Promise<RetryTaskResult> {
  try {
    const res = await fetch('/api/claude-code/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: requirement.projectPath,
        requirementName: requirement.requirementName,
        projectId: requirement.projectId,
        async: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    // Optimistically reflect the re-queue in the UI.
    useTaskRunnerStore.getState().updateTaskStatus(reqId, createQueuedStatus());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
