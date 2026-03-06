/**
 * Deployment Phase Executor
 * Deploys changes to configured targets, or builds a simulation preview.
 */

import {
  PhaseExecutor,
  PhaseContext,
  LifecycleCycle,
  LifecycleConfig,
  DetectionResult,
  SimulationPreview,
} from '../lifecycleTypes';

export class DeploymentExecutor implements PhaseExecutor {
  readonly phase = 'deploying' as const;

  async execute(ctx: PhaseContext): Promise<void> {
    // In simulation mode, build a preview instead of deploying
    if (ctx.cycle.is_simulation) {
      ctx.updatePhase('deploying', 'Building simulation preview', 92);

      const preview = await this.buildSimulationPreview(ctx.cycle, ctx.config);
      ctx.cycle.simulation_preview = preview;
      ctx.cycle.deployment_status = 'skipped';

      ctx.logEvent('info', 'deploying', 'Simulation complete — preview ready', {
        would_create_branch: preview.would_create_branch,
        would_create_pr: preview.would_create_pr,
        ideas_count: preview.ideas_implemented.length,
        gates_passed: preview.gate_summary.filter(g => g.passed).length,
        gates_total: preview.gate_summary.length,
      });
      ctx.updateProgress(98, 'Simulation preview ready');
      return;
    }

    ctx.updatePhase('deploying', 'Deploying changes', 92);

    // Check if all gates passed
    if (ctx.cycle.quality_gates_passed < ctx.cycle.quality_gates_total) {
      ctx.logEvent('info', 'deploying', 'Skipping deployment: not all quality gates passed');
      ctx.cycle.deployment_status = 'skipped';
      return;
    }

    // Check deployment restrictions
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour < 17;

    if (isWeekend && !ctx.config.deploy_on_weekend) {
      ctx.logEvent('info', 'deploying', 'Skipping deployment: weekend deployment disabled');
      ctx.cycle.deployment_status = 'skipped';
      return;
    }

    if (!isBusinessHours && ctx.config.deploy_during_business_hours) {
      ctx.logEvent('info', 'deploying', 'Skipping deployment: outside business hours');
      ctx.cycle.deployment_status = 'skipped';
      return;
    }

    ctx.cycle.deployment_status = 'in_progress';
    ctx.logEvent('deploy_start', 'deploying', 'Starting deployment');

    try {
      for (const target of ctx.config.deployment_targets) {
        await this.deployToTarget(target, ctx.cycle);
      }

      ctx.cycle.deployment_status = 'completed';
      ctx.logEvent('deploy_complete', 'deploying', 'Deployment completed successfully');
      ctx.updateProgress(98, 'Deployment complete');
    } catch (error) {
      ctx.cycle.deployment_status = 'failed';
      throw error;
    }
  }

  private async buildSimulationPreview(
    cycle: LifecycleCycle,
    config: LifecycleConfig,
  ): Promise<SimulationPreview> {
    const detection = cycle.trigger_metadata?.detection as DetectionResult | undefined;
    const branchName = `lifecycle/sim-${cycle.id.split('_').pop()}`;
    const allGatesPassed = cycle.quality_gates_passed === cycle.quality_gates_total;
    const wouldCreatePr = allGatesPassed && config.deployment_targets.includes('pull_request');

    const ideas = await this.getResolvedIdeasInfo(cycle.project_id);
    const prBody = this.buildPRBody(cycle, ideas, detection);

    let blockedReason: string | undefined;
    if (!allGatesPassed) {
      const failedGates = cycle.gate_results.filter(g => !g.passed).map(g => g.type);
      blockedReason = `Quality gates failed: ${failedGates.join(', ')}`;
    } else if (!config.auto_deploy) {
      blockedReason = 'Auto-deploy is disabled';
    }

    return {
      would_create_branch: branchName,
      would_create_pr: wouldCreatePr,
      pr_title: `[Lifecycle] ${ideas.length > 0 ? ideas.map(i => i.title).join(', ') : 'Automated improvements'} (#${cycle.id.split('_').pop()})`,
      pr_body: prBody,
      files_changed: detection?.files_changed ?? [],
      ideas_implemented: ideas,
      gate_summary: cycle.gate_results.map(r => ({
        gate: r.type,
        passed: r.passed,
        message: r.message ?? (r.passed ? 'Passed' : 'Failed'),
      })),
      estimated_impact: this.estimateImpact(cycle),
      blocked_reason: blockedReason,
    };
  }

  private buildPRBody(
    cycle: LifecycleCycle,
    ideas: Array<{ id: string; title: string; category: string }>,
    detection?: DetectionResult,
  ): string {
    const lines: string[] = [
      '## Automated Lifecycle Changes',
      '',
      `> Cycle \`${cycle.id}\` triggered by **${cycle.trigger}**`,
      '',
    ];

    if (ideas.length > 0) {
      lines.push('### Ideas Implemented');
      for (const idea of ideas) {
        lines.push(`- **${idea.title}** _(${idea.category})_`);
      }
      lines.push('');
    }

    if (detection && detection.files_changed.length > 0) {
      lines.push('### Changes');
      lines.push(`- **${detection.files_changed.length}** files modified (+${detection.insertions}/-${detection.deletions})`);
      if (detection.files_changed.length <= 10) {
        for (const f of detection.files_changed) {
          lines.push(`  - \`${f}\``);
        }
      } else {
        for (const f of detection.files_changed.slice(0, 8)) {
          lines.push(`  - \`${f}\``);
        }
        lines.push(`  - _...and ${detection.files_changed.length - 8} more_`);
      }
      lines.push('');
    }

    lines.push('### Quality Gates');
    for (const gate of cycle.gate_results) {
      const icon = gate.passed ? 'pass' : 'fail';
      lines.push(`- ${icon === 'pass' ? '**PASS**' : '**FAIL**'} ${gate.type}${gate.message ? `: ${gate.message}` : ''}`);
    }
    lines.push('');

    lines.push('### Summary');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Scans | ${cycle.scans_completed}/${cycle.scans_total} |`);
    lines.push(`| Ideas Generated | ${cycle.ideas_generated} |`);
    lines.push(`| Ideas Resolved | ${cycle.ideas_resolved} |`);
    lines.push(`| Gates Passed | ${cycle.quality_gates_passed}/${cycle.quality_gates_total} |`);
    if (cycle.duration_ms) {
      lines.push(`| Duration | ${(cycle.duration_ms / 1000).toFixed(1)}s |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('_Generated by AI-Driven Code Quality Lifecycle_');

    return lines.join('\n');
  }

  private estimateImpact(cycle: LifecycleCycle): string {
    if (cycle.ideas_resolved === 0 && cycle.ideas_generated === 0) {
      return 'No changes detected';
    }
    if (cycle.ideas_resolved === 0) {
      return `${cycle.ideas_generated} ideas generated, none auto-resolved`;
    }
    if (cycle.quality_gates_passed === cycle.quality_gates_total) {
      return `${cycle.ideas_resolved} improvements implemented, all quality gates passed`;
    }
    return `${cycle.ideas_resolved} improvements implemented, ${cycle.quality_gates_passed}/${cycle.quality_gates_total} gates passed`;
  }

  private async getResolvedIdeasInfo(projectId: string): Promise<Array<{ id: string; title: string; category: string }>> {
    try {
      const response = await fetch(`/api/ideas?projectId=${projectId}&status=implemented&limit=10`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.ideas || []).map((i: { id: string; title: string; category: string }) => ({
        id: i.id,
        title: i.title,
        category: i.category,
      }));
    } catch {
      return [];
    }
  }

  private async deployToTarget(target: string, cycle: LifecycleCycle): Promise<void> {
    try {
      const ideas = await this.getResolvedIdeasInfo(cycle.project_id);

      const response = await fetch('/api/lifecycle/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          projectId: cycle.project_id,
          cycleId: cycle.id,
          ideas,
          gateResults: cycle.gate_results.map(r => ({
            type: r.type,
            passed: r.passed,
            message: r.message,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.details?.prUrl) {
          cycle.deployment_details = {
            ...cycle.deployment_details,
            prUrl: result.details.prUrl,
          };
        }
      }
    } catch (error) {
      throw new Error(`Deployment to ${target} failed: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }
}
