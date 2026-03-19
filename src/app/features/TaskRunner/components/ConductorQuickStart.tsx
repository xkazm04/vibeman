'use client';

/**
 * ConductorQuickStart — Inline popover for quickly launching a conductor
 * pipeline from within TaskRunner. Select project + goal, then start.
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Target,
  FolderOpen,
  Loader2,
  ChevronDown,
  Workflow,
} from 'lucide-react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useConductorStore } from '@/app/features/Conductor/lib/conductorStore';
import { toast } from '@/stores/messageStore';
import type { Project } from '@/types';

interface GoalOption {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface ConductorQuickStartProps {
  /** Called after a run is successfully started so the parent can refresh */
  onRunStarted?: () => void;
}

export const ConductorQuickStart = memo(function ConductorQuickStart({ onRunStarted }: ConductorQuickStartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const projects = useServerProjectStore((s) => s.getAllProjects());

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close project dropdown on outside click
  useEffect(() => {
    if (!projectDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectDropdownOpen]);

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

  // Fetch goals when project changes
  useEffect(() => {
    if (!selectedProject) {
      setGoals([]);
      setSelectedGoalId('');
      return;
    }
    setIsLoadingGoals(true);
    setSelectedGoalId('');
    fetch(`/api/goals?projectId=${selectedProject.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.goals || [];
        const active = list.filter(
          (g: GoalOption) => g.status === 'open' || g.status === 'in_progress'
        );
        setGoals(active);
      })
      .catch(() => setGoals([]))
      .finally(() => setIsLoadingGoals(false));
  }, [selectedProject]);

  const handleStart = useCallback(async () => {
    if (!selectedProject || !selectedGoalId) return;

    setIsStarting(true);
    try {
      const storeConfig = useConductorStore.getState().config;
      const runId = useConductorStore.getState().startRun(selectedProject.id);

      const res = await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          projectId: selectedProject.id,
          runId,
          config: storeConfig,
          projectPath: selectedProject.path || '',
          projectName: selectedProject.name || 'Project',
          goalId: selectedGoalId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error || 'Failed to start pipeline');
        useConductorStore.getState().completePipeline('failed', runId);
      } else {
        toast.success('Conductor pipeline started');
        setIsOpen(false);
        setSelectedProject(null);
        setSelectedGoalId('');
        onRunStarted?.();
      }
    } catch (error) {
      console.error('Failed to start conductor:', error);
      toast.error('Failed to start pipeline');
    } finally {
      setIsStarting(false);
    }
  }, [selectedProject, selectedGoalId, onRunStarted]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const canStart = selectedProject && selectedGoalId && !isStarting;

  return (
    <div className="relative" ref={panelRef}>
      {/* Plus button trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-200 active:scale-90 ${
          isOpen
            ? 'border-purple-500/40 bg-purple-500/15 text-purple-400'
            : 'border-gray-700/50 bg-gray-800/40 text-gray-500 hover:text-gray-300 hover:border-gray-600/50 hover:bg-gray-800/60'
        }`}
        title="Quick-start a Conductor pipeline"
      >
        {isOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>

      {/* Quick-start panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 rounded-lg border border-gray-700/60 bg-gray-900/95 backdrop-blur-md shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60 bg-gray-800/20">
              <Workflow className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-gray-200">New Conductor Pipeline</span>
            </div>

            <div className="p-3 space-y-3">
              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <FolderOpen className="w-3 h-3" />
                  Project
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative" ref={projectDropdownRef}>
                  <button
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/60 transition-colors text-left"
                  >
                    <span className={`text-xs truncate ${selectedProject ? 'text-gray-200' : 'text-gray-500'}`}>
                      {selectedProject ? selectedProject.name : 'Select project...'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {projectDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-gray-700/50 bg-gray-900 shadow-xl z-50 py-0.5 max-h-48 overflow-y-auto">
                      {projects.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-gray-500 italic">No projects found</div>
                      ) : (
                        projects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProject(p);
                              setProjectDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors ${
                              selectedProject?.id === p.id ? 'text-purple-400' : 'text-gray-300'
                            }`}
                          >
                            <div className="truncate font-medium">{p.name}</div>
                            <div className="text-[10px] text-gray-600 truncate">{p.path}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Goal selector */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  <Target className="w-3 h-3" />
                  Goal
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative" ref={goalDropdownRef}>
                  <button
                    onClick={() => {
                      if (selectedProject && !isLoadingGoals) setGoalDropdownOpen(!goalDropdownOpen);
                    }}
                    disabled={!selectedProject || isLoadingGoals}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-gray-700/50 bg-gray-800/40 hover:bg-gray-800/60 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoadingGoals ? (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading goals...
                      </span>
                    ) : (
                      <span className={`text-xs truncate ${selectedGoal ? 'text-gray-200' : 'text-gray-500'}`}>
                        {selectedGoal
                          ? selectedGoal.title
                          : selectedProject
                            ? goals.length === 0
                              ? 'No goals available'
                              : 'Select goal...'
                            : 'Select project first'}
                      </span>
                    )}
                    <ChevronDown className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${goalDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {goalDropdownOpen && goals.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-gray-700/50 bg-gray-900 shadow-xl z-50 py-0.5 max-h-48 overflow-y-auto">
                      {goals.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            setSelectedGoalId(g.id);
                            setGoalDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-800 transition-colors ${
                            selectedGoalId === g.id ? 'text-purple-400' : 'text-gray-300'
                          }`}
                        >
                          <div className="truncate">{g.title}</div>
                          {g.description && (
                            <div className="text-[10px] text-gray-600 truncate">{g.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600/80 to-cyan-600/80 hover:from-purple-600 hover:to-cyan-600 text-white border border-purple-500/30 shadow-sm shadow-purple-500/10"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Workflow className="w-3.5 h-3.5" />
                    Start Pipeline
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
