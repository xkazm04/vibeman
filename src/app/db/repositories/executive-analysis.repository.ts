/**
 * Executive Analysis Repository
 * Built on BaseAnalysisRepository – only defines column-specific SQL
 */

import { getDatabase } from '../connection';
import { createBaseAnalysisRepository } from '@/lib/analysis/BaseAnalysisRepository';
import { selectOne, selectAll } from './repository.utils';
import type {
  DbExecutiveAnalysis,
  CreateExecutiveAnalysisInput,
  CompleteExecutiveAnalysisData,
  ExecutiveAIInsight,
} from '../models/reflector.types';

const base = createBaseAnalysisRepository<
  DbExecutiveAnalysis,
  CreateExecutiveAnalysisInput,
  CompleteExecutiveAnalysisData
>({
  tableName: 'executive_analysis',

  buildCreateSql(input, now) {
    return {
      columns: 'id, project_id, context_id, status, trigger_type, time_window, created_at',
      placeholders: '?, ?, ?, \'pending\', ?, ?, ?',
      params: [
        input.id,
        input.project_id,
        input.context_id,
        input.trigger_type,
        input.time_window,
        now,
      ],
    };
  },

  buildCompleteSql(data) {
    return {
      setClause: 'ideas_analyzed = ?, directions_analyzed = ?, ai_insights = ?, ai_narrative = ?, ai_recommendations = ?',
      params: [
        data.ideasAnalyzed,
        data.directionsAnalyzed,
        JSON.stringify(data.insights),
        data.narrative,
        JSON.stringify(data.recommendations),
      ],
    };
  },
});

export const executiveAnalysisRepository = {
  // Shared lifecycle from base
  ...base,

  /**
   * Get latest analysis for a project (null = global)
   */
  getLatest(projectId: string | null): DbExecutiveAnalysis | null {
    if (projectId === null) {
      return base.findOneWhere('project_id IS NULL ORDER BY created_at DESC LIMIT 1');
    }
    return base.findOneWhere('project_id = ? ORDER BY created_at DESC LIMIT 1', projectId);
  },

  /**
   * Get latest completed analysis for a project
   */
  getLatestCompleted(projectId: string | null): DbExecutiveAnalysis | null {
    if (projectId === null) {
      return base.findOneWhere(
        "project_id IS NULL AND status = 'completed' ORDER BY completed_at DESC LIMIT 1"
      );
    }
    return base.findOneWhere(
      "project_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1",
      projectId
    );
  },

  /**
   * Get running analysis for a project (should be 0 or 1)
   */
  getRunning(projectId: string | null): DbExecutiveAnalysis | null {
    if (projectId === null) {
      return base.findOneWhere(
        "project_id IS NULL AND status = 'running' ORDER BY started_at DESC LIMIT 1"
      );
    }
    return base.findOneWhere(
      "project_id = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1",
      projectId
    );
  },

  /**
   * Check if analysis is allowed (respects minimum gap)
   */
  canAnalyze(projectId: string | null, minGapHours: number = 1): boolean {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - minGapHours * 60 * 60 * 1000).toISOString();

    let recent;
    if (projectId === null) {
      recent = selectOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM executive_analysis
         WHERE project_id IS NULL AND status IN ('completed', 'running') AND created_at >= ?`,
        cutoff
      );
    } else {
      recent = selectOne<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM executive_analysis
         WHERE project_id = ? AND status IN ('completed', 'running') AND created_at >= ?`,
        projectId,
        cutoff
      );
    }

    return (recent?.count ?? 0) === 0;
  },

  /**
   * Get analysis history for a project
   */
  getHistory(projectId: string | null, limit: number = 10): DbExecutiveAnalysis[] {
    if (projectId === null) {
      return base.getHistoryWhere('project_id IS NULL', [], limit);
    }
    return base.getHistoryWhere('project_id = ?', [projectId], limit);
  },

  /**
   * Get all insights from completed analyses for a project
   */
  getAllInsights(projectId: string | null, limit: number = 20): ExecutiveAIInsight[] {
    const db = getDatabase();
    let rows;
    if (projectId === null) {
      rows = selectAll<{ ai_insights: string }>(
        db,
        `SELECT ai_insights FROM executive_analysis
         WHERE project_id IS NULL AND status = 'completed' AND ai_insights IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT ?`,
        limit
      );
    } else {
      rows = selectAll<{ ai_insights: string }>(
        db,
        `SELECT ai_insights FROM executive_analysis
         WHERE project_id = ? AND status = 'completed' AND ai_insights IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT ?`,
        projectId,
        limit
      );
    }

    const all: ExecutiveAIInsight[] = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.ai_insights);
        if (Array.isArray(parsed)) all.push(...parsed);
      } catch { /* skip corrupted rows */ }
    }
    return all;
  },

  /**
   * Clean up old failed/pending analyses
   */
  cleanupStale(olderThanDays: number = 7): number {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      DELETE FROM executive_analysis
      WHERE status IN ('failed', 'pending') AND created_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  },
};
