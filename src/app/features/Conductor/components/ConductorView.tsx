/**
 * ConductorView — Main container for the autonomous development pipeline
 *
 * Composes all Conductor sub-components: pipeline visualization,
 * controls, metrics, balancing config, self-healing panel, and run history.
 */

'use client';

import { useCallback, useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, ChevronDown } from 'lucide-react';
import { NoProjectIllustration } from './ConductorEmptyStates';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { toast } from '@/stores/messageStore';
import { useConductorStore } from '../lib/conductorStore';
import { useConductorStatus } from '../lib/useConductorStatus';
import { useConductorRecovery } from '../lib/useConductorRecovery';
import PipelineFlowViz from './PipelineFlowViz';
import PipelineControls from './PipelineControls';
import MetricsBar from './MetricsBar';
import ProcessLog from './ProcessLog';
import HealingPanel from './HealingPanel';
import BalancingModal from './BalancingModal';
import RunHistoryTimeline from './RunHistoryTimeline';
import ConductorNerdView from './ConductorNerdView';
import RunReportModal from './RunReportModal';
import type { AnyPipelineStage } from '../lib/types';

interface ConductorViewProps {
  projectId?: string | null;
}

interface GoalOption {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function ConductorView({ projectId }: ConductorViewProps) {
  const activeProject = useClientProjectStore((state) => state.activeProject);
  const { currentRun, isRunning, processLog, startRun, nerdMode } = useConductorStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const effectiveProjectId = projectId || activeProject?.id || null;

  // Close goal dropdown on outside click
  useEffect(() => {
    if (!goalDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(e.target as Node)) {
        setGoalDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [goalDropdownOpen]);

  // Keyboard navigation for goal dropdown
  const handleGoalKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (!goalDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setGoalDropdownOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % goals.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + goals.length) % goals.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < goals.length) {
          setSelectedGoalId(goals[focusedIndex].id);
          setGoalDropdownOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setGoalDropdownOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setGoalDropdownOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }, [goalDropdownOpen, focusedIndex, goals]);

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

  // Recovery hook — runs once on mount, syncs persisted runs with server state
  useConductorRecovery(effectiveProjectId);

  // Shared polling hook — always fetches on mount (discovers active runs
  // even when isRunning was false due to navigation), then polls every 3s
  useConductorStatus(true);

  const handleStart = useCallback(async () => {
    if (!effectiveProjectId) return;

    if (!selectedGoalId) {
      toast.error('Please select a goal before starting the pipeline');
      return;
    }

    const storeConfig = useConductorStore.getState().config;
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
          goalId: selectedGoalId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to start pipeline:', err);
        toast.error(err.error || 'Failed to start pipeline');
        useConductorStore.getState().completePipeline('failed', runId);
      }
    } catch (error) {
      console.error('Failed to start pipeline:', error);
      toast.error('Failed to start pipeline');
      useConductorStore.getState().completePipeline('failed', runId);
    }
  }, [effectiveProjectId, activeProject, startRun, selectedGoalId]);

  const handleStageClick = useCallback((stage: AnyPipelineStage) => {
    // Future: open stage detail modal
    console.log('Stage clicked:', stage);
  }, []);

  // Empty state when no project is selected
  if (!effectiveProjectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center" data-testid="conductor-no-project">
        <NoProjectIllustration className="w-32 h-20 mb-3" />
        <p className="text-sm text-gray-400">Select a project to use the Conductor pipeline</p>
        <p className="text-xs text-gray-600 mt-1">
          The pipeline requires an active project context
        </p>
      </div>
    );
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  const handleViewReport = useCallback((runIdOverride?: string) => {
    const id = runIdOverride || currentRun?.id;
    if (!id) return;
    setReportRunId(id);
    setReportOpen(true);
  }, [currentRun]);

  // Shared props for PipelineControls
  const controlProps = {
    projectId: effectiveProjectId,
    onStart: handleStart,
    onOpenSettings: () => setSettingsOpen(true),
    onViewReport: () => handleViewReport(),
  };

  // Nerd mode: stripped-down monospace view, no Framer Motion
  if (nerdMode) {
    return (
      <div className="space-y-4" data-testid="conductor-view">
        <PipelineControls {...controlProps} />
        <ConductorNerdView projectId={effectiveProjectId} />
        <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {reportRunId && (
          <RunReportModal
            isOpen={reportOpen}
            onClose={() => setReportOpen(false)}
            runId={reportRunId}
          />
        )}
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
            <h2 className="text-base font-semibold tracking-wide text-gray-200">Conductor Pipeline</h2>
            <p className="text-caption text-gray-500">Autonomous development with self-healing</p>
          </div>
        </div>

        {/* Goal Selector */}
        {!isRunning && !currentRun && goals.length > 0 && (
          <div className="relative" ref={goalDropdownRef} onKeyDown={handleGoalKeyDown}>
            <button
              onClick={() => {
                const opening = !goalDropdownOpen;
                setGoalDropdownOpen(opening);
                setFocusedIndex(opening ? 0 : -1);
              }}
              aria-haspopup="listbox"
              aria-expanded={goalDropdownOpen}
              aria-label={selectedGoal ? `Goal: ${selectedGoal.title}` : 'Select a goal'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700
                bg-gray-800/50 hover:bg-gray-800 transition-colors text-sm"
            >
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span className={selectedGoal ? 'text-gray-200' : 'text-gray-500'}>
                {selectedGoal ? selectedGoal.title : 'Select a goal'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${goalDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {goalDropdownOpen && (
              <div
                role="listbox"
                aria-label="Goals"
                aria-activedescendant={focusedIndex >= 0 ? `goal-option-${goals[focusedIndex]?.id}` : undefined}
                className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-gray-700
                  bg-gray-900 shadow-xl z-50 py-1 max-h-60 overflow-y-auto"
              >
                {goals.map((goal, index) => (
                  <button
                    key={goal.id}
                    id={`goal-option-${goal.id}`}
                    role="option"
                    aria-selected={selectedGoalId === goal.id}
                    onClick={() => { setSelectedGoalId(goal.id); setGoalDropdownOpen(false); setFocusedIndex(-1); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors
                      ${selectedGoalId === goal.id ? 'text-purple-400' : 'text-gray-300'}
                      ${focusedIndex === index ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                  >
                    <div className="truncate">{goal.title}</div>
                    <div className="text-2xs text-gray-600 capitalize">{goal.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Pipeline Controls */}
      <PipelineControls {...controlProps} />

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
        <RunHistoryTimeline onViewReport={(id) => handleViewReport(id)} />
      </motion.div>

      {/* Settings Modal */}
      <BalancingModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Run Report Modal */}
      {reportRunId && (
        <RunReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          runId={reportRunId}
        />
      )}
    </div>
  );
}
