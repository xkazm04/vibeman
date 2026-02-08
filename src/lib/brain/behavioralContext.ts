/**
 * Behavioral Context
 * Computes and formats behavioral signals for prompt injection
 */

import { behavioralSignalDb, directionOutcomeDb, observabilityDb, contextDb, brainInsightDb, getDatabase } from '@/app/db';
import type {
  BehavioralContext,
  GitActivitySignalData,
  ImplementationSignalData,
  LearningInsight,
} from '@/app/db/models/brain.types';

/**
 * Get behavioral context for a project
 * Aggregates signals from the past N days into a structured context
 */
export function getBehavioralContext(
  projectId: string,
  windowDays: number = 7
): BehavioralContext {
  const hasSignals = behavioralSignalDb.hasSignals(projectId);

  if (!hasSignals) {
    return {
      hasData: false,
      currentFocus: {
        activeContexts: [],
        recentFiles: [],
        recentCommitThemes: [],
      },
      trending: {
        hotEndpoints: [],
        activeFeatures: [],
        neglectedAreas: [],
      },
      patterns: {
        successRate: 0,
        recentSuccesses: 0,
        recentFailures: 0,
        revertedCount: 0,
        averageTaskDuration: 0,
        preferredContexts: [],
      },
      topInsights: [],
    };
  }

  // Get context activity (aggregated by context)
  const contextActivity = behavioralSignalDb.getContextActivity(projectId, windowDays);
  const activeContexts = contextActivity
    .filter(c => c.context_id && c.context_name)
    .slice(0, 5)
    .map(c => {
      const base: { id: string; name: string; activityScore: number; keywords?: string[]; entryPoints?: Array<{ path: string; type: string }>; techStack?: string[] } = {
        id: c.context_id,
        name: c.context_name,
        activityScore: c.total_weight,
      };
      // Enrich with AI navigation metadata
      try {
        const ctx = contextDb.getContextById(c.context_id);
        if (ctx) {
          try { base.keywords = JSON.parse(ctx.keywords || '[]'); } catch {}
          try { base.entryPoints = JSON.parse(ctx.entry_points || '[]'); } catch {}
          try { base.techStack = JSON.parse(ctx.tech_stack || '[]'); } catch {}
        }
      } catch { /* enrichment is best-effort */ }
      return base;
    });

  // Get git activity signals for recent files and commit themes
  const gitSignals = behavioralSignalDb.getByTypeAndWindow(projectId, 'git_activity', windowDays);
  const recentFiles = extractRecentFiles(gitSignals);
  const recentCommitThemes = extractCommitThemes(gitSignals);

  // Get API usage trends from observability
  const hotEndpoints = getApiTrends(projectId, windowDays);

  // Extract active features from context activity
  const activeFeatures = contextActivity
    .slice(0, 5)
    .map(c => c.context_name)
    .filter(Boolean) as string[];

  // Identify neglected areas (contexts with very low activity)
  const neglectedAreas = findNeglectedAreas(contextActivity);

  // Get outcome statistics
  const outcomeStats = directionOutcomeDb.getStats(projectId, windowDays);

  // Calculate implementation patterns
  const implementationSignals = behavioralSignalDb.getByTypeAndWindow(
    projectId,
    'implementation',
    windowDays
  );
  const avgDuration = calculateAverageDuration(implementationSignals);

  // Get preferred contexts (contexts with most successful implementations)
  const preferredContexts = extractPreferredContexts(implementationSignals);

  // Get top insights (high-confidence, proven helpful)
  const topInsights = getTopEffectiveInsights(projectId);

  return {
    hasData: true,
    currentFocus: {
      activeContexts,
      recentFiles,
      recentCommitThemes,
    },
    trending: {
      hotEndpoints,
      activeFeatures,
      neglectedAreas,
    },
    patterns: {
      successRate: outcomeStats.total > 0
        ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
        : 0,
      recentSuccesses: outcomeStats.successful,
      recentFailures: outcomeStats.failed,
      revertedCount: outcomeStats.reverted,
      averageTaskDuration: avgDuration,
      preferredContexts,
    },
    topInsights,
  };
}

/**
 * Format behavioral context for direction generation prompt
 * Token-conscious: aims for ~500 tokens max
 */
export function formatBehavioralForPrompt(ctx: BehavioralContext): string {
  if (!ctx.hasData) {
    return '';
  }

  const sections: string[] = [];

  // Current Focus Section
  if (ctx.currentFocus.activeContexts.length > 0) {
    const contextList = ctx.currentFocus.activeContexts
      .map((c: { name: string; activityScore: number; entryPoints?: Array<{ path: string }>; keywords?: string[] }) => {
        const epStr = c.entryPoints?.[0]?.path ? ` → \`${c.entryPoints[0].path}\`` : '';
        const kwStr = c.keywords?.length ? ` [${c.keywords.slice(0, 3).join(', ')}]` : '';
        return `- **${c.name}**: activity ${c.activityScore.toFixed(1)}${epStr}${kwStr}`;
      })
      .join('\n');

    sections.push(`### Active Areas (Last 7 Days)\n${contextList}`);
  }

  // Recent Work Themes
  if (ctx.currentFocus.recentCommitThemes.length > 0) {
    const themes = ctx.currentFocus.recentCommitThemes.slice(0, 3).join(', ');
    sections.push(`### Recent Commit Themes\n${themes}`);
  }

  // API Trends
  if (ctx.trending.hotEndpoints.length > 0) {
    const trendList = ctx.trending.hotEndpoints
      .slice(0, 5)
      .map(e => {
        const icon = e.trend === 'up' ? '\u2191' : e.trend === 'down' ? '\u2193' : '\u2194';
        return `- \`${e.path}\`: ${icon} ${Math.abs(e.changePercent)}% ${e.trend}`;
      })
      .join('\n');

    sections.push(`### API Usage Trends\n${trendList}`);
  }

  // Implementation Patterns
  if (ctx.patterns.recentSuccesses > 0 || ctx.patterns.recentFailures > 0) {
    const total = ctx.patterns.recentSuccesses + ctx.patterns.recentFailures;
    const stats = [
      `- Success rate: ${ctx.patterns.successRate}% (${ctx.patterns.recentSuccesses}/${total})`,
    ];

    if (ctx.patterns.revertedCount > 0) {
      stats.push(`- Reverted: ${ctx.patterns.revertedCount} implementations`);
    }

    if (ctx.patterns.averageTaskDuration > 0) {
      const durationMin = Math.round(ctx.patterns.averageTaskDuration / 60000);
      stats.push(`- Average task duration: ${durationMin} minutes`);
    }

    sections.push(`### Implementation Success\n${stats.join('\n')}`);
  }

  // Neglected Areas (gentle reminder)
  if (ctx.trending.neglectedAreas.length > 0) {
    const areas = ctx.trending.neglectedAreas.slice(0, 3).join(', ');
    sections.push(`### Lower Activity Areas\n${areas} (consider if improvements needed)`);
  }

  // Learned Insights (proven helpful by effectiveness scoring)
  if (ctx.topInsights.length > 0) {
    const insightList = ctx.topInsights
      .map(i => `- **${i.title}** (${i.type}, ${i.confidence}% confidence): ${i.description}`)
      .join('\n');

    sections.push(`### Learned Insights (Proven Helpful)\n\nThese insights were generated by the Brain's reflection system and have been empirically validated as improving direction acceptance rates. **Apply these learnings when generating new directions:**\n\n${insightList}`);
  }

  // Suggested Focus
  const suggestions: string[] = [];
  if (ctx.currentFocus.activeContexts.length > 0) {
    suggestions.push(`Build on momentum in ${ctx.currentFocus.activeContexts[0].name}`);
  }
  if (ctx.patterns.revertedCount > 0) {
    suggestions.push(`Address reverted implementations (${ctx.patterns.revertedCount} recent)`);
  }
  if (ctx.trending.hotEndpoints.some(e => e.trend === 'up')) {
    suggestions.push('Optimize trending endpoints to handle increased usage');
  }

  if (suggestions.length > 0) {
    sections.push(`### Suggested Priorities\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `
---

## Current Development Focus

Based on recent activity patterns, here's what the user has been working on:

${sections.join('\n\n')}

---
`;
}

/**
 * Get top effective insights for a project
 * Filters for high-confidence insights with 'helpful' verdict from effectiveness scoring.
 * Uses the same algorithm as the effectiveness API to compute verdicts inline.
 */
function getTopEffectiveInsights(
  projectId: string,
  minConfidence: number = 80,
  limit: number = 5
): BehavioralContext['topInsights'] {
  try {
    const db = getDatabase();

    // Get all insights from brain_insights table with reflection timestamps
    const insightRows = brainInsightDb.getForEffectiveness(projectId);

    if (insightRows.length === 0) return [];

    // Get all resolved directions for effectiveness scoring
    const directions = db.prepare(`
      SELECT status, created_at
      FROM directions
      WHERE project_id = ? AND status IN ('accepted', 'rejected')
      ORDER BY created_at ASC
    `).all(projectId) as Array<{ status: string; created_at: string }>;

    // Need enough directions to compute effectiveness
    if (directions.length < 6) return []; // Need at least 3 before and 3 after

    const results: Array<{
      title: string;
      type: LearningInsight['type'];
      description: string;
      confidence: number;
      score: number;
    }> = [];

    for (const row of insightRows) {
      const insightDate = row.completed_at;
      if (!insightDate) continue;

      // Count directions before and after this insight
      const before = { accepted: 0, total: 0 };
      const after = { accepted: 0, total: 0 };

      for (const d of directions) {
        if (d.created_at <= insightDate) {
          before.total++;
          if (d.status === 'accepted') before.accepted++;
        } else {
          after.total++;
          if (d.status === 'accepted') after.accepted++;
        }
      }

      // Need sufficient sample size in both periods
      if (before.total < 3 || after.total < 3) continue;

      const preRate = before.accepted / before.total;
      const postRate = after.accepted / after.total;
      const score = ((postRate - preRate) / Math.max(preRate, 0.01)) * 100;

      // Only include helpful insights (score > 10%)
      if (score <= 10) continue;

      if (row.confidence >= minConfidence) {
        results.push({
          title: row.title,
          type: row.type,
          description: row.description,
          confidence: row.confidence,
          score,
        });
      }
    }

    // Sort by score descending, then confidence
    results.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

    // Deduplicate by title (keep highest scoring)
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    });

    return deduped.slice(0, limit).map(({ title, type, description, confidence }) => ({
      title,
      type,
      description,
      confidence,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract recent files from git signals
 */
function extractRecentFiles(signals: Array<{ data: string }>): string[] {
  const allFiles = new Set<string>();

  for (const signal of signals.slice(0, 10)) {
    try {
      const data = JSON.parse(signal.data) as GitActivitySignalData;
      for (const file of data.filesChanged.slice(0, 5)) {
        allFiles.add(file);
      }
    } catch {
      // Skip invalid signals
    }
  }

  return Array.from(allFiles).slice(0, 10);
}

/**
 * Extract commit themes from git signals
 */
function extractCommitThemes(signals: Array<{ data: string }>): string[] {
  const themes: string[] = [];

  for (const signal of signals.slice(0, 10)) {
    try {
      const data = JSON.parse(signal.data) as GitActivitySignalData;
      if (data.commitMessage) {
        // Extract first line of commit message
        const firstLine = data.commitMessage.split('\n')[0].trim();
        if (firstLine && !themes.includes(firstLine)) {
          themes.push(firstLine);
        }
      }
    } catch {
      // Skip invalid signals
    }
  }

  return themes.slice(0, 5);
}

/**
 * Get API usage trends from observability data
 */
function getApiTrends(
  projectId: string,
  days: number
): Array<{ path: string; trend: 'up' | 'down' | 'stable'; changePercent: number }> {
  try {
    const trends = observabilityDb.getUsageTrends(projectId, days);
    return trends
      .filter(t => t.direction !== 'stable' || t.change_percent > 20)
      .slice(0, 5)
      .map(t => ({
        path: t.endpoint,
        trend: t.direction,
        changePercent: t.change_percent,
      }));
  } catch {
    return [];
  }
}

/**
 * Find neglected areas (contexts with minimal recent activity)
 */
function findNeglectedAreas(
  contextActivity: Array<{ context_name: string; total_weight: number }>
): string[] {
  // Get contexts with very low weights (bottom quartile)
  if (contextActivity.length < 4) return [];

  const sorted = [...contextActivity].sort((a, b) => a.total_weight - b.total_weight);
  return sorted
    .slice(0, Math.ceil(sorted.length / 4))
    .filter(c => c.total_weight < 1.5)
    .map(c => c.context_name);
}

/**
 * Calculate average implementation duration
 */
function calculateAverageDuration(signals: Array<{ data: string }>): number {
  const durations: number[] = [];

  for (const signal of signals) {
    try {
      const data = JSON.parse(signal.data) as ImplementationSignalData;
      if (data.executionTimeMs && data.executionTimeMs > 0) {
        durations.push(data.executionTimeMs);
      }
    } catch {
      // Skip invalid signals
    }
  }

  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

/**
 * Extract preferred contexts from successful implementations
 */
function extractPreferredContexts(signals: Array<{ data: string; context_id: string | null }>): string[] {
  const contextCounts: Record<string, { success: number; total: number }> = {};

  for (const signal of signals) {
    try {
      const data = JSON.parse(signal.data) as ImplementationSignalData;
      const contextId = data.contextId || signal.context_id;
      if (contextId) {
        if (!contextCounts[contextId]) {
          contextCounts[contextId] = { success: 0, total: 0 };
        }
        contextCounts[contextId].total++;
        if (data.success) {
          contextCounts[contextId].success++;
        }
      }
    } catch {
      // Skip invalid signals
    }
  }

  // Return contexts with highest success rate (min 2 implementations)
  return Object.entries(contextCounts)
    .filter(([_, stats]) => stats.total >= 2 && stats.success / stats.total > 0.6)
    .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
    .slice(0, 3)
    .map(([contextId]) => contextId);
}
