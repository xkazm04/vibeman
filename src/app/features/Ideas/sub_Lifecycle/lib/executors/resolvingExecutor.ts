/**
 * Resolving Phase Executor
 * Auto-resolves accepted ideas via the lifecycle resolve API.
 */

import { PhaseExecutor, PhaseContext } from '../lifecycleTypes';

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
        ctx.logEvent('error', 'resolving', `Failed to resolve idea: ${(error as Error).message}`);
      }
    }

    ctx.updateProgress(65, `Resolution complete: ${resolved} ideas resolved`);
  }

  private async getIdeasToResolve(projectId: string): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(`/api/ideas?projectId=${projectId}&status=accepted`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.ideas || [];
    } catch {
      return [];
    }
  }

  private async resolveIdea(ideaId: string, projectId: string): Promise<void> {
    try {
      await fetch('/api/lifecycle/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, projectId }),
      });
    } catch {
      // Silently fail resolution attempts
    }
  }
}
