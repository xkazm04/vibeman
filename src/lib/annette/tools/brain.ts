/**
 * Brain Tools - Implementation for Annette's brain-related tool calls
 */

import { behavioralSignalDb, directionOutcomeDb, brainReflectionDb, directionDb } from '@/app/db';
import { BehavioralSignalType } from '@/app/db';
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
      const stats = directionOutcomeDb.getStats(projectId, 30);
      const recent = directionOutcomeDb.getByProject(projectId, { limit });

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
      const lastReflection = brainReflectionDb.getLatestCompleted(projectId);
      const running = brainReflectionDb.getRunning(projectId);

      // Count direction decisions (accepted/rejected) since last reflection
      let decisionCount = 0;
      const allDirections = directionDb.getDirectionsByProject(projectId);
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
      const existingRunning = brainReflectionDb.getRunning(projectId);
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
        signals = behavioralSignalDb.getByTypeAndWindow(projectId, signalType, 7);
      } else {
        signals = behavioralSignalDb.getByProject(projectId, { limit });
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
      const lastReflection = brainReflectionDb.getLatestCompleted(projectId);
      if (!lastReflection || !lastReflection.insights_generated) {
        return JSON.stringify({
          hasInsights: false,
          message: 'No reflection insights available yet. Trigger a reflection after accumulating decisions.',
        });
      }

      const insights = JSON.parse(lastReflection.insights_generated);
      return JSON.stringify({
        hasInsights: true,
        reflectionDate: lastReflection.completed_at,
        directionsAnalyzed: lastReflection.directions_analyzed,
        insights,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown brain tool: ${name}` });
  }
}
