/**
 * Executive Analysis Agent
 * Orchestrates AI-driven executive insight analysis sessions.
 * Uses BaseAnalysisAgent for shared lifecycle (completeAnalysis / failAnalysis).
 */

import { executiveAnalysisDb } from '@/app/db';
import type {
  DbExecutiveAnalysis,
  CompleteExecutiveAnalysisData,
} from '@/app/db/models/reflector.types';
import {
  gatherExecutiveAnalysisData,
  buildExecutiveAnalysisPrompt,
} from './executiveAnalysisPromptBuilder';
import { createBaseAgentLifecycle } from '@/lib/analysis/BaseAnalysisAgent';
import type { AnalysisStartResult } from '@/lib/analysis/BaseAnalysisAgent';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';

// ============================================================================
// TYPES
// ============================================================================

export type { AnalysisStartResult };

export interface StartAnalysisOptions {
  projectId: string | null;
  projectName?: string;
  contextId: string | null;
  contextName?: string;
  timeWindow?: TimeWindow;
}

export interface AnalysisStatus {
  isRunning: boolean;
  runningAnalysis: DbExecutiveAnalysis | null;
  lastCompleted: DbExecutiveAnalysis | null;
  canAnalyze: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateAnalysisId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SHARED LIFECYCLE
// ============================================================================

const lifecycle = createBaseAgentLifecycle<DbExecutiveAnalysis>({
  label: 'ExecutiveAnalysisAgent',
  getById: (id) => executiveAnalysisDb.getById(id),
  failAnalysis: (id, msg) => executiveAnalysisDb.failAnalysis(id, msg),
});

// ============================================================================
// AGENT
// ============================================================================

export const executiveAnalysisAgent = {
  /**
   * Check if analysis is allowed (respects minimum gap)
   */
  canAnalyze(projectId: string | null, minGapHours: number = 1): boolean {
    return executiveAnalysisDb.canAnalyze(projectId, minGapHours);
  },

  /**
   * Get current analysis status
   */
  getStatus(projectId: string | null): AnalysisStatus {
    const runningAnalysis = executiveAnalysisDb.getRunning(projectId);
    const lastCompleted = executiveAnalysisDb.getLatestCompleted(projectId);
    const canAnalyze = !runningAnalysis && executiveAnalysisDb.canAnalyze(projectId, 1);

    return {
      isRunning: !!runningAnalysis,
      runningAnalysis,
      lastCompleted,
      canAnalyze,
    };
  },

  /**
   * Start a new analysis session
   */
  async startAnalysis(options: StartAnalysisOptions): Promise<AnalysisStartResult> {
    const {
      projectId,
      projectName,
      contextId,
      contextName,
      timeWindow = 'all',
    } = options;

    // Check if analysis is already running
    const existing = executiveAnalysisDb.getRunning(projectId);
    if (existing) {
      return {
        success: false,
        analysisId: existing.id,
        error: 'Analysis already running',
      };
    }

    // Check minimum gap
    if (!executiveAnalysisDb.canAnalyze(projectId, 1)) {
      return {
        success: false,
        error: 'Analysis was run recently. Please wait before running again.',
      };
    }

    try {
      const analysisId = generateAnalysisId();

      executiveAnalysisDb.create({
        id: analysisId,
        project_id: projectId,
        context_id: contextId,
        trigger_type: 'manual',
        time_window: timeWindow,
      });

      const data = await gatherExecutiveAnalysisData(
        projectId,
        contextId,
        timeWindow,
        projectName,
        contextName
      );

      const promptContent = buildExecutiveAnalysisPrompt({
        analysisId,
        data,
        projectId,
        apiBaseUrl: '',
      });

      executiveAnalysisDb.startAnalysis(analysisId);

      return { success: true, analysisId, promptContent };
    } catch (error) {
      console.error('[ExecutiveAnalysisAgent] Error starting analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Complete an analysis (called by Claude Code via API)
   */
  completeAnalysis(analysisId: string, data: CompleteExecutiveAnalysisData): boolean {
    return lifecycle.completeAnalysis(analysisId, () => {
      executiveAnalysisDb.completeAnalysis(analysisId, data);
      return true;
    }) as boolean;
  },

  /**
   * Mark analysis as failed – delegates to shared lifecycle
   */
  failAnalysis: lifecycle.failAnalysis,

  /**
   * Get analysis history
   */
  getHistory(projectId: string | null, limit: number = 10): DbExecutiveAnalysis[] {
    return executiveAnalysisDb.getHistory(projectId, limit);
  },

};
