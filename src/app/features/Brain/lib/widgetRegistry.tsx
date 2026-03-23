/**
 * Declarative Widget Registry for Brain Dashboard
 *
 * Each widget declares its base priority, scoring boosts, and render function.
 * BrainLayout iterates the registry, computes scores, sorts, and renders.
 * Adding a new widget = adding one entry here, zero layout changes.
 */

import OutcomesSummary from '../components/OutcomesSummary';
import ReflectionStatus from '../components/ReflectionStatus';
import BrainEffectivenessWidget from '../components/BrainEffectivenessWidget';
import InsightsPanel from '../components/InsightsPanel';
import ActivityHeatmap from '../components/ActivityHeatmap';
import CorrelationMatrix from '../components/CorrelationMatrix';
import NextUpCard from '../components/NextUpCard';
import TemporalRhythmHeatmap from '../components/TemporalRhythmHeatmap';
import BehavioralFocusPanel from '../components/BehavioralFocusPanel';
import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';

// ── Scoring context passed to each widget's boost function ──────────────

export interface WidgetScoringContext {
  outcomeStats: { total: number; successful: number; failed: number; reverted: number };
  shouldTrigger: boolean;
  refStatus: string;
  anomalies: SignalAnomaly[];
}

// ── Render context passed to each widget's render function ──────────────

export interface WidgetRenderContext {
  scope: 'project' | 'global';
  isGlobalMode: boolean;
  activeProject: { id: string; name?: string; path?: string } | null;
  isLoadingOutcomes: boolean;
  isLoadingContext: boolean;
  isLoading: boolean;
  compact?: boolean;
}

// ── Widget definition ───────────────────────────────────────────────────

export type WidgetId =
  | 'outcomes'
  | 'reflection'
  | 'effectiveness'
  | 'insights'
  | 'heatmap'
  | 'rhythm'
  | 'correlation'
  | 'nextUp'
  | 'focus';

export interface WidgetDefinition {
  id: WidgetId;
  basePriority: number;
  /** Return additional score boost based on current signals (pure function) */
  boost: (ctx: WidgetScoringContext) => number;
  /** Render the widget content given current layout context */
  render: (ctx: WidgetRenderContext) => React.ReactNode;
}

// ── Registry ────────────────────────────────────────────────────────────

export const widgetRegistry: WidgetDefinition[] = [
  {
    id: 'outcomes',
    basePriority: 10,
    boost: ({ outcomeStats }) => {
      let b = 0;
      if (outcomeStats.failed > 0) b += 10;
      if (outcomeStats.reverted > 0) b += 8;
      const rate = outcomeStats.total > 0 ? outcomeStats.successful / outcomeStats.total : 1;
      if (rate < 0.5 && outcomeStats.total > 0) b += 12;
      return b;
    },
    render: ({ isLoadingOutcomes }) => <OutcomesSummary isLoading={isLoadingOutcomes} />,
  },
  {
    id: 'reflection',
    basePriority: 5,
    boost: ({ shouldTrigger, refStatus }) => {
      let b = 0;
      if (shouldTrigger) b += 20;
      if (refStatus === 'running') b += 15;
      if (refStatus === 'failed') b += 18;
      return b;
    },
    render: ({ isLoading, compact }) => (
      <div className={compact ? '' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
        <ReflectionStatus isLoading={isLoading} scope="project" />
        {!compact && <ReflectionStatus isLoading={isLoading} scope="global" />}
      </div>
    ),
  },
  {
    id: 'effectiveness',
    basePriority: 5,
    boost: ({ anomalies }) =>
      anomalies.some((a) => a.severity === 'critical') ? 8 : 0,
    render: ({ scope }) => <BrainEffectivenessWidget scope={scope} />,
  },
  {
    id: 'insights',
    basePriority: 5,
    boost: () => 0,
    render: ({ scope }) => <InsightsPanel scope={scope} />,
  },
  {
    id: 'heatmap',
    basePriority: 4,
    boost: ({ anomalies }) => {
      if (anomalies.some((a) => a.severity === 'critical')) return 12;
      if (anomalies.length > 0) return 6;
      return 0;
    },
    render: ({ scope }) => <ActivityHeatmap scope={scope} />,
  },
  {
    id: 'rhythm',
    basePriority: 4,
    boost: () => 0,
    render: ({ scope }) => <TemporalRhythmHeatmap scope={scope} />,
  },
  {
    id: 'correlation',
    basePriority: 3,
    boost: () => 0,
    render: ({ scope }) => <CorrelationMatrix scope={scope} />,
  },
  {
    id: 'nextUp',
    basePriority: 3,
    boost: () => 0,
    render: ({ isGlobalMode, activeProject, scope }) => (
      <NextUpCard
        projectId={isGlobalMode ? null : activeProject?.id ?? null}
        scope={scope}
      />
    ),
  },
  {
    id: 'focus',
    basePriority: 4,
    boost: () => 0,
    render: ({ isLoadingContext, scope }) => (
      <BehavioralFocusPanel isLoading={isLoadingContext} scope={scope} />
    ),
  },
];

// ── Lookup map for O(1) access by id ────────────────────────────────────

const registryMap = new Map(widgetRegistry.map((w) => [w.id, w]));

export function getWidgetDefinition(id: WidgetId): WidgetDefinition | undefined {
  return registryMap.get(id);
}

// ── Scoring helper ──────────────────────────────────────────────────────

export interface ScoredWidget {
  id: WidgetId;
  score: number;
}

export function scoreWidgets(ctx: WidgetScoringContext): ScoredWidget[] {
  return widgetRegistry
    .map((w) => ({ id: w.id, score: w.basePriority + w.boost(ctx) }))
    .sort((a, b) => b.score - a.score);
}
