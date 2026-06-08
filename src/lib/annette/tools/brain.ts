/**
 * Brain Tools - Implementation for Annette's brain-related tool calls
 */

import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { directionOutcomeRepository } from '@/app/db/repositories/direction-outcome.repository';
import { brainReflectionRepository } from '@/app/db/repositories/brain-reflection.repository';
import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import type { BehavioralSignalType } from '@/types/signals';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';

export async function executeBrainTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  switch (name) {
    case 'get_behavioral_context': {
      const windowDays = parseInt(String(input.window_days || '7'), 10);
      const ctx = getBehavioralContext(projectId, windowDays);

      if (!ctx.hasData) {
        return JSON.stringify({
          hasData: false,
          message: 'No behavioral data collected yet. The Brain system will start learning as you accept/reject directions and implement changes.',
        });
      }

      return JSON.stringify({
        hasData: true,
        currentFocus: ctx.currentFocus,
        trending: ctx.trending,
        patterns: ctx.patterns,
      });
    }

    case 'get_outcomes': {
      const limit = parseInt(String(input.limit || '10'), 10);
      const stats = directionOutcomeRepository.getStats(projectId, 30);
      const recent = directionOutcomeRepository.getByProject(projectId, { limit });

      return JSON.stringify({
        stats: {
          total: stats.total,
          successful: stats.successful,
          failed: stats.failed,
          reverted: stats.reverted,
          pending: stats.pending,
          successRate: stats.total > 0
            ? Math.round((stats.successful / stats.total) * 100)
            : 0,
        },
        recentOutcomes: recent.map(o => ({
          directionId: o.direction_id,
          success: o.execution_success,
          wasReverted: o.was_reverted,
          filesChanged: o.files_changed ? JSON.parse(o.files_changed).length : 0,
          completedAt: o.execution_completed_at,
        })),
      });
    }

    case 'get_reflection_status': {
      const lastReflection = brainReflectionRepository.getLatestCompleted(projectId);
      const running = brainReflectionRepository.getRunning(projectId);

      // Count direction decisions (accepted/rejected) since last reflection
      let decisionCount = 0;
      const allDirections = directionRepository.getDirectionsByProject(projectId);
      const lastReflectedAt = lastReflection?.completed_at;
      if (lastReflectedAt) {
        decisionCount = allDirections.filter(d =>
          (d.status === 'accepted' || d.status === 'rejected') &&
          d.updated_at > lastReflectedAt
        ).length;
      } else {
        decisionCount = allDirections.filter(d =>
          d.status === 'accepted' || d.status === 'rejected'
        ).length;
      }

      return JSON.stringify({
        isRunning: !!running,
        lastReflectionAt: lastReflection?.completed_at || null,
        decisionsSinceLastReflection: decisionCount,
        threshold: 20,
        shouldTrigger: decisionCount >= 20,
        progressPercent: Math.min(100, Math.round((decisionCount / 20) * 100)),
      });
    }

    case 'trigger_reflection': {
      // Check if already running
      const existingRunning = brainReflectionRepository.getRunning(projectId);
      if (existingRunning) {
        return JSON.stringify({
          success: false,
          message: 'A reflection is already running.',
          reflectionId: existingRunning.id,
        });
      }

      return JSON.stringify({
        success: true,
        message: 'Reflection trigger requested. Use the Brain UI or POST /api/brain/reflection to execute with project context.',
        note: 'Reflection requires projectName and projectPath which should be provided via the API endpoint.',
      });
    }

    case 'get_signals': {
      const signalType = input.signal_type as BehavioralSignalType | undefined;
      const limit = parseInt(String(input.limit || '20'), 10);

      let signals;
      if (signalType) {
        signals = behavioralSignalRepository.getByTypeAndWindow(projectId, signalType, 7);
      } else {
        signals = behavioralSignalRepository.getByProject(projectId, { limit });
      }

      return JSON.stringify({
        count: signals.length,
        signals: signals.slice(0, limit).map(s => ({
          type: s.signal_type,
          contextName: s.context_name,
          weight: s.weight,
          timestamp: s.timestamp,
          data: JSON.parse(s.data),
        })),
      });
    }

    case 'get_insights': {
      const insights = brainInsightRepository.getAllInsights(projectId, 20);
      if (insights.length === 0) {
        return JSON.stringify({
          hasInsights: false,
          message: 'No reflection insights available yet. Trigger a reflection after accumulating decisions.',
        });
      }

      const lastReflection = brainReflectionRepository.getLatestCompleted(projectId);
      return JSON.stringify({
        hasInsights: true,
        reflectionDate: lastReflection?.completed_at ?? null,
        directionsAnalyzed: lastReflection?.directions_analyzed ?? 0,
        insights,
      });
    }

    case 'get_project_health': {
      const ctx = getBehavioralContext(projectId, 14);

      // Get outcome stats
      const outcomeStats = directionOutcomeRepository.getStats(projectId, 30);
      const successRate = outcomeStats.total > 0
        ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
        : null;

      // Get direction counts
      const directions = directionRepository.getDirectionsByProject(projectId);
      const directionStats = {
        total: directions.length,
        pending: directions.filter(d => d.status === 'pending').length,
        accepted: directions.filter(d => d.status === 'accepted').length,
        rejected: directions.filter(d => d.status === 'rejected').length,
      };

      // Get idea counts
      const ideas = ideaRepository.getIdeasByProject(projectId);
      const ideaStats = {
        total: ideas.length,
        pending: ideas.filter(i => i.status === 'pending').length,
        accepted: ideas.filter(i => i.status === 'accepted').length,
        implemented: ideas.filter(i => i.status === 'implemented').length,
      };

      // Get context count
      const contexts = contextRepository.getContextsByProject(projectId);

      // Get reflection stats
      const reflectionStats = brainReflectionRepository.getStats(projectId);

      // Build strengths / weaknesses from behavioral data
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (successRate !== null && successRate >= 70) {
        strengths.push(`High implementation success rate (${successRate}%)`);
      } else if (successRate !== null && successRate < 50) {
        weaknesses.push(`Low implementation success rate (${successRate}%)`);
      }

      if (ctx.hasData && ctx.patterns.revertedCount > 0) {
        weaknesses.push(`${ctx.patterns.revertedCount} reverted implementations recently`);
      }

      if (directionStats.pending > 20) {
        weaknesses.push(`Large triage backlog (${directionStats.pending} pending directions)`);
      }

      if (ctx.hasData && ctx.trending.neglectedAreas.length > 0) {
        weaknesses.push(`Neglected areas: ${ctx.trending.neglectedAreas.slice(0, 3).join(', ')}`);
      }

      if (reflectionStats.totalInsights > 10) {
        strengths.push(`Rich learning history (${reflectionStats.totalInsights} brain insights)`);
      }

      if (ctx.hasData && ctx.trending.activeFeatures.length > 0) {
        strengths.push(`Active development in ${ctx.trending.activeFeatures.length} features`);
      }

      return JSON.stringify({
        contexts: contexts.length,
        ideas: ideaStats,
        directions: directionStats,
        outcomes: {
          successRate,
          total: outcomeStats.total,
          successful: outcomeStats.successful,
          failed: outcomeStats.failed,
          reverted: outcomeStats.reverted,
        },
        reflections: {
          total: reflectionStats.total,
          completed: reflectionStats.completed,
          lastReflection: reflectionStats.lastReflection,
          totalInsights: reflectionStats.totalInsights,
        },
        strengths,
        weaknesses,
      });
    }

    case 'get_learning_timeline': {
      const days = parseInt(String(input.days || '30'), 10);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Get reflections within the window
      const reflections = brainReflectionRepository.getByProject(projectId, 50);
      const recentReflections = reflections.filter(
        r => r.status === 'completed' && r.completed_at && r.completed_at >= cutoffDate
      );

      // Get insights for recent reflections
      const timeline: Array<{
        date: string;
        reflectionId: string;
        directionsAnalyzed: number;
        insights: Array<{
          type: string;
          title: string;
          confidence: number;
        }>;
      }> = [];

      for (const reflection of recentReflections) {
        const insightRows = brainInsightRepository.getByReflection(reflection.id);
        timeline.push({
          date: reflection.completed_at!,
          reflectionId: reflection.id,
          directionsAnalyzed: reflection.directions_analyzed ?? 0,
          insights: insightRows.map(i => ({
            type: i.type,
            title: i.title,
            confidence: i.confidence,
          })),
        });
      }

      // Sort chronologically (oldest first)
      timeline.sort((a, b) => a.date.localeCompare(b.date));

      // Compute summary
      const totalInsights = timeline.reduce((sum, t) => sum + t.insights.length, 0);
      const insightTypes: Record<string, number> = {};
      for (const entry of timeline) {
        for (const insight of entry.insights) {
          insightTypes[insight.type] = (insightTypes[insight.type] || 0) + 1;
        }
      }

      return JSON.stringify({
        days,
        reflections: recentReflections.length,
        totalInsights,
        insightsByType: insightTypes,
        timeline,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown brain tool: ${name}` });
  }
}
