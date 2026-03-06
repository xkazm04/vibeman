/**
 * Validation Phase Executor
 * Runs configured quality gates and collects pass/fail results.
 */

import { PhaseExecutor, PhaseContext, QualityGateResult, QualityGateType } from '../lifecycleTypes';

export class ValidationExecutor implements PhaseExecutor {
  readonly phase = 'validating' as const;

  async execute(ctx: PhaseContext): Promise<void> {
    ctx.updatePhase('validating', 'Running quality gates', 70);

    const gates = ctx.config.quality_gates;
    const results: QualityGateResult[] = [];
    let passed = 0;

    for (const gate of gates) {
      if (!ctx.isRunning()) {
        throw new Error('Cycle cancelled');
      }

      ctx.logEvent('gate_start', 'validating', `Running ${gate} gate`);
      ctx.updateProgress(70 + (results.length / gates.length) * 20, `Running ${gate}`);

      const result = await this.runQualityGate(gate, ctx.config.project_id, ctx.config.gate_timeout_ms);
      results.push(result);

      if (result.passed) {
        passed++;
        ctx.logEvent('gate_complete', 'validating', `${gate} gate passed`, result as unknown as Record<string, unknown>);
      } else {
        ctx.logEvent('warning', 'validating', `${gate} gate failed: ${result.message}`, result as unknown as Record<string, unknown>);

        if (ctx.config.fail_fast) {
          ctx.cycle.gate_results = results;
          ctx.cycle.quality_gates_passed = passed;
          throw new Error(`Quality gate ${gate} failed: ${result.message}`);
        }
      }
    }

    ctx.cycle.gate_results = results;
    ctx.cycle.quality_gates_passed = passed;

    if (passed < gates.length) {
      ctx.updateProgress(90, `Validation complete: ${passed}/${gates.length} gates passed`);
    } else {
      ctx.updateProgress(90, 'All quality gates passed');
    }
  }

  private async runQualityGate(
    gate: QualityGateType,
    projectId: string,
    timeoutMs: number,
  ): Promise<QualityGateResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/lifecycle/quality-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate, projectId, timeout: timeoutMs }),
      });

      const result = await response.json();

      return {
        type: gate,
        passed: result.passed,
        message: result.message,
        details: result.details,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: gate,
        passed: false,
        message: `Gate failed: ${error instanceof Error ? error.message : 'Network error'}`,
        duration_ms: Date.now() - startTime,
      };
    }
  }
}
