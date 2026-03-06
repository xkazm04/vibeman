/**
 * useFocusFlow – Priority-based widget layout engine
 *
 * Scores dashboard widgets by urgency signals from the brain store and
 * splits them into primary (hero) vs secondary (sidebar) buckets.
 *
 * Reusable across any dashboard that needs priority-driven widget ordering.
 */

import { useMemo } from 'react';
import { useBrainStore } from '@/stores/brainStore';
import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';

export interface WidgetEntry {
  id: string;
  score: number;
}

export interface FocusFlowResult {
  primaryWidgets: WidgetEntry[];
  secondaryWidgets: WidgetEntry[];
  widgetPriorities: Record<string, number>;
}

const PRIMARY_THRESHOLD = 10;

/**
 * Compute widget urgency scores from brain store signals + anomalies,
 * then split into primary (score >= threshold) and secondary buckets.
 */
export function useFocusFlow(anomalies: SignalAnomaly[]): FocusFlowResult {
  const { outcomeStats } = useBrainStore();
  const { shouldTrigger, status: refStatus } = useBrainStore((s) => s.reflections.project);

  const widgetPriorities = useMemo(() => {
    const scores: Record<string, number> = {
      outcomes: 10,         // KPI always visible
      reflection: 5,        // Base priority
      effectiveness: 5,
      insights: 5,
      heatmap: 4,
      rhythm: 4,
      correlation: 3,
      nextUp: 3,
      focus: 4,
    };

    // Boost Reflection when trigger is pending or running
    if (shouldTrigger) scores.reflection += 20;
    if (refStatus === 'running') scores.reflection += 15;
    if (refStatus === 'failed') scores.reflection += 18;

    // Boost Outcomes when failures exist
    if (outcomeStats.failed > 0) scores.outcomes += 10;
    if (outcomeStats.reverted > 0) scores.outcomes += 8;
    const successRate = outcomeStats.total > 0
      ? outcomeStats.successful / outcomeStats.total
      : 1;
    if (successRate < 0.5 && outcomeStats.total > 0) scores.outcomes += 12;

    // Boost anomaly-related widgets
    const hasCriticalAnomaly = anomalies.some(a => a.severity === 'critical');
    const hasAnyAnomaly = anomalies.length > 0;
    if (hasCriticalAnomaly) {
      scores.heatmap += 12;
      scores.effectiveness += 8;
    } else if (hasAnyAnomaly) {
      scores.heatmap += 6;
    }

    return scores;
  }, [outcomeStats, shouldTrigger, refStatus, anomalies]);

  const { primaryWidgets, secondaryWidgets } = useMemo(() => {
    const all: WidgetEntry[] = Object.entries(widgetPriorities).map(([id, score]) => ({ id, score }));
    all.sort((a, b) => b.score - a.score);

    const primary: WidgetEntry[] = [];
    const secondary: WidgetEntry[] = [];
    for (const w of all) {
      if (w.score >= PRIMARY_THRESHOLD) {
        primary.push(w);
      } else {
        secondary.push(w);
      }
    }
    return { primaryWidgets: primary, secondaryWidgets: secondary };
  }, [widgetPriorities]);

  return { primaryWidgets, secondaryWidgets, widgetPriorities };
}
