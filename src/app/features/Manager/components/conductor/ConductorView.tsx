/**
 * ConductorView — Main container for the autonomous development pipeline
 *
 * Composes all Conductor sub-components: pipeline visualization,
 * controls, metrics, balancing config, self-healing panel, and run history.
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Sparkles, Target, ChevronDown } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useThemeStore } from '@/stores/themeStore';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import { useConductorStatus } from '../../lib/conductor/useConductorStatus';
import PipelineFlowViz from './PipelineFlowViz';
import PipelineControls from './PipelineControls';
import MetricsBar from './MetricsBar';
import ProcessLog from './ProcessLog';
import HealingPanel from './HealingPanel';
import BalancingModal from './BalancingModal';
import RunHistoryTimeline from './RunHistoryTimeline';
import ConductorNerdView from './ConductorNerdView';
import IntentRefinementModal from './IntentRefinementModal';
import type { PipelineStage } from '../../lib/conductor/types';

interface ConductorViewProps {
  projectId?: string | null;
}

interface GoalOption {
  id: string;
  title: string;
  status: string;
}

export default function ConductorView({ projectId }: ConductorViewProps) {
  const activeProject = useClientProjectStore((state) => state.activeProject);
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();
  const { currentRun, isRunning, processLog, startRun, nerdMode } = useConductorStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [intentModalOpen, setIntentModalOpen] = useState(false);

  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const effectiveProjectId = projectId || activeProject?.id || null;

  // Close goal dropdown on outside click
  useEffect(() => {
    if (!goalDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(e.target as Node)) {
        setGoalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [goalDropdownOpen]);

  // Fetch goals for the active project
  useEffect(() => {
    if (!effectiveProjectId) return;
    fetch(`/api/goals?projectId=${effectiveProjectId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const list = data?.goals || [];
        const active = list.filter((g: GoalOption) => g.status === 'open' || g.status === 'in_progress');
        setGoals(active);
      })
      .catch(() => setGoals([]));
  }, [effectiveProjectId]);

  // Shared polling hook — always fetches on mount (discovers active runs
  // even when isRunning was false due to navigation), then polls every 3s
  useConductorStatus(true);

  const handleStart = useCallback(async (refinedIntent?: string) => {
    if (!effectiveProjectId) return;

    // Check if intent refinement should be shown first
    const storeConfig = useConductorStore.getState().config;
    if (
      storeConfig.intentRefinementEnabled &&
      selectedGoalId &&
      refinedIntent === undefined // not yet refined
    ) {
      setIntentModalOpen(true);
      return;
    }

    const runId = startRun(effectiveProjectId);

    try {
      const res = await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          projectId: effectiveProjectId,
          runId,
          config: storeConfig,
          projectPath: activeProject?.path || '',
          projectName: activeProject?.name || 'Project',
          ...(selectedGoalId ? { goalId: selectedGoalId } : {}),
          ...(refinedIntent ? { refinedIntent } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to start pipeline:', err);
        useConductorStore.getState().completePipeline('failed');
      }
    } catch (error) {
      console.error('Failed to start pipeline:', error);
      useConductorStore.getState().completePipeline('failed');
    }
  }, [effectiveProjectId, activeProject, startRun, selectedGoalId]);

  const handleIntentSubmit = useCallback((refinedIntent: string) => {
    setIntentModalOpen(false);
    handleStart(refinedIntent || '');
  }, [handleStart]);

  const handleStageClick = useCallback((stage: PipelineStage) => {
    // Future: open stage detail modal
    console.log('Stage clicked:', stage);
  }, []);

  // Empty state when no project is selected
  if (!effectiveProjectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center" data-testid="conductor-no-project">
        <Workflow className="w-12 h-12 text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">Select a project to use the Conductor pipeline</p>
        <p className="text-xs text-gray-600 mt-1">
          The pipeline requires an active project context
        </p>
      </div>
    );
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  // Nerd mode: stripped-down monospace view, no Framer Motion
  if (nerdMode) {
    return (
      <div className="space-y-4" data-testid="conductor-view">
        <PipelineControls
          projectId={effectiveProjectId}
          onStart={handleStart}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ConductorNerdView projectId={effectiveProjectId} />
        <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="conductor-view">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20
            flex items-center justify-center border border-gray-700`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Conductor Pipeline</h2>
            <p className="text-[11px] text-gray-500">Autonomous development with self-healing</p>
          </div>
        </div>

        {/* Goal Selector */}
        {!isRunning && !currentRun && goals.length > 0 && (
          <div className="relative" ref={goalDropdownRef}>
            <button
              onClick={() => setGoalDropdownOpen(!goalDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700
                bg-gray-800/50 hover:bg-gray-800 transition-colors text-sm"
            >
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span className={selectedGoal ? 'text-gray-200' : 'text-gray-500'}>
                {selectedGoal ? selectedGoal.title : 'No goal (free scan)'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${goalDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {goalDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-gray-700
                bg-gray-900 shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedGoalId(''); setGoalDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors
                    ${!selectedGoalId ? 'text-cyan-400' : 'text-gray-400'}`}
                >
                  No goal (free scan)
                </button>
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => { setSelectedGoalId(goal.id); setGoalDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors
                      ${selectedGoalId === goal.id ? 'text-purple-400' : 'text-gray-300'}`}
                  >
                    <div className="truncate">{goal.title}</div>
                    <div className="text-[10px] text-gray-600 capitalize">{goal.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Pipeline Controls */}
      <PipelineControls
        projectId={effectiveProjectId}
        onStart={handleStart}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Pipeline Flow Visualization */}
      <motion.div
        className="rounded-xl border border-gray-800 bg-gray-900/30 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <PipelineFlowViz run={currentRun} onStageClick={handleStageClick} />
      </motion.div>

      {/* Metrics Bar */}
      <MetricsBar metrics={currentRun?.metrics ?? null} processLog={processLog} isRunning={isRunning} />

      {/* Process Log + Self-Healing */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ProcessLog entries={processLog} isRunning={isRunning} />
        <HealingPanel />
      </motion.div>

      {/* Run History Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <RunHistoryTimeline />
      </motion.div>

      {/* Settings Modal */}
      <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Intent Refinement Modal (G5) */}
      {selectedGoalId && (
        <IntentRefinementModal
          isOpen={intentModalOpen}
          onClose={() => setIntentModalOpen(false)}
          onSubmit={handleIntentSubmit}
          goalTitle={selectedGoal?.title || ''}
          goalDescription={selectedGoal?.title || ''}
        />
      )}
    </div>
  );
}
