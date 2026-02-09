/**
 * BaseAnalysisAgent<TRecord, TCompleteData>
 *
 * Shared lifecycle for analysis agents:
 *   getStatus() → startAnalysis() → completeAnalysis() / failAnalysis()
 *
 * Concrete agents (executive, architecture) implement:
 *  - checkRunning(scopeKey) → get a running analysis for the given scope
 *  - canStartNew(scopeKey)  → cooldown / duplicate guard
 *  - gatherAndBuildPrompt() → domain-specific data gathering + prompt building
 *  - handleCompletion()     → domain-specific result parsing & side-effects
 */

import type { BaseAnalysisRecord } from './types';

export interface AnalysisStartResult {
  success: boolean;
  analysisId?: string;
  promptContent?: string;
  error?: string;
}

export interface BaseAnalysisAgentConfig<TRecord extends BaseAnalysisRecord> {
  /** Human label for log messages, e.g. "ExecutiveAnalysis" */
  label: string;

  /** Look up the record by id */
  getById(id: string): TRecord | null;

  /** Mark record as failed */
  failAnalysis(id: string, errorMessage: string): TRecord | null;
}

/**
 * Creates the shared completeAnalysis / failAnalysis lifecycle.
 * Returns helpers the concrete agent can compose into its own exported object.
 */
export function createBaseAgentLifecycle<TRecord extends BaseAnalysisRecord>(
  cfg: BaseAnalysisAgentConfig<TRecord>,
) {
  return {
    /**
     * Complete an analysis – validates record exists and is running,
     * then delegates to the caller-provided finalize function.
     */
    completeAnalysis(
      analysisId: string,
      finalize: (record: TRecord) => boolean | Promise<boolean>,
    ): boolean | Promise<boolean> {
      try {
        const record = cfg.getById(analysisId);
        if (!record) {
          console.error(`[${cfg.label}] Analysis not found:`, analysisId);
          return false;
        }
        if (record.status !== 'running') {
          console.error(`[${cfg.label}] Analysis not in running state:`, record.status);
          return false;
        }
        return finalize(record);
      } catch (error) {
        console.error(`[${cfg.label}] Error completing analysis:`, error);
        return false;
      }
    },

    /**
     * Mark an analysis as failed.
     */
    failAnalysis(analysisId: string, error: string): boolean {
      try {
        cfg.failAnalysis(analysisId, error);
        return true;
      } catch (err) {
        console.error(`[${cfg.label}] Error failing analysis:`, err);
        return false;
      }
    },
  };
}
