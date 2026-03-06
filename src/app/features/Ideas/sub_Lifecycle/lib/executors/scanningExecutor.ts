/**
 * Scanning Phase Executor
 * Runs AI scans across configured scan types and collects idea counts.
 */

import { PhaseExecutor, PhaseContext } from '../lifecycleTypes';
import { ScanType } from '../../../lib/scanTypes';

export class ScanningExecutor implements PhaseExecutor {
  readonly phase = 'scanning' as const;

  async execute(ctx: PhaseContext): Promise<void> {
    ctx.updatePhase('scanning', 'Running AI scans', 20);

    const scanTypes = ctx.config.scan_types;
    let scansCompleted = 0;
    let totalIdeas = 0;

    for (const scanType of scanTypes) {
      if (!ctx.isRunning()) {
        throw new Error('Cycle cancelled');
      }

      ctx.logEvent('scan_start', 'scanning', `Starting ${scanType} scan`);
      ctx.updateProgress(20 + (scansCompleted / scanTypes.length) * 25, `Running ${scanType} scan`);

      try {
        const result = await this.executeScan(ctx.cycle.project_id, scanType, ctx.config.provider);
        totalIdeas += result.ideaCount;
        scansCompleted++;

        ctx.cycle.scans_completed = scansCompleted;
        ctx.cycle.ideas_generated = totalIdeas;

        ctx.logEvent('scan_complete', 'scanning', `${scanType} scan complete: ${result.ideaCount} ideas`, {
          scanType,
          ideaCount: result.ideaCount,
        });
      } catch (error) {
        ctx.logEvent('error', 'scanning', `Scan ${scanType} failed: ${(error as Error).message}`);
        if (ctx.config.fail_fast) {
          throw error;
        }
      }
    }

    ctx.updateProgress(45, `Scans complete: ${totalIdeas} ideas found`);
  }

  private async executeScan(
    projectId: string,
    scanType: ScanType,
    provider: string,
  ): Promise<{ ideaCount: number }> {
    try {
      const response = await fetch('/api/lifecycle/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, scanType, provider }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Scan failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Scan ${scanType} failed: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }
}
