/**
 * Reflection Agent
 * Orchestrates autonomous reflection sessions for learning from decisions
 * Supports both per-project and global (cross-project) reflection modes
 */

import { brainReflectionDb, directionDb } from '@/app/db';
import type { ReflectionTriggerType } from '@/app/db/models/brain.types';
import {
  gatherReflectionData,
  gatherGlobalReflectionData,
  buildReflectionRequirement,
  buildGlobalReflectionRequirement,
} from './reflectionPromptBuilder';
import {
  REFLECTION_TRIGGER_THRESHOLD,
  REFLECTION_MIN_GAP_HOURS,
  REFLECTION_MAX_DECISIONS,
  REFLECTION_INITIAL_DECISIONS_MIN,
  REFLECTION_WEEKLY_FALLBACK_DAYS,
  REFLECTION_WEEKLY_DECISIONS_MIN,
  GLOBAL_REFLECTION_TRIGGER_THRESHOLD,
  GLOBAL_REFLECTION_MIN_GAP_HOURS,
  GLOBAL_REFLECTION_MAX_PROJECTS,
  GLOBAL_REFLECTION_MAX_DIRECTIONS_PER_PROJECT,
} from './config';

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
  triggerThreshold: REFLECTION_TRIGGER_THRESHOLD,
  minGapHours: REFLECTION_MIN_GAP_HOURS,
  maxDecisionsToAnalyze: REFLECTION_MAX_DECISIONS,
  autoUpdateGuide: true,
};

/**
 * Default global reflection configuration
 */
export const DEFAULT_GLOBAL_REFLECTION_CONFIG = {
  enabled: true,
  triggerThreshold: GLOBAL_REFLECTION_TRIGGER_THRESHOLD,
  minGapHours: GLOBAL_REFLECTION_MIN_GAP_HOURS,
  maxProjectsToAnalyze: GLOBAL_REFLECTION_MAX_PROJECTS,
  maxDirectionsPerProject: GLOBAL_REFLECTION_MAX_DIRECTIONS_PER_PROJECT,
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
    // Auto-recover stuck running reflections before checking
    brainReflectionDb.recoverStuckRunning();

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

    // Count decisions since last reflection using optimized SQL COUNT
    const decisionsSinceLastReflection = directionDb.getDecidedCountSince(projectId, lastReflectionDate);

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
      if (decisionsSinceLastReflection >= REFLECTION_INITIAL_DECISIONS_MIN) {
        return {
          shouldTrigger: true,
          reason: `Initial reflection: ${REFLECTION_INITIAL_DECISIONS_MIN}+ decisions with no prior reflection`,
        };
      }
    } else {
      const daysSinceReflection = (Date.now() - lastReflectionDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReflection >= REFLECTION_WEEKLY_FALLBACK_DAYS && decisionsSinceLastReflection >= REFLECTION_WEEKLY_DECISIONS_MIN) {
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
    // Auto-recover stuck running reflections before reporting status
    brainReflectionDb.recoverStuckRunning();

    const running = brainReflectionDb.getRunning(projectId);
    const lastCompleted = brainReflectionDb.getLatestCompleted(projectId);
    const stats = brainReflectionDb.getStats(projectId);

    // Count decisions since last reflection using optimized SQL COUNT
    const lastDate = lastCompleted?.completed_at ? new Date(lastCompleted.completed_at) : null;
    const decisionsSinceLastReflection = directionDb.getDecidedCountSince(projectId, lastDate);

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

      // Atomic create: the UNIQUE partial index on (project_id, scope)
      // WHERE status IN ('pending', 'running') prevents duplicates at the DB level.
      // No TOCTOU race — the INSERT fails atomically if one already exists.
      const reflectionId = generateReflectionId();
      const result = brainReflectionDb.createIfNotActive({
        id: reflectionId,
        project_id: projectId,
        trigger_type: triggerType,
        scope: 'project',
      });

      if (!result.created) {
        return {
          success: false,
          error: 'Reflection already running',
          reflectionId: result.reflection.id,
        };
      }

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
    // Auto-recover stuck running reflections before checking
    brainReflectionDb.recoverStuckRunning();

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

    // Count total decisions across all projects since last global reflection using optimized SQL COUNT
    const lastGlobalDate = lastGlobal?.completed_at ? new Date(lastGlobal.completed_at) : null;
    const projectIds = projects.map(p => p.id);
    const totalDecisions = directionDb.getDecidedCountSinceMultiple(projectIds, lastGlobalDate);

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
    // Auto-recover stuck running reflections before reporting status
    brainReflectionDb.recoverStuckRunning();

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
      // Atomic create: the UNIQUE partial index on (project_id, scope)
      // WHERE status IN ('pending', 'running') prevents duplicates at the DB level.
      // No TOCTOU race — the INSERT fails atomically if one already exists.
      const reflectionId = generateReflectionId();
      const result = brainReflectionDb.createIfNotActive({
        id: reflectionId,
        project_id: '__global__',
        trigger_type: 'manual',
        scope: 'global',
      });

      if (!result.created) {
        return {
          success: false,
          error: 'Global reflection already running',
          reflectionId: result.reflection.id,
        };
      }

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
      guideSectionsUpdated: string[];
    }
  ): boolean => {
    try {
      const result = brainReflectionDb.completeReflection(reflectionId, {
        directions_analyzed: data.directionsAnalyzed,
        outcomes_analyzed: data.outcomesAnalyzed,
        signals_analyzed: data.signalsAnalyzed,
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
