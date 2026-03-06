/**
 * Detection Phase Executor
 * Analyzes git diff for real code changes to determine what triggered the cycle.
 */

import { PhaseExecutor, PhaseContext, DetectionResult } from '../lifecycleTypes';

export class DetectionExecutor implements PhaseExecutor {
  readonly phase = 'detecting' as const;

  async execute(ctx: PhaseContext): Promise<void> {
    ctx.updatePhase('detecting', 'Analyzing code changes', 5);

    try {
      const response = await fetch('/api/lifecycle/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: ctx.cycle.trigger_metadata?.projectPath,
        }),
      });

      if (response.ok) {
        const detection: DetectionResult = await response.json();

        ctx.cycle.trigger_metadata = {
          ...ctx.cycle.trigger_metadata,
          detection,
        };

        if (detection.has_changes) {
          ctx.logEvent('info', 'detecting', `Detected ${detection.files_changed.length} changed files (+${detection.insertions}/-${detection.deletions})`, {
            files_changed: detection.files_changed.length,
            untracked: detection.untracked_files.length,
            insertions: detection.insertions,
            deletions: detection.deletions,
            branch: detection.current_branch,
          });
        } else {
          ctx.logEvent('info', 'detecting', 'No code changes detected, proceeding with scan-based detection');
        }
      } else {
        ctx.logEvent('warning', 'detecting', 'Detection API unavailable, proceeding with trigger-based detection');
      }
    } catch {
      ctx.logEvent('warning', 'detecting', 'Detection failed, proceeding with trigger-based detection');
    }

    ctx.updateProgress(15, 'Detection complete');
  }
}
