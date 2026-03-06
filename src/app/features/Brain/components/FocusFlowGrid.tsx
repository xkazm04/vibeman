/**
 * FocusFlowGrid – Adaptive priority-based widget grid
 *
 * Renders primary widgets in a full-width hero area and secondary widgets
 * in a collapsible sidebar (desktop) or stacked below (mobile).
 * Uses Framer Motion LayoutGroup + AnimatePresence for fluid transitions.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Focus, ChevronRight } from 'lucide-react';
import OutcomesSummary from './OutcomesSummary';
import ReflectionStatus from './ReflectionStatus';
import BrainEffectivenessWidget from './BrainEffectivenessWidget';
import InsightsPanel from './InsightsPanel';
import ActivityHeatmap from './ActivityHeatmap';
import CorrelationMatrix from './CorrelationMatrix';
import NextUpCard from './NextUpCard';
import BehavioralFocusPanel from './BehavioralFocusPanel';
import TemporalRhythmHeatmap from './TemporalRhythmHeatmap';
import type { WidgetEntry } from '../lib/useFocusFlow';

interface FocusFlowGridProps {
  primaryWidgets: WidgetEntry[];
  secondaryWidgets: WidgetEntry[];
  scope: 'project' | 'global';
  isGlobalMode: boolean;
  activeProject: { id: string; name?: string; path?: string } | null;
  isLoadingOutcomes: boolean;
  isLoadingContext: boolean;
  isLoading: boolean;
}

export default function FocusFlowGrid({
  primaryWidgets,
  secondaryWidgets,
  scope,
  isGlobalMode,
  activeProject,
  isLoadingOutcomes,
  isLoadingContext,
  isLoading,
}: FocusFlowGridProps) {
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);

  return (
    <div className="flex-1 overflow-auto p-6">
      <LayoutGroup>
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* ── Primary Focus Area ── */}
          <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${secondaryWidgets.length > 0 && !secondaryCollapsed ? 'lg:pr-0' : ''}`}>
            {primaryWidgets.map((w, i) => (
              <FocusWidget key={w.id} widgetId={w.id} index={i} score={w.score} scope={scope} isGlobalMode={isGlobalMode} activeProject={activeProject} isLoadingOutcomes={isLoadingOutcomes} isLoadingContext={isLoadingContext} isLoading={isLoading} />
            ))}
          </div>

          {/* ── Secondary Sidebar ── */}
          {secondaryWidgets.length > 0 && (
            <div className="flex-shrink-0 hidden lg:block">
              <div className="sticky top-0">
                <button
                  onClick={() => setSecondaryCollapsed(c => !c)}
                  className="flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-md text-2xs font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/30 transition-all"
                >
                  <Focus className="w-3 h-3" />
                  <span>{secondaryCollapsed ? 'Show' : 'Hide'} secondary</span>
                  <motion.div
                    animate={{ rotate: secondaryCollapsed ? 0 : 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </motion.div>
                  {secondaryCollapsed && (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                      {secondaryWidgets.length}
                    </span>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {!secondaryCollapsed && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 340, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <div className="w-[340px] space-y-4">
                        {secondaryWidgets.map((w, i) => (
                          <FocusWidget key={w.id} widgetId={w.id} index={i} score={w.score} scope={scope} isGlobalMode={isGlobalMode} activeProject={activeProject} isLoadingOutcomes={isLoadingOutcomes} isLoadingContext={isLoadingContext} isLoading={isLoading} compact />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Secondary widgets on mobile (no sidebar, just stacked below primary) */}
        {secondaryWidgets.length > 0 && (
          <div className="max-w-7xl mx-auto lg:hidden mt-6 space-y-6">
            {secondaryWidgets.map((w, i) => (
              <FocusWidget key={w.id} widgetId={w.id} index={i + primaryWidgets.length} score={w.score} scope={scope} isGlobalMode={isGlobalMode} activeProject={activeProject} isLoadingOutcomes={isLoadingOutcomes} isLoadingContext={isLoadingContext} isLoading={isLoading} />
            ))}
          </div>
        )}
      </LayoutGroup>
    </div>
  );
}

// ── Focus Widget ─────────────────────────────────────────────────────────────

interface FocusWidgetProps {
  widgetId: string;
  index: number;
  score: number;
  scope: 'project' | 'global';
  isGlobalMode: boolean;
  activeProject: { id: string; name?: string; path?: string } | null;
  isLoadingOutcomes: boolean;
  isLoadingContext: boolean;
  isLoading: boolean;
  compact?: boolean;
}

const SMOOTH_SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

function FocusWidget({ widgetId, index, score, scope, isGlobalMode, activeProject, isLoadingOutcomes, isLoadingContext, isLoading, compact }: FocusWidgetProps) {
  const isHighPriority = score >= 15;
  const delay = index * 0.04;

  const content = (() => {
    switch (widgetId) {
      case 'outcomes':
        return <OutcomesSummary isLoading={isLoadingOutcomes} />;
      case 'reflection':
        return (
          <div className={compact ? '' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
            <ReflectionStatus isLoading={isLoading} scope="project" />
            {!compact && <ReflectionStatus isLoading={isLoading} scope="global" />}
          </div>
        );
      case 'effectiveness':
        return <BrainEffectivenessWidget scope={scope} />;
      case 'insights':
        return <InsightsPanel scope={scope} />;
      case 'heatmap':
        return <ActivityHeatmap scope={scope} />;
      case 'rhythm':
        return <TemporalRhythmHeatmap scope={scope} />;
      case 'correlation':
        return <CorrelationMatrix scope={scope} />;
      case 'nextUp':
        return (
          <NextUpCard
            projectId={isGlobalMode ? null : activeProject?.id ?? null}
            scope={scope}
          />
        );
      case 'focus':
        return <BehavioralFocusPanel isLoading={isLoadingContext} scope={scope} />;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <motion.div
      layout
      layoutId={`focus-${widgetId}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, layout: SMOOTH_SPRING }}
      className={`relative ${isHighPriority && !compact ? 'ring-1 ring-purple-500/20 rounded-xl' : ''}`}
    >
      {isHighPriority && !compact && (
        <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25">
          <Focus className="w-2.5 h-2.5 text-purple-400" />
          <span className="text-2xs font-medium text-purple-400">Priority</span>
        </div>
      )}
      {content}
    </motion.div>
  );
}
