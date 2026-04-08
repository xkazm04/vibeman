/**
 * CorrelationActionSuggestions
 * Interprets strong signal correlations and generates actionable
 * recommendations as dismissible cards. Inspired by Amplitude auto-insights.
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import type { SignalCorrelation } from '../lib/queries/apiClient';
import { BRAIN_CHART } from '../lib/brainChartColors';
import SectionHeading from './SectionHeading';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionSuggestion {
  id: string;
  icon: 'insight' | 'warning' | 'optimization';
  title: string;
  description: string;
  source: string;
  target: string;
  coefficient: number;
}

interface Props {
  correlations: SignalCorrelation[];
}

// ── Signal label map ──────────────────────────────────────────────────────────

const SIGNAL_NAMES: Record<string, string> = {
  git_activity: 'Git activity',
  api_focus: 'API focus',
  context_focus: 'Context focus',
  implementation: 'Implementation',
  cross_task_analysis: 'Cross-task analysis',
  cross_task_selection: 'Cross-task selection',
  cli_memory: 'CLI memory',
};

const name = (type: string) => SIGNAL_NAMES[type] ?? type;

// ── Suggestion generation ─────────────────────────────────────────────────────

function generateSuggestions(correlations: SignalCorrelation[]): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  for (const c of correlations) {
    if (c.sampleCount < 3) continue;

    const src = name(c.sourceType);
    const tgt = name(c.targetType);
    const id = `${c.sourceType}-${c.targetType}`;
    const lag = Math.round(c.avgLagMinutes);
    const followPct = Math.round(c.followRate * 100);

    // Strong positive correlation with temporal lag → causal pattern
    if (c.strength === 'strong' && c.coefficient > 0 && c.avgLagMinutes > 1) {
      suggestions.push({
        id,
        icon: 'insight',
        title: `${src} consistently precedes ${tgt}`,
        description: `${followPct}% of ${src.toLowerCase()} events are followed by ${tgt.toLowerCase()} ~${lag}min later. Consider automating or batching this workflow to reduce context-switching.`,
        source: c.sourceType,
        target: c.targetType,
        coefficient: c.coefficient,
      });
      continue;
    }

    // Strong positive, near-simultaneous → tightly coupled
    if (c.strength === 'strong' && c.coefficient > 0 && c.avgLagMinutes <= 1) {
      suggestions.push({
        id,
        icon: 'optimization',
        title: `${src} and ${tgt} are tightly coupled`,
        description: `These signals fire almost simultaneously (r=${c.coefficient.toFixed(2)}). If they share a trigger, consider consolidating into a single workflow step.`,
        source: c.sourceType,
        target: c.targetType,
        coefficient: c.coefficient,
      });
      continue;
    }

    // Strong negative correlation → inverse pattern
    if (c.strength === 'strong' && c.coefficient < 0) {
      suggestions.push({
        id,
        icon: 'warning',
        title: `${src} inversely correlates with ${tgt}`,
        description: `When ${src.toLowerCase()} increases, ${tgt.toLowerCase()} decreases (r=${c.coefficient.toFixed(2)}). This may indicate a resource contention pattern worth investigating.`,
        source: c.sourceType,
        target: c.targetType,
        coefficient: c.coefficient,
      });
      continue;
    }

    // Moderate correlation with high follow rate → emerging pattern
    if (c.strength === 'moderate' && c.followRate > 0.6 && c.avgLagMinutes > 1) {
      suggestions.push({
        id,
        icon: 'insight',
        title: `Emerging pattern: ${src} → ${tgt}`,
        description: `${followPct}% follow rate with ~${lag}min lag suggests a developing workflow pattern. Monitor this to see if it strengthens into a reliable signal.`,
        source: c.sourceType,
        target: c.targetType,
        coefficient: c.coefficient,
      });
      continue;
    }

    // Moderate negative → potential bottleneck
    if (c.strength === 'moderate' && c.coefficient < -0.3) {
      suggestions.push({
        id,
        icon: 'warning',
        title: `Potential bottleneck between ${src} and ${tgt}`,
        description: `Moderate inverse correlation (r=${c.coefficient.toFixed(2)}) may indicate these activities compete for attention. Consider scheduling them in separate focus blocks.`,
        source: c.sourceType,
        target: c.targetType,
        coefficient: c.coefficient,
      });
    }
  }

  // Deduplicate symmetric pairs (A→B and B→A) — keep the one with higher |coefficient|
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const pairKey = [s.source, s.target].sort().join(':');
    if (seen.has(pairKey)) return false;
    seen.add(pairKey);
    return true;
  }).slice(0, 4); // Cap at 4 suggestions
}

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP = {
  insight: { Icon: Lightbulb, color: BRAIN_CHART.positive },
  warning: { Icon: AlertTriangle, color: BRAIN_CHART.warning },
  optimization: { Icon: Zap, color: '#a855f7' },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CorrelationActionSuggestions({ correlations }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(() => generateSuggestions(correlations), [correlations]);

  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-2 mb-5">
      <SectionHeading>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />
          Suggested Actions
        </span>
      </SectionHeading>
      <AnimatePresence mode="popLayout">
        {visible.map((s, i) => {
          const { Icon, color } = ICON_MAP[s.icon];
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
              transition={{ delay: i * 0.04 }}
              className="group relative flex items-start gap-3 p-3 rounded-xl"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              <div
                className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-300 mb-0.5">
                  {s.title}
                </div>
                <div className="text-2xs text-zinc-500 leading-relaxed">
                  {s.description}
                </div>
              </div>

              <button
                onClick={() => dismiss(s.id)}
                className="flex-shrink-0 p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors opacity-0 group-hover:opacity-100"
                title="Dismiss suggestion"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
