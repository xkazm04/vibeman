/**
 * Brain Layout
 * Main dashboard for Brain 2.0 - Behavioral Learning + Autonomous Reflection
 *
 * Uses an Adaptive Focus Flow layout on the dashboard tab:
 * - Widgets are scored by urgency signals from the brain store
 * - High-priority widgets are promoted to a full-width "hero" section
 * - Secondary widgets are grouped in a collapsible sidebar
 * - Framer Motion layout animations fluidly rearrange on priority changes
 */

'use client';

import { useEffect, useState, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { duration, easing, transition } from '@/lib/motion';
import { Brain, Activity, AlertCircle, Layers, Clock, Sparkles, AlertTriangle, X, Castle, Focus, BookOpen } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useBrainStore } from '@/stores/brainStore';
import { GridBackground } from './components/variants/GridPrimitives';
import { useApplicationSession, useSessionAbortSignals } from '@/lib/session';
import { useReflectionEvents } from './lib/useReflectionEvents';
import ReflectionStatus from './components/ReflectionStatus';
import ReflectionHistoryPanel from './components/ReflectionHistoryPanel';
import { scoreWidgets, getWidgetDefinition } from './lib/widgetRegistry';
import type { WidgetId, WidgetRenderContext } from './lib/widgetRegistry';
import type { SignalAnomaly, AnomalySeverity } from '@/lib/brain/anomalyDetector';

const EventCanvasD3 = lazy(() => import('./sub_MemoryCanvas/EventCanvasD3'));
const EventCanvasTimeline = lazy(() => import('./sub_Timeline/EventCanvasTimeline'));
const MemoryPalace = lazy(() => import('./sub_MemoryPalace/MemoryPalace'));
const KnowledgeBaseLayout = lazy(() => import('./sub_KnowledgeBase/KnowledgeBaseLayout'));

type BrainTab = 'dashboard' | 'reflection' | 'canvas' | 'timeline' | 'palace' | 'knowledge';

const tabs: Array<{ id: BrainTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Overview & Insights' },
  { id: 'reflection', label: 'Reflection', icon: Sparkles, description: 'Agent & History' },
  { id: 'canvas', label: 'Memory Canvas', icon: Layers, description: 'Grouped Clusters' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Lane View' },
  { id: 'palace', label: 'Palace', icon: Castle, description: 'Spatial-Temporal' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, description: 'Pattern Library' },
];

export default function BrainLayout() {
  const [activeTab, setActiveTab] = useState<BrainTab>('dashboard');

  // Use coordinator as primary source for activeProject
  const { activeProject: sessionProject } = useApplicationSession();
  const getAbortSignal = useSessionAbortSignals();

  // Fall back to legacy store for selectedProjectId (filter state not in coordinator)
  const selectedProjectId = useClientProjectStore((state) => state.selectedProjectId);
  // Prefer coordinator project, fall back to legacy for backward compat
  const legacyProject = useClientProjectStore((state) => state.activeProject);
  const activeProject = sessionProject ?? legacyProject;

  const {
    isLoadingContext,
    isLoadingOutcomes,
    isLoading,
    error,
    fetchDashboard,
    fetchGlobalReflectionStatus,
    clearError,
  } = useBrainStore();

  const isGlobalMode = selectedProjectId === 'all';

  // SSE-driven reflection lifecycle → cascade refresh of dependent components
  useReflectionEvents({
    projectId: isGlobalMode ? null : activeProject?.id ?? null,
    enabled: true,
  });

  // Anomaly detection state
  const [anomalies, setAnomalies] = useState<SignalAnomaly[]>([]);
  const [anomaliesDismissed, setAnomaliesDismissed] = useState(false);

  // Secondary sidebar collapsed state
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);

  // Load data when project changes or mode switches
  // Uses coordinator AbortSignal to cancel stale fetches on rapid project switching
  useEffect(() => {
    if (isGlobalMode) {
      fetchGlobalReflectionStatus();
      setAnomalies([]);
    } else if (activeProject?.id) {
      const { signal } = getAbortSignal('brain_dashboard');
      fetchDashboard(activeProject.id, signal).then((detectedAnomalies) => {
        if (signal.aborted) return;
        if (detectedAnomalies.length > 0) {
          setAnomalies(detectedAnomalies);
          setAnomaliesDismissed(false);
        } else {
          setAnomalies([]);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobalMode, activeProject?.id]);

  if (!isGlobalMode && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 font-mono">
        <Brain className="w-10 h-10 text-zinc-700 mb-3" />
        <p className="text-xs text-zinc-500">no project selected</p>
        <p className="text-2xs text-zinc-600 mt-1">select a project to view brain data</p>
      </div>
    );
  }

  const scope: 'project' | 'global' = isGlobalMode ? 'global' : 'project';

  // ── Focus Flow: priority scoring via declarative widget registry ─────
  const { outcomeStats } = useBrainStore();
  const { shouldTrigger, status: refStatus } = useBrainStore((s) => s.reflections.project);

  const PRIMARY_THRESHOLD = 10;
  const { primaryWidgets, secondaryWidgets } = useMemo(() => {
    const scored = scoreWidgets({ outcomeStats, shouldTrigger, refStatus, anomalies });
    const primary = scored.filter((w) => w.score >= PRIMARY_THRESHOLD);
    const secondary = scored.filter((w) => w.score < PRIMARY_THRESHOLD);
    return { primaryWidgets: primary, secondaryWidgets: secondary };
  }, [outcomeStats, shouldTrigger, refStatus, anomalies]);

  const baseRenderCtx: WidgetRenderContext = useMemo(() => ({
    scope, isGlobalMode, activeProject, isLoadingOutcomes, isLoadingContext, isLoading,
  }), [scope, isGlobalMode, activeProject, isLoadingOutcomes, isLoadingContext, isLoading]);

  const compactRenderCtx: WidgetRenderContext = useMemo(
    () => ({ ...baseRenderCtx, compact: true }),
    [baseRenderCtx],
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Header */}
      {/* Error banner — separate from tabs so tabs stay stable */}
      {error && (
        <div className="px-3 py-1 border-b border-red-500/30 bg-zinc-950/80 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1 border border-red-500/30 rounded-sm font-mono">
            <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="text-2xs text-red-400">{error}</span>
            <button onClick={clearError} className="text-2xs text-red-500 hover:text-red-300 ml-1">×</button>
          </div>
        </div>
      )}

      <div className="px-3 py-1.5 border-b border-zinc-800/70 bg-zinc-950/80 flex-shrink-0 flex items-center gap-3">
        {/* Tab navigation — Grid style */}
        <div className="flex gap-0.5 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TabTooltip key={tab.id} text={tab.description}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors ${isActive
                      ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-sm'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              </TabTooltip>
            );
          })}
        </div>
      </div>

      {/* Anomaly Alert Banner — compact Grid style */}
      {anomalies.length > 0 && !anomaliesDismissed && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-amber-500/30 bg-zinc-950/80 flex-shrink-0 font-mono">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-2xs text-amber-400">
            {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
          </span>
          {anomalies.some((a) => a.severity === 'critical') && (
            <span className="text-2xs font-mono text-red-400 border border-red-500/30 px-1 py-0.5 rounded-sm">CRIT</span>
          )}
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {anomalies.slice(0, 4).map((a) => (
              <AnomalyChip key={a.id} anomaly={a} />
            ))}
            {anomalies.length > 4 && (
              <span className="text-2xs text-zinc-600">+{anomalies.length - 4}</span>
            )}
          </div>
          <button
            onClick={() => setAnomaliesDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Dismiss anomaly alerts"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Dashboard Tab — Grid layout with dot background */}
      {activeTab === 'dashboard' && (
        <GridBackground className="flex-1 overflow-auto p-4">
          <LayoutGroup>
            <div className="max-w-7xl mx-auto flex gap-4">
              {/* Primary widgets */}
              <div className="flex-1 min-w-0 space-y-4">
                {primaryWidgets.map((w, i) => (
                  <FocusWidget key={w.id} widgetId={w.id} index={i} score={w.score} renderCtx={baseRenderCtx} />
                ))}
              </div>

              {/* Secondary sidebar */}
              {secondaryWidgets.length > 0 && (
                <div className="flex-shrink-0 hidden lg:block">
                  <div className="sticky top-0">
                    <button
                      onClick={() => setSecondaryCollapsed(c => !c)}
                      className="flex items-center gap-1.5 mb-2 px-2 py-0.5 text-2xs font-mono text-zinc-600 hover:text-zinc-400 border border-zinc-800/50 rounded-sm transition-colors"
                    >
                      <Focus className="w-3 h-3" />
                      <span>{secondaryCollapsed ? 'show' : 'hide'} [{secondaryWidgets.length}]</span>
                    </button>

                    {!secondaryCollapsed && (
                      <div className="w-[320px] space-y-3">
                        {secondaryWidgets.map((w, i) => (
                          <FocusWidget key={w.id} widgetId={w.id} index={i} score={w.score} renderCtx={compactRenderCtx} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Secondary on mobile */}
            {secondaryWidgets.length > 0 && (
              <div className="max-w-7xl mx-auto lg:hidden mt-4 space-y-4">
                {secondaryWidgets.map((w, i) => (
                  <FocusWidget key={w.id} widgetId={w.id} index={i + primaryWidgets.length} score={w.score} renderCtx={baseRenderCtx} />
                ))}
              </div>
            )}
          </LayoutGroup>
        </GridBackground>
      )}

      {/* Reflection Tab — Grid layout */}
      {activeTab === 'reflection' && (
        <GridBackground className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReflectionStatus isLoading={isLoading} scope="project" />
              <ReflectionStatus isLoading={isLoading} scope="global" />
            </div>
            <ReflectionHistoryPanel scope={scope} />
          </div>
        </GridBackground>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-zinc-950">
              <span className="text-2xs font-mono text-zinc-600">-- loading knowledge_base --</span>
            </div>
          }
        >
          <KnowledgeBaseLayout />
        </Suspense>
      )}

      {/* Canvas, Timeline & Palace Tabs */}
      {(activeTab === 'canvas' || activeTab === 'timeline' || activeTab === 'palace') && (
        <div className="flex-1 relative overflow-hidden bg-zinc-950">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                <span className="text-2xs font-mono text-zinc-600">-- loading canvas --</span>
              </div>
            }
          >
            {activeTab === 'canvas' && <EventCanvasD3 enabled />}
            {activeTab === 'timeline' && <EventCanvasTimeline />}
            {activeTab === 'palace' && <MemoryPalace />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ── Tab Tooltip ──────────────────────────────────────────────────────────────

function TabTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transition.snappy}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 shadow-xl pointer-events-none"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Focus Widget ─────────────────────────────────────────────────────────────

interface FocusWidgetProps {
  widgetId: WidgetId;
  index: number;
  score: number;
  renderCtx: WidgetRenderContext;
}

const SMOOTH_SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

function FocusWidget({ widgetId, index, renderCtx }: FocusWidgetProps) {
  const def = getWidgetDefinition(widgetId);
  if (!def) return null;

  const delay = index * 0.03;

  return (
    <motion.div
      layout
      layoutId={`focus-${widgetId}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...transition.snappy, delay, layout: SMOOTH_SPRING }}
    >
      {def.render(renderCtx)}
    </motion.div>
  );
}

// ── Anomaly Chip ─────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: 'text-red-400 border-red-500/30',
  warning: 'text-amber-400 border-amber-500/30',
  info: 'text-zinc-500 border-zinc-700/50',
};

function AnomalyChip({ anomaly }: { anomaly: SignalAnomaly }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-sm border text-2xs font-mono ${SEVERITY_STYLES[anomaly.severity]}`}
      title={anomaly.description}
    >
      <span className="truncate max-w-[180px]">{anomaly.title}</span>
    </span>
  );
}
