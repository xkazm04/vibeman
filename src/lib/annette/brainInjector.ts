/**
 * Brain Injector
 * Formats brain behavioral context for injection into Annette's system prompt
 */

import { getBehavioralContext, formatBehavioralForPrompt } from '@/lib/brain/behavioralContext';
import { directionOutcomeDb, brainInsightDb, contextDb } from '@/app/db';
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

  // Context Map Summary (~200 tokens)
  const contextMapSummary = getContextMapSummary(projectId);
  if (contextMapSummary) {
    parts.push(`### Context Map\n${contextMapSummary}`);
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
    const insights = brainInsightDb.getAllInsights(projectId, 3);

    if (insights.length === 0) return '';

    // Take top 3 most relevant insights
    return insights
      .slice(0, 3)
      .map(i => `- [${i.type}] ${i.title}: ${i.description}`)
      .join('\n');
  } catch {
    return '';
  }
}

function getContextMapSummary(projectId: string): string {
  try {
    const behavioralCtx = getBehavioralContext(projectId);
    const activeIds = behavioralCtx.currentFocus?.activeContexts
      ?.slice(0, 5)
      .map((c: { id: string }) => c.id) || [];

    if (activeIds.length === 0) return '';

    const lines: string[] = [];
    for (const id of activeIds) {
      const ctx = contextDb.getContextById(id);
      if (!ctx) continue;

      let keywords: string[] = [];
      let entryPoints: Array<{ path: string; type: string }> = [];
      try { keywords = JSON.parse(ctx.keywords || '[]'); } catch {}
      try { entryPoints = JSON.parse(ctx.entry_points || '[]'); } catch {}

      if (keywords.length > 0 || entryPoints.length > 0) {
        const kwStr = keywords.length > 0 ? ` [${keywords.slice(0, 4).join(', ')}]` : '';
        const epStr = entryPoints.length > 0 ? ` → ${entryPoints[0].path}` : '';
        lines.push(`- **${ctx.name}**${kwStr}${epStr}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : '';
  } catch {
    return '';
  }
}
