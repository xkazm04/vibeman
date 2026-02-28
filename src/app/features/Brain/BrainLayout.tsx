/**
 * Brain Layout
 * Main dashboard for Brain 2.0 - Behavioral Learning + Autonomous Reflection
 */

'use client';

import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Activity, AlertCircle, Layers, Clock, Sparkles, AlertTriangle, TrendingDown, TrendingUp, X, Castle } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBrainStore } from '@/stores/brainStore';
import BehavioralFocusPanel from './components/BehavioralFocusPanel';
import OutcomesSummary from './components/OutcomesSummary';
import ReflectionStatus from './components/ReflectionStatus';
import ReflectionHistoryPanel from './components/ReflectionHistoryPanel';
import BrainEffectivenessWidget from './components/BrainEffectivenessWidget';
import InsightsPanel from './components/InsightsPanel';
import ActivityHeatmap from './components/ActivityHeatmap';
import NextUpCard from './components/NextUpCard';
import type { SignalAnomaly, AnomalySeverity } from '@/lib/brain/anomalyDetector';

const EventCanvasD3 = lazy(() => import('./sub_MemoryCanvas/EventCanvasD3'));
const EventCanvasTimeline = lazy(() => import('./sub_Timeline/EventCanvasTimeline'));
const MemoryPalace = lazy(() => import('./sub_MemoryPalace/MemoryPalace'));

type BrainTab = 'dashboard' | 'reflection' | 'canvas' | 'timeline' | 'palace';

const tabs: Array<{ id: BrainTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Overview & Insights' },
  { id: 'reflection', label: 'Reflection', icon: Sparkles, description: 'Agent & History' },
  { id: 'canvas', label: 'Memory Canvas', icon: Layers, description: 'Grouped Clusters' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Lane View' },
  { id: 'palace', label: 'Palace', icon: Castle, description: 'Spatial-Temporal' },
];

export default function BrainLayout() {
  const [activeTab, setActiveTab] = useState<BrainTab>('dashboard');
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const selectedProjectId = useActiveProjectStore((state) => state.selectedProjectId);
  const {
    isLoadingContext,
    isLoadingOutcomes,
    isLoading,
    error,
    fetchBehavioralContext,
    fetchRecentOutcomes,
    fetchReflectionStatus,
    fetchGlobalReflectionStatus,
    clearError,
  } = useBrainStore();

  const isGlobalMode = selectedProjectId === 'all';

  // Anomaly detection state
  const [anomalies, setAnomalies] = useState<SignalAnomaly[]>([]);
  const [anomaliesDismissed, setAnomaliesDismissed] = useState(false);

  const fetchAnomalies = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/brain/anomalies?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.anomalies?.length > 0) {
          setAnomalies(data.anomalies);
          setAnomaliesDismissed(false);
        } else {
          setAnomalies([]);
        }
      }
    } catch {
      // Non-critical — don't surface anomaly fetch errors
    }
  }, []);

  // Load data when project changes or mode switches
  useEffect(() => {
    if (isGlobalMode) {
      fetchGlobalReflectionStatus();
      setAnomalies([]);
    } else if (activeProject?.id) {
      fetchBehavioralContext(activeProject.id);
      fetchRecentOutcomes(activeProject.id);
      fetchReflectionStatus(activeProject.id);
      fetchAnomalies(activeProject.id);
    }
  }, [isGlobalMode, activeProject?.id, fetchBehavioralContext, fetchRecentOutcomes, fetchReflectionStatus, fetchGlobalReflectionStatus, fetchAnomalies]);

  if (!isGlobalMode && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Brain className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">No Project Selected</h2>
        <p className="text-zinc-500 text-center max-w-md">
          Select a project to view Brain insights and behavioral learning data.
        </p>
      </div>
    );
  }

  const scope: 'project' | 'global' = isGlobalMode ? 'global' : 'project';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Header (always visible across all tabs) */}
      <div className="px-4 py-2 border-b border-zinc-800/50 flex-shrink-0 flex items-center gap-3">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
            <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 ml-2">×</button>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TabTooltip key={tab.id} text={tab.description}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              </TabTooltip>
            );
          })}
        </div>
      </div>

      {/* Anomaly Alert Banner */}
      <AnimatePresence>
        {anomalies.length > 0 && !anomaliesDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20">
              <div className="flex items-start gap-3 max-w-7xl mx-auto">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-300">
                      {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} detected
                    </span>
                    {anomalies.some((a) => a.severity === 'critical') && (
                      <span className="px-1.5 py-0.5 text-2xs font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {anomalies.slice(0, 4).map((a) => (
                      <AnomalyChip key={a.id} anomaly={a} />
                    ))}
                    {anomalies.length > 4 && (
                      <span className="text-2xs text-zinc-500 self-center">
                        +{anomalies.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setAnomaliesDismissed(true)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                  aria-label="Dismiss anomaly alerts"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Tab - Brain Effectiveness, Learning Insights, Cross-Project Focus, Implementation Outcomes */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Row: KPI Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <OutcomesSummary isLoading={isLoadingOutcomes} />
            </motion.div>

            {/* Activity Heatmap (full width) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <ActivityHeatmap scope={scope} />
            </motion.div>

            {/* Next Up: Predictive Intent Suggestions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <NextUpCard
                projectId={isGlobalMode ? null : activeProject?.id ?? null}
                scope={scope}
              />
            </motion.div>

            {/* Second Row: Effectiveness + Focus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <BrainEffectivenessWidget scope={scope} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <BehavioralFocusPanel isLoading={isLoadingContext} scope={scope} />
              </motion.div>
            </div>

            {/* Third Row: Learning Insights (full width) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <InsightsPanel scope={scope} />
            </motion.div>
          </div>
        </div>
      )}

      {/* Reflection Tab - Global Reflection + Reflection History */}
      {activeTab === 'reflection' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Reflection Status (both project and global) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ReflectionStatus isLoading={isLoading} scope="project" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ReflectionStatus isLoading={isLoading} scope="global" />
              </motion.div>
            </div>

            {/* Reflection History (full width) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ReflectionHistoryPanel scope={scope} />
            </motion.div>
          </div>
        </div>
      )}

      {/* Canvas, Timeline & Palace Tabs */}
      {(activeTab === 'canvas' || activeTab === 'timeline' || activeTab === 'palace') && (
        <div className="flex-1 relative overflow-hidden" style={{ background: '#0f0f11' }}>
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0f0f11' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  <span className="text-sm text-zinc-500">Loading canvas...</span>
                </div>
              </div>
            }
          >
            {activeTab === 'canvas' && <EventCanvasD3 />}
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
      {visible && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 shadow-xl pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

// ── Anomaly Chip ─────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AnomalySeverity, string> = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  info: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',
};

function AnomalyChip({ anomaly }: { anomaly: SignalAnomaly }) {
  const Icon = anomaly.kind === 'activity_drop' || anomaly.kind === 'context_neglected'
    ? TrendingDown
    : anomaly.kind === 'activity_spike'
      ? TrendingUp
      : AlertTriangle;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-2xs ${SEVERITY_STYLES[anomaly.severity]}`}
      title={anomaly.description}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{anomaly.title}</span>
    </div>
  );
}
