/**
 * Architecture Analysis Repository
 * Built on BaseAnalysisRepository – only defines column-specific SQL
 */

import { createBaseAnalysisRepository } from '@/lib/analysis/BaseAnalysisRepository';
import type {
  DbArchitectureAnalysisSession,
  CreateArchitectureAnalysisInput,
} from '../models/cross-project-architecture.types';

interface ArchitectureCompleteData {
  projects_analyzed: number;
  relationships_discovered: number;
  ai_analysis?: string;
  ai_recommendations?: string;
  detected_patterns?: string;
}

const base = createBaseAnalysisRepository<
  DbArchitectureAnalysisSession,
  CreateArchitectureAnalysisInput,
  ArchitectureCompleteData
>({
  tableName: 'architecture_analysis_sessions',

  buildCreateSql(input, now) {
    return {
      columns: 'id, workspace_id, project_id, scope, status, trigger_type, created_at',
      placeholders: "?, ?, ?, ?, 'pending', ?, ?",
      params: [
        input.id,
        input.workspace_id || null,
        input.project_id || null,
        input.scope,
        input.trigger_type,
        now,
      ],
    };
  },

  buildCompleteSql(results) {
    return {
      setClause:
        'projects_analyzed = ?, relationships_discovered = ?, ai_analysis = ?, ai_recommendations = ?, detected_patterns = ?',
      params: [
        results.projects_analyzed,
        results.relationships_discovered,
        results.ai_analysis || null,
        results.ai_recommendations || null,
        results.detected_patterns || null,
      ],
    };
  },

  buildStartExtras(executionId?: unknown) {
    return {
      setClause: 'execution_id = ?',
      whereExtra: "status = 'pending'",
      params: [(executionId as string) || null],
    };
  },
});

export const architectureAnalysisRepository = {
  // Shared lifecycle from base
  ...base,

  getLatestCompleted(
    scope: 'project' | 'workspace',
    scopeId: string | null,
  ): DbArchitectureAnalysisSession | null {
    if (scope === 'workspace') {
      return base.findOneWhere(
        "scope = 'workspace' AND workspace_id IS ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1",
        scopeId
      );
    }
    return base.findOneWhere(
      "scope = 'project' AND project_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1",
      scopeId
    );
  },

  getRunning(
    scope: 'project' | 'workspace',
    scopeId: string | null,
  ): DbArchitectureAnalysisSession | null {
    if (scope === 'workspace') {
      return base.findOneWhere(
        "scope = 'workspace' AND workspace_id IS ? AND status = 'running' LIMIT 1",
        scopeId
      );
    }
    return base.findOneWhere(
      "scope = 'project' AND project_id = ? AND status = 'running' LIMIT 1",
      scopeId
    );
  },

  getHistory(
    scope: 'project' | 'workspace',
    scopeId: string | null,
    limit: number = 10,
  ): DbArchitectureAnalysisSession[] {
    if (scope === 'workspace') {
      return base.getHistoryWhere("scope = 'workspace' AND workspace_id IS ?", [scopeId], limit);
    }
    return base.getHistoryWhere("scope = 'project' AND project_id = ?", [scopeId], limit);
  },
};
