/**
 * Architecture Analysis Agent
 * Coordinates cross-project architecture analysis using Claude Code.
 * Uses BaseAnalysisAgent for shared lifecycle (completeAnalysis / failAnalysis).
 */

import {
  architectureAnalysisDb,
  crossProjectRelationshipDb,
  projectArchitectureMetadataDb,
} from '@/app/db';
import type {
  DbArchitectureAnalysisSession,
  AnalysisTriggerType,
  ProjectTier,
  FrameworkCategory,
} from '@/app/db/models/cross-project-architecture.types';
import { generateId } from '@/app/db/repositories/repository.utils';
import {
  buildWorkspaceAnalysisPrompt,
  buildProjectAnalysisPrompt,
  parseAnalysisResult,
  type ProjectInfo,
} from './promptBuilder';
import { createBaseAgentLifecycle } from '@/lib/analysis/BaseAnalysisAgent';
import type { AnalysisStartResult } from '@/lib/analysis/BaseAnalysisAgent';

// ============================================================================
// TYPES
// ============================================================================

export type { AnalysisStartResult };

export interface AnalyzeWorkspaceConfig {
  workspaceId: string | null;
  projects: ProjectInfo[];
  triggerType: AnalysisTriggerType;
  baseUrl: string;
}

export interface AnalyzeProjectConfig {
  newProject: ProjectInfo;
  existingProjects: ProjectInfo[];
  workspaceId?: string | null;
  baseUrl: string;
}

export interface AnalysisCompleteResult {
  success: boolean;
  analysis: DbArchitectureAnalysisSession | null;
  relationshipsCreated: number;
  error?: string;
}

// ============================================================================
// SHARED LIFECYCLE
// ============================================================================

const lifecycle = createBaseAgentLifecycle<DbArchitectureAnalysisSession>({
  label: 'ArchitectureAnalysisAgent',
  getById: (id) => architectureAnalysisDb.getById(id),
  failAnalysis: (id, msg) => architectureAnalysisDb.failAnalysis(id, msg),
});

// ============================================================================
// AGENT
// ============================================================================

export const architectureAnalysisAgent = {
  /**
   * Start workspace-level architecture analysis
   */
  analyzeWorkspace: async (config: AnalyzeWorkspaceConfig): Promise<AnalysisStartResult> => {
    const { workspaceId, projects, triggerType, baseUrl } = config;

    const running = architectureAnalysisDb.getRunning('workspace', workspaceId);
    if (running) {
      return {
        success: false,
        analysisId: running.id,
        promptContent: '',
        error: 'Analysis already in progress',
      };
    }

    const analysisId = generateId('arch-analysis');
    architectureAnalysisDb.create({
      id: analysisId,
      workspace_id: workspaceId,
      scope: 'workspace',
      trigger_type: triggerType,
    });

    const existingRels = crossProjectRelationshipDb.getByWorkspace(workspaceId);
    const existingRelationships = existingRels.map(r => ({
      sourceId: r.source_project_id,
      targetId: r.target_project_id,
      integrationType: r.integration_type,
      label: r.label || '',
    }));

    const callbackUrl = `${baseUrl}/api/architecture/analyze/${analysisId}/complete`;

    const promptContent = buildWorkspaceAnalysisPrompt({
      analysisId,
      scope: 'workspace',
      workspaceId,
      projects,
      callbackUrl,
      existingRelationships,
    });

    return { success: true, analysisId, promptContent };
  },

  /**
   * Start analysis for a newly added project
   */
  analyzeNewProject: async (config: AnalyzeProjectConfig): Promise<AnalysisStartResult> => {
    const { newProject, existingProjects, workspaceId, baseUrl } = config;

    const analysisId = generateId('arch-analysis');
    architectureAnalysisDb.create({
      id: analysisId,
      workspace_id: workspaceId || null,
      project_id: newProject.id,
      scope: 'project',
      trigger_type: 'onboarding',
    });

    const callbackUrl = `${baseUrl}/api/architecture/analyze/${analysisId}/complete`;

    const promptContent = buildProjectAnalysisPrompt({
      analysisId,
      project: newProject,
      existingProjects,
      callbackUrl,
    });

    return { success: true, analysisId, promptContent };
  },

  /**
   * Mark analysis as started (running)
   */
  startAnalysis: (analysisId: string, executionId?: string): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisDb.startAnalysis(analysisId, executionId);
  },

  /**
   * Complete analysis with results from Claude Code
   */
  completeAnalysis: async (
    analysisId: string,
    rawResult: unknown
  ): Promise<AnalysisCompleteResult> => {
    const analysis = architectureAnalysisDb.getById(analysisId);
    if (!analysis) {
      return {
        success: false,
        analysis: null,
        relationshipsCreated: 0,
        error: 'Analysis session not found',
      };
    }

    const result = parseAnalysisResult(rawResult);
    if (!result) {
      lifecycle.failAnalysis(analysisId, 'Failed to parse analysis result');
      return {
        success: false,
        analysis: architectureAnalysisDb.getById(analysisId),
        relationshipsCreated: 0,
        error: 'Failed to parse analysis result',
      };
    }

    const relationshipsCreated = crossProjectRelationshipDb.upsertMany(
      analysis.workspace_id,
      result.relationships
    );

    const rawData = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    if (rawData?.project_metadata && analysis.project_id) {
      const meta = rawData.project_metadata;
      projectArchitectureMetadataDb.upsert({
        id: generateId('pam'),
        project_id: analysis.project_id,
        workspace_id: analysis.workspace_id,
        tier: meta.tier as ProjectTier,
        framework: meta.framework,
        framework_category: meta.framework_category as FrameworkCategory,
        description: meta.description,
      });
    }

    const completed = architectureAnalysisDb.completeAnalysis(analysisId, {
      projects_analyzed: analysis.scope === 'workspace'
        ? new Set([
            ...result.relationships.map(r => r.source_project_id),
            ...result.relationships.map(r => r.target_project_id),
          ]).size
        : 1,
      relationships_discovered: result.relationships.length,
      ai_analysis: result.narrative,
      ai_recommendations: JSON.stringify(result.recommendations),
      detected_patterns: JSON.stringify(result.patterns),
    });

    return { success: true, analysis: completed, relationshipsCreated };
  },

  /**
   * Fail analysis with error – delegates to shared lifecycle
   */
  failAnalysis: (analysisId: string, error: string): DbArchitectureAnalysisSession | null => {
    lifecycle.failAnalysis(analysisId, error);
    return architectureAnalysisDb.getById(analysisId);
  },

  /**
   * Get analysis status
   */
  getAnalysis: (analysisId: string): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisDb.getById(analysisId);
  },

  /**
   * Get latest completed analysis for a workspace
   */
  getLatestWorkspaceAnalysis: (workspaceId: string | null): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisDb.getLatestCompleted('workspace', workspaceId);
  },

  /**
   * Get analysis history for a workspace
   */
  getWorkspaceAnalysisHistory: (
    workspaceId: string | null,
    limit: number = 10
  ): DbArchitectureAnalysisSession[] => {
    return architectureAnalysisDb.getHistory('workspace', workspaceId, limit);
  },

  /**
   * Check if analysis is running
   */
  isAnalysisRunning: (scope: 'project' | 'workspace', scopeId: string | null): boolean => {
    return architectureAnalysisDb.getRunning(scope, scopeId) !== null;
  },
};

export default architectureAnalysisAgent;
