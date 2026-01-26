/**
 * Executive Analysis Agent
 * Orchestrates AI-driven executive insight analysis sessions
 */

import { executiveAnalysisDb } from '@/app/db';
import type {
  DbExecutiveAnalysis,
  ExecutiveAIInsight,
  CompleteExecutiveAnalysisData,
} from '@/app/db/models/reflector.types';
import {
  gatherExecutiveAnalysisData,
  buildExecutiveAnalysisPrompt,
} from './executiveAnalysisPromptBuilder';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';

// ============================================================================
// TYPES
// ============================================================================

export interface StartAnalysisOptions {
  projectId: string | null;
  projectName?: string;
  contextId: string | null;
  contextName?: string;
  timeWindow?: TimeWindow;
}

export interface StartAnalysisResult {
  success: boolean;
  analysisId?: string;
  promptContent?: string;
  error?: string;
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

/**
 * Generate a unique analysis ID
 */
function generateAnalysisId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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
  async startAnalysis(options: StartAnalysisOptions): Promise<StartAnalysisResult> {
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
      // Generate analysis ID
      const analysisId = generateAnalysisId();

      // Create analysis record
      executiveAnalysisDb.create({
        id: analysisId,
        project_id: projectId,
        context_id: contextId,
        trigger_type: 'manual',
        time_window: timeWindow,
      });

      // Gather data
      const data = await gatherExecutiveAnalysisData(
        projectId,
        contextId,
        timeWindow,
        projectName,
        contextName
      );

      // Build prompt
      const promptContent = buildExecutiveAnalysisPrompt({
        analysisId,
        data,
        projectId,
        apiBaseUrl: '', // Will be relative URL
      });

      // Mark as running
      executiveAnalysisDb.startAnalysis(analysisId);

      return {
        success: true,
        analysisId,
        promptContent,
      };
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
    try {
      const analysis = executiveAnalysisDb.getById(analysisId);
      if (!analysis) {
        console.error('[ExecutiveAnalysisAgent] Analysis not found:', analysisId);
        return false;
      }

      if (analysis.status !== 'running') {
        console.error('[ExecutiveAnalysisAgent] Analysis not in running state:', analysis.status);
        return false;
      }

      executiveAnalysisDb.completeAnalysis(analysisId, data);
      return true;
    } catch (error) {
      console.error('[ExecutiveAnalysisAgent] Error completing analysis:', error);
      return false;
    }
  },

  /**
   * Mark analysis as failed
   */
  failAnalysis(analysisId: string, error: string): boolean {
    try {
      executiveAnalysisDb.failAnalysis(analysisId, error);
      return true;
    } catch (err) {
      console.error('[ExecutiveAnalysisAgent] Error failing analysis:', err);
      return false;
    }
  },

  /**
   * Get analysis history
   */
  getHistory(projectId: string | null, limit: number = 10): DbExecutiveAnalysis[] {
    return executiveAnalysisDb.getHistory(projectId, limit);
  },

  /**
   * Get all AI insights from completed analyses
   */
  getAllInsights(projectId: string | null, limit: number = 20): ExecutiveAIInsight[] {
    return executiveAnalysisDb.getAllInsights(projectId, limit);
  },

  /**
   * Parse insights from a completed analysis record
   */
  parseInsights(analysis: DbExecutiveAnalysis): ExecutiveAIInsight[] {
    if (!analysis.ai_insights) return [];
    try {
      return JSON.parse(analysis.ai_insights);
    } catch {
      return [];
    }
  },

  /**
   * Parse recommendations from a completed analysis record
   */
  parseRecommendations(analysis: DbExecutiveAnalysis): string[] {
    if (!analysis.ai_recommendations) return [];
    try {
      return JSON.parse(analysis.ai_recommendations);
    } catch {
      return [];
    }
  },
};
