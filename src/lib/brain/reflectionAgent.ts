/**
 * Reflection Agent
 * Orchestrates autonomous reflection sessions for learning from decisions
 * Supports both per-project and global (cross-project) reflection modes
 */

import { brainReflectionDb, directionDb } from '@/app/db';
import type { ReflectionTriggerType, LearningInsight } from '@/app/db/models/brain.types';
import {
  gatherReflectionData,
  gatherGlobalReflectionData,
  buildReflectionRequirement,
  buildGlobalReflectionRequirement,
} from './reflectionPromptBuilder';

/**
 * Generate a unique reflection ID
 */
function generateReflectionId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default reflection configuration (per-project)
 */
export const DEFAULT_REFLECTION_CONFIG = {
  enabled: true,
  triggerThreshold: 20, // decisions before reflection
  minGapHours: 24, // minimum hours between reflections
  maxDecisionsToAnalyze: 30,
  autoUpdateGuide: true,
};

/**
 * Default global reflection configuration
 */
export const DEFAULT_GLOBAL_REFLECTION_CONFIG = {
  enabled: true,
  triggerThreshold: 50, // total decisions across all projects
  minGapHours: 72, // 3 days between global reflections
  maxProjectsToAnalyze: 10,
  maxDirectionsPerProject: 15,
};

/**
 * Reflection Agent - manages autonomous reflection sessions
 */
export const reflectionAgent = {
  // ========================================
  // PER-PROJECT REFLECTION
  // ========================================

  /**
   * Check if reflection should be triggered for a project
   */
  shouldTrigger: (
    projectId: string,
    config = DEFAULT_REFLECTION_CONFIG
  ): { shouldTrigger: boolean; reason: string } => {
    // Check minimum gap
    if (!brainReflectionDb.canReflect(projectId, config.minGapHours)) {
      return {
        shouldTrigger: false,
        reason: `Minimum gap not met (${config.minGapHours}h between reflections)`,
      };
    }

    // Check if already running
    const running = brainReflectionDb.getRunning(projectId);
    if (running) {
      return {
        shouldTrigger: false,
        reason: 'Reflection already running',
      };
    }

    // Get last reflection
    const lastReflection = brainReflectionDb.getLatestCompleted(projectId);
    const lastReflectionDate = lastReflection?.completed_at
      ? new Date(lastReflection.completed_at)
      : null;

    // Count decisions since last reflection
    const allDirections = directionDb.getDirectionsByProject(projectId);
    const decidedDirections = allDirections.filter(d =>
      d.status === 'accepted' || d.status === 'rejected'
    );

    let decisionsSinceLastReflection = decidedDirections.length;
    if (lastReflectionDate) {
      decisionsSinceLastReflection = decidedDirections.filter(d =>
        new Date(d.updated_at) > lastReflectionDate
      ).length;
    }

    // Check threshold
    if (decisionsSinceLastReflection >= config.triggerThreshold) {
      return {
        shouldTrigger: true,
        reason: `Threshold reached: ${decisionsSinceLastReflection} decisions since last reflection`,
      };
    }

    // Check weekly fallback (7 days without reflection)
    if (!lastReflectionDate) {
      // Never reflected and have some decisions
      if (decisionsSinceLastReflection >= 10) {
        return {
          shouldTrigger: true,
          reason: 'Initial reflection: 10+ decisions with no prior reflection',
        };
      }
    } else {
      const daysSinceReflection = (Date.now() - lastReflectionDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReflection >= 7 && decisionsSinceLastReflection >= 5) {
        return {
          shouldTrigger: true,
          reason: `Weekly fallback: ${daysSinceReflection.toFixed(1)} days since last reflection`,
        };
      }
    }

    return {
      shouldTrigger: false,
      reason: `Not enough decisions: ${decisionsSinceLastReflection}/${config.triggerThreshold}`,
    };
  },

  /**
   * Get current reflection status for a project
   */
  getStatus: (projectId: string) => {
    const running = brainReflectionDb.getRunning(projectId);
    const lastCompleted = brainReflectionDb.getLatestCompleted(projectId);
    const stats = brainReflectionDb.getStats(projectId);

    // Count decisions since last reflection
    const allDirections = directionDb.getDirectionsByProject(projectId);
    const decidedDirections = allDirections.filter(d =>
      d.status === 'accepted' || d.status === 'rejected'
    );

    let decisionsSinceLastReflection = decidedDirections.length;
    if (lastCompleted?.completed_at) {
      const lastDate = new Date(lastCompleted.completed_at);
      decisionsSinceLastReflection = decidedDirections.filter(d =>
        new Date(d.updated_at) > lastDate
      ).length;
    }

    return {
      isRunning: !!running,
      runningReflection: running,
      lastCompleted,
      stats,
      decisionsSinceLastReflection,
      nextThreshold: DEFAULT_REFLECTION_CONFIG.triggerThreshold,
    };
  },

  /**
   * Start a new per-project reflection session
   * Returns the prompt content for direct Claude Code execution (no file written)
   */
  startReflection: async (
    projectId: string,
    projectName: string,
    projectPath: string,
    triggerType: ReflectionTriggerType = 'manual',
    gitRepoUrl?: string | null
  ): Promise<{
    success: boolean;
    reflectionId?: string;
    promptContent?: string;
    error?: string;
  }> => {
    try {
      // Check if can reflect
      if (!brainReflectionDb.canReflect(projectId, 1)) {
        // Allow if manual, just warn
        if (triggerType !== 'manual') {
          return {
            success: false,
            error: 'Minimum gap between reflections not met',
          };
        }
      }

      // Check if already running
      const running = brainReflectionDb.getRunning(projectId);
      if (running) {
        return {
          success: false,
          error: 'Reflection already running',
          reflectionId: running.id,
        };
      }

      // Generate ID and create reflection record
      const reflectionId = generateReflectionId();

      brainReflectionDb.create({
        id: reflectionId,
        project_id: projectId,
        trigger_type: triggerType,
        scope: 'project',
      });

      // Gather data for analysis (async - includes git history)
      const data = await gatherReflectionData(
        projectId,
        projectPath,
        DEFAULT_REFLECTION_CONFIG.maxDecisionsToAnalyze,
        gitRepoUrl
      );

      // Build prompt content (no file written - sent directly to CLI)
      const promptContent = buildReflectionRequirement({
        projectId,
        projectName,
        projectPath,
        reflectionId,
        data,
      });

      // Mark as running
      brainReflectionDb.startReflection(reflectionId);

      return {
        success: true,
        reflectionId,
        promptContent,
      };
    } catch (error) {
      console.error('[ReflectionAgent] Failed to start reflection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // ========================================
  // GLOBAL (CROSS-PROJECT) REFLECTION
  // ========================================

  /**
   * Check if global reflection should be triggered
   */
  shouldTriggerGlobal: (
    projects: Array<{ id: string }>,
    config = DEFAULT_GLOBAL_REFLECTION_CONFIG
  ): { shouldTrigger: boolean; reason: string } => {
    // Check if a global reflection is already running
    const running = brainReflectionDb.getRunningGlobal();
    if (running) {
      return {
        shouldTrigger: false,
        reason: 'Global reflection already running',
      };
    }

    // Check minimum gap for global reflections
    const lastGlobal = brainReflectionDb.getLatestCompletedGlobal();
    if (lastGlobal?.completed_at) {
      const hoursSinceGlobal = (Date.now() - new Date(lastGlobal.completed_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceGlobal < config.minGapHours) {
        return {
          shouldTrigger: false,
          reason: `Minimum gap not met (${config.minGapHours}h between global reflections)`,
        };
      }
    }

    // Count total decisions across all projects since last global reflection
    let totalDecisions = 0;
    const lastGlobalDate = lastGlobal?.completed_at ? new Date(lastGlobal.completed_at) : null;

    for (const project of projects) {
      const allDirections = directionDb.getDirectionsByProject(project.id);
      const decidedDirections = allDirections.filter(d =>
        d.status === 'accepted' || d.status === 'rejected'
      );

      if (lastGlobalDate) {
        totalDecisions += decidedDirections.filter(d =>
          new Date(d.updated_at) > lastGlobalDate
        ).length;
      } else {
        totalDecisions += decidedDirections.length;
      }
    }

    if (totalDecisions >= config.triggerThreshold) {
      return {
        shouldTrigger: true,
        reason: `Global threshold reached: ${totalDecisions} decisions across ${projects.length} projects`,
      };
    }

    return {
      shouldTrigger: false,
      reason: `Not enough decisions: ${totalDecisions}/${config.triggerThreshold}`,
    };
  },

  /**
   * Get global reflection status
   */
  getGlobalStatus: () => {
    const running = brainReflectionDb.getRunningGlobal();
    const lastCompleted = brainReflectionDb.getLatestCompletedGlobal();

    return {
      isRunning: !!running,
      runningReflection: running,
      lastCompleted,
    };
  },

  /**
   * Start a global (cross-project) reflection session
   * Returns the prompt content for direct Claude Code execution (no file written)
   */
  startGlobalReflection: async (
    projects: Array<{ id: string; name: string; path: string }>,
    workspacePath: string
  ): Promise<{
    success: boolean;
    reflectionId?: string;
    promptContent?: string;
    error?: string;
  }> => {
    try {
      // Check if already running
      const running = brainReflectionDb.getRunningGlobal();
      if (running) {
        return {
          success: false,
          error: 'Global reflection already running',
          reflectionId: running.id,
        };
      }

      const reflectionId = generateReflectionId();

      brainReflectionDb.create({
        id: reflectionId,
        project_id: '__global__',
        trigger_type: 'manual',
        scope: 'global',
      });

      // Gather cross-project data
      const data = await gatherGlobalReflectionData(
        projects,
        DEFAULT_GLOBAL_REFLECTION_CONFIG.maxDirectionsPerProject
      );

      // Build prompt content (no file written - sent directly to CLI)
      const promptContent = buildGlobalReflectionRequirement({
        reflectionId,
        data,
        workspacePath,
      });

      brainReflectionDb.startReflection(reflectionId);

      return {
        success: true,
        reflectionId,
        promptContent,
      };
    } catch (error) {
      console.error('[ReflectionAgent] Failed to start global reflection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // ========================================
  // SHARED METHODS
  // ========================================

  /**
   * Complete a reflection session (called by Claude Code via API)
   */
  completeReflection: (
    reflectionId: string,
    data: {
      directionsAnalyzed: number;
      outcomesAnalyzed: number;
      signalsAnalyzed: number;
      insights: LearningInsight[];
      guideSectionsUpdated: string[];
    }
  ): boolean => {
    try {
      const result = brainReflectionDb.completeReflection(reflectionId, {
        directions_analyzed: data.directionsAnalyzed,
        outcomes_analyzed: data.outcomesAnalyzed,
        signals_analyzed: data.signalsAnalyzed,
        insights_generated: data.insights,
        guide_sections_updated: data.guideSectionsUpdated,
      });

      return !!result;
    } catch (error) {
      console.error('[ReflectionAgent] Failed to complete reflection:', error);
      return false;
    }
  },

  /**
   * Fail a reflection session
   */
  failReflection: (reflectionId: string, errorMessage: string): boolean => {
    try {
      const result = brainReflectionDb.failReflection(reflectionId, errorMessage);
      return !!result;
    } catch (error) {
      console.error('[ReflectionAgent] Failed to fail reflection:', error);
      return false;
    }
  },

  /**
   * Get reflection history for a project
   */
  getHistory: (projectId: string, limit: number = 10) => {
    return brainReflectionDb.getByProject(projectId, limit);
  },

  /**
   * Cleanup stale reflections
   */
  cleanup: (olderThanDays: number = 7): number => {
    return brainReflectionDb.cleanupStale(olderThanDays);
  },
};
