/**
 * Resolving Phase Executor
 * Auto-resolves accepted ideas via the lifecycle resolve API.
 */

import { PhaseExecutor, PhaseContext } from '../lifecycleTypes';
import { lifecycleUrl } from './lifecycleApi';

export class ResolvingExecutor implements PhaseExecutor {
  readonly phase = 'resolving' as const;

  async execute(ctx: PhaseContext): Promise<void> {
    ctx.updatePhase('resolving', 'Resolving issues', 50);

    if (!ctx.config.auto_resolve) {
      ctx.logEvent('info', 'resolving', 'Auto-resolve disabled, skipping resolution phase');
      ctx.updateProgress(60, 'Resolution phase skipped');
      return;
    }

    const ideas = await this.getIdeasToResolve(ctx.cycle.project_id);
    const ideasToResolve = ideas.slice(0, ctx.config.max_auto_implementations);

    let resolved = 0;
    for (const idea of ideasToResolve) {
      if (!ctx.isRunning()) {
        throw new Error('Cycle cancelled');
      }

      ctx.logEvent('idea_resolved', 'resolving', `Resolving idea: ${idea.title}`, { ideaId: idea.id });

      try {
        await this.resolveIdea(idea.id, ctx.cycle.project_id);
        resolved++;
        ctx.cycle.ideas_resolved = resolved;

        ctx.updateProgress(
          50 + (resolved / ideasToResolve.length) * 15,
          `Resolved ${resolved}/${ideasToResolve.length} ideas`,
        );
      } catch (error) {
        // Surface the failure — never silently pass. When fail_fast is set, a
        // failed resolution aborts the whole cycle (mirrors ScanningExecutor),
        // so the cycle is honestly reported as failed instead of "completed".
        ctx.logEvent('error', 'resolving', `Failed to resolve idea "${idea.title}": ${(error as Error).message}`, {
          ideaId: idea.id,
        });
        if (ctx.config.fail_fast) {
          throw new Error(`Failed to resolve idea "${idea.title}": ${(error as Error).message}`);
        }
      }
    }

    ctx.updateProgress(65, `Resolution complete: ${resolved} ideas resolved`);
  }

  private async getIdeasToResolve(projectId: string): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(lifecycleUrl(`/api/ideas?projectId=${projectId}&status=accepted`));
      if (!response.ok) return [];
      const data = await response.json();
      return data.ideas || [];
    } catch {
      return [];
    }
  }

  private async resolveIdea(ideaId: string, projectId: string): Promise<void> {
    // Throw on transport OR non-2xx so the caller can surface the failure.
    // Previously this swallowed every error, so `resolved++` ran even when the
    // resolve call never happened — the cycle reported phantom resolutions.
    const response = await fetch(lifecycleUrl('/api/lifecycle/resolve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId, projectId }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.error) detail = body.error;
      } catch {
        // Non-JSON error body — keep the HTTP status detail.
      }
      throw new Error(detail);
    }
  }
}
