/**
 * Architecture Analysis Agent
 * Coordinates cross-project architecture analysis using Claude Code
 */

import {
  architectureAnalysisDb,
  crossProjectRelationshipDb,
  projectArchitectureMetadataDb,
} from '@/app/db';
import type {
  AnalysisResult,
  AnalysisTriggerType,
  DbCrossProjectRelationship,
  DbArchitectureAnalysisSession,
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

export interface AnalysisStartResult {
  success: boolean;
  analysisId: string;
  promptContent: string;
  error?: string;
}

export interface AnalysisCompleteResult {
  success: boolean;
  analysis: DbArchitectureAnalysisSession | null;
  relationshipsCreated: number;
  error?: string;
}

/**
 * Architecture Analysis Agent
 * Manages the lifecycle of architecture analysis sessions
 */
export const architectureAnalysisAgent = {
  /**
   * Start workspace-level architecture analysis
   * Returns prompt content to be sent to Claude Code
   */
  analyzeWorkspace: async (config: AnalyzeWorkspaceConfig): Promise<AnalysisStartResult> => {
    const { workspaceId, projects, triggerType, baseUrl } = config;

    // Check for running analysis
    const running = architectureAnalysisDb.getRunning('workspace', workspaceId);
    if (running) {
      return {
        success: false,
        analysisId: running.id,
        promptContent: '',
        error: 'Analysis already in progress',
      };
    }

    // Create analysis session
    const analysisId = generateId('arch-analysis');
    architectureAnalysisDb.create({
      id: analysisId,
      workspace_id: workspaceId,
      scope: 'workspace',
      trigger_type: triggerType,
    });

    // Get existing relationships for context
    const existingRels = crossProjectRelationshipDb.getByWorkspace(workspaceId);
    const existingRelationships = existingRels.map(r => ({
      sourceId: r.source_project_id,
      targetId: r.target_project_id,
      integrationType: r.integration_type,
      label: r.label || '',
    }));

    // Build callback URL
    const callbackUrl = `${baseUrl}/api/architecture/analyze/${analysisId}/complete`;

    // Build prompt
    const promptContent = buildWorkspaceAnalysisPrompt({
      analysisId,
      scope: 'workspace',
      workspaceId,
      projects,
      callbackUrl,
      existingRelationships,
    });

    return {
      success: true,
      analysisId,
      promptContent,
    };
  },

  /**
   * Start analysis for a newly added project
   * Discovers connections to existing projects
   */
  analyzeNewProject: async (config: AnalyzeProjectConfig): Promise<AnalysisStartResult> => {
    const { newProject, existingProjects, workspaceId, baseUrl } = config;

    // Create analysis session
    const analysisId = generateId('arch-analysis');
    architectureAnalysisDb.create({
      id: analysisId,
      workspace_id: workspaceId || null,
      project_id: newProject.id,
      scope: 'project',
      trigger_type: 'onboarding',
    });

    // Build callback URL
    const callbackUrl = `${baseUrl}/api/architecture/analyze/${analysisId}/complete`;

    // Build prompt
    const promptContent = buildProjectAnalysisPrompt({
      analysisId,
      project: newProject,
      existingProjects,
      callbackUrl,
    });

    return {
      success: true,
      analysisId,
      promptContent,
    };
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

    // Parse the result
    const result = parseAnalysisResult(rawResult);
    if (!result) {
      architectureAnalysisDb.failAnalysis(analysisId, 'Failed to parse analysis result');
      return {
        success: false,
        analysis: architectureAnalysisDb.getById(analysisId),
        relationshipsCreated: 0,
        error: 'Failed to parse analysis result',
      };
    }

    // Store relationships
    const relationshipsCreated = crossProjectRelationshipDb.upsertMany(
      analysis.workspace_id,
      result.relationships
    );

    // Handle project metadata if present (for onboarding analysis)
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

    // Complete the analysis
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

    return {
      success: true,
      analysis: completed,
      relationshipsCreated,
    };
  },

  /**
   * Fail analysis with error
   */
  failAnalysis: (analysisId: string, error: string): DbArchitectureAnalysisSession | null => {
    return architectureAnalysisDb.failAnalysis(analysisId, error);
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
