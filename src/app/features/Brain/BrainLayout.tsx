/**
 * Brain Layout
 * Main dashboard for Brain 2.0 - Behavioral Learning + Autonomous Reflection
 */

'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, AlertCircle, Layers, Clock } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useBrainStore } from '@/stores/brainStore';
import BehavioralFocusPanel from './components/BehavioralFocusPanel';
import OutcomesSummary from './components/OutcomesSummary';
import ReflectionStatus from './components/ReflectionStatus';
import InsightsPanel from './components/InsightsPanel';

const EventCanvasD3 = lazy(() => import('./sub_MemoryCanvas/EventCanvasD3'));
const EventCanvasTimeline = lazy(() => import('./sub_Timeline/EventCanvasTimeline'));

type BrainTab = 'dashboard' | 'canvas' | 'timeline';

const tabs: Array<{ id: BrainTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, description: 'Overview & Insights' },
  { id: 'canvas', label: 'Memory Canvas', icon: Layers, description: 'Grouped Clusters' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Lane View' },
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

  // Load data when project changes or mode switches
  useEffect(() => {
    if (isGlobalMode) {
      fetchGlobalReflectionStatus();
    } else if (activeProject?.id) {
      fetchBehavioralContext(activeProject.id);
      fetchRecentOutcomes(activeProject.id);
      fetchReflectionStatus(activeProject.id);
    }
  }, [isGlobalMode, activeProject?.id, fetchBehavioralContext, fetchRecentOutcomes, fetchReflectionStatus, fetchGlobalReflectionStatus]);

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
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <BehavioralFocusPanel isLoading={isLoadingContext} scope={scope} />
            </motion.div>

            <div className="flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <OutcomesSummary isLoading={isLoadingOutcomes} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ReflectionStatus isLoading={isLoading} scope={scope} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2"
            >
              <InsightsPanel scope={scope} />
            </motion.div>
          </div>
        </div>
      )}

      {(activeTab === 'canvas' || activeTab === 'timeline') && (
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
          </Suspense>
        </div>
      )}
    </div>
  );
}
