/**
 * Architecture Analysis Agent
 * Coordinates cross-project architecture analysis using Claude Code.
 * Uses BaseAnalysisAgent for shared lifecycle (completeAnalysis / failAnalysis).
 */

import { architectureAnalysisRepository } from '@/app/db/repositories/architecture-analysis.repository';
import { crossProjectRelationshipRepository } from '@/app/db/repositories/cross-project-relationship.repository';
import { projectArchitectureMetadataRepository } from '@/app/db/repositories/project-architecture-metadata.repository';
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
  getById: (id) => architectureAnalysisRepository.getById(id),
  failAnalysis: (id, msg) => architectureAnalysisRepository.failAnalysis(id, msg),
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

    const running = architectureAnalysisRepository.getRunning('workspace', workspaceId);
    if (running) {
      return {
        success: false,
        analysisId: running.id,
        promptContent: '',
        error: 'Analysis already in progress',
      };
    }

    const analysisId = generateId('arch-analysis');
    architectureAnalysisRepository.create({
      id: analysisId,
      workspace_id: workspaceId,
      scope: 'workspace',
      trigger_type: triggerType,
    });
    // Flip the freshly-created 'pending' row to 'running' so the getRunning()
    // dedup guard above actually matches an in-flight analysis. Without this the
    // row stays 'pending' forever, getRunning() never returns it, and two
    // concurrent POSTs (or a double-click) both pass the guard and run.
    architectureAnalysisRepository.startAnalysis(analysisId);

    const existingRels = crossProjectRelationshipRepository.getByWorkspace(workspaceId);
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
    architectureAnalysisRepository.create({
      id: analysisId,
      workspace_id: workspaceId || null,
      project_id: newProject.id,
      scope: 'project',
      trigger_type: 'onboarding',
    });
    // Mark running so concurrent project analyses are de-duplicated by getRunning().
    architectureAnalysisRepository.startAnalysis(analysisId);

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
    return architectureAnalysisRepository.startAnalysis(analysisId, executionId);
  },

  /**
   * Complete analysis with results from Claude Code
   */
  completeAnalysis: async (
    analysisId: string,
    rawResult: unknown
  ): Promise<AnalysisCompleteResult> => {
    const analysis = architectureAnalysisRepository.getById(analysisId);
    if (!analysis) {
      return {
        success: false,
        analysis: null,
        relationshipsCreated: 0,
        error: 'Analysis session not found',
      };
    }

    // Only a running analysis may be completed. The completion callback can be
    // duplicated/retried by Claude Code; without this guard a second callback
    // re-ran upsertMany (re-writing cross-project relationships) and re-completed
    // an already-terminal analysis. The route's status check is a TOCTOU on its
    // own; this re-check at the write boundary rejects the late/duplicate call.
    if (analysis.status !== 'running') {
      return {
        success: false,
        analysis,
        relationshipsCreated: 0,
        error: `Analysis is not running (status: ${analysis.status})`,
      };
    }

    const result = parseAnalysisResult(rawResult);
    if (!result) {
      lifecycle.failAnalysis(analysisId, 'Failed to parse analysis result');
      return {
        success: false,
        analysis: architectureAnalysisRepository.getById(analysisId),
        relationshipsCreated: 0,
        error: 'Failed to parse analysis result',
      };
    }

    const relationshipsCreated = crossProjectRelationshipRepository.upsertMany(
      analysis.workspace_id,
      result.relationships
    );

    const rawData = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    if (rawData?.project_metadata && analysis.project_id) {
      const meta = rawData.project_metadata;
      projectArchitectureMetadataRepository.upsert({
        id: generateId('pam'),
        project_id: analysis.project_id,
        workspace_id: analysis.workspace_id,
        tier: meta.tier as ProjectTier,
        framework: meta.framework,
        framework_category: meta.framework_category as FrameworkCategory,
        description: meta.description,
      });
    }

    const completed = architectureAnalysisRepository.completeAnalysis(analysisId, {
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
    return architectureAnalysisRepository.getById(analysisId);
  },

  /**
   * Get analysis status
   */
  getAnalysis: (analysisId: string): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisRepository.getById(analysisId);
  },

  /**
   * Get latest completed analysis for a workspace
   */
  getLatestWorkspaceAnalysis: (workspaceId: string | null): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisRepository.getLatestCompleted('workspace', workspaceId);
  },

  /**
   * Get analysis history for a workspace
   */
  getWorkspaceAnalysisHistory: (
    workspaceId: string | null,
    limit: number = 10
  ): DbArchitectureAnalysisSession[] => {
    return architectureAnalysisRepository.getHistory('workspace', workspaceId, limit);
  },

  /**
   * Check if analysis is running
   */
  isAnalysisRunning: (scope: 'project' | 'workspace', scopeId: string | null): boolean => {
    return architectureAnalysisRepository.getRunning(scope, scopeId) !== null;
  },
};

export default architectureAnalysisAgent;
