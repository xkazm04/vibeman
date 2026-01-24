/**
 * Brain Injector
 * Formats brain behavioral context for injection into Annette's system prompt
 */

import { getBehavioralContext, formatBehavioralForPrompt } from '@/lib/brain/behavioralContext';
import { directionOutcomeDb, brainReflectionDb } from '@/app/db';
import { logger } from '@/lib/logger';

export interface BrainSnapshot {
  formattedContext: string;
  outcomesSummary: string;
  reflectionInsights: string;
}

/**
 * Get a complete brain snapshot for the system prompt
 * This combines behavioral context, outcomes, and reflection insights
 */
export function getBrainSnapshot(projectId: string): BrainSnapshot {
  try {
    // Layer 4: Brain Knowledge
    const behavioralContext = getBehavioralContext(projectId);
    const formattedContext = formatBehavioralForPrompt(behavioralContext);

    // Recent outcomes summary
    const outcomesSummary = getOutcomesSummary(projectId);

    // Latest reflection insights
    const reflectionInsights = getReflectionInsights(projectId);

    return {
      formattedContext,
      outcomesSummary,
      reflectionInsights,
    };
  } catch (error) {
    logger.error('Failed to get brain snapshot', { projectId, error });
    return {
      formattedContext: '',
      outcomesSummary: '',
      reflectionInsights: '',
    };
  }
}

/**
 * Format the complete brain context string for the system prompt (~500 tokens)
 */
export function formatBrainForPrompt(projectId: string): string {
  const snapshot = getBrainSnapshot(projectId);
  const parts: string[] = [];

  if (snapshot.formattedContext) {
    parts.push(snapshot.formattedContext);
  }

  if (snapshot.outcomesSummary) {
    parts.push(`### Recent Outcomes\n${snapshot.outcomesSummary}`);
  }

  if (snapshot.reflectionInsights) {
    parts.push(`### Learning Insights\n${snapshot.reflectionInsights}`);
  }

  if (parts.length === 0) {
    return 'No brain data available yet. The system will learn from your decisions over time.';
  }

  return parts.join('\n\n');
}

function getOutcomesSummary(projectId: string): string {
  try {
    const stats = directionOutcomeDb.getStats(projectId, 14); // 2-week window
    if (!stats || stats.total === 0) return '';

    const rate = stats.total > 0
      ? Math.round((stats.successful / stats.total) * 100)
      : 0;

    const lines: string[] = [
      `- Success rate: ${rate}% (${stats.successful}/${stats.total} directions)`,
    ];

    if (stats.reverted > 0) {
      lines.push(`- Reverted: ${stats.reverted} implementations`);
    }

    if (stats.pending > 0) {
      lines.push(`- Pending outcomes: ${stats.pending}`);
    }

    return lines.join('\n');
  } catch {
    return '';
  }
}

function getReflectionInsights(projectId: string): string {
  try {
    const lastReflection = brainReflectionDb.getLatestCompleted(projectId);
    if (!lastReflection || !lastReflection.insights_generated) return '';

    const insights = JSON.parse(lastReflection.insights_generated) as Array<{
      type: string;
      insight: string;
    }>;

    if (insights.length === 0) return '';

    // Take top 3 most relevant insights
    return insights
      .slice(0, 3)
      .map(i => `- [${i.type}] ${i.insight}`)
      .join('\n');
  } catch {
    return '';
  }
}
