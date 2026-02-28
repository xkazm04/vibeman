'use client';

import React, { useState, useCallback } from 'react';
import { Layers, Check, Play, Info, ChevronRight, Loader2, Eye, X } from 'lucide-react';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';
import { createQueuedStatus, createCompletedStatus, createFailedStatus } from '@/app/features/TaskRunner/lib/types';

interface CrossTaskPanelProps {
  workspaceId: string | null;
  projects: Array<{ id: string; name: string; path: string }>;
  onViewPlan?: (planId: string) => void;
}

export default function CrossTaskPanel({
  workspaceId,
  projects,
  onViewPlan,
}: CrossTaskPanelProps) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [requirement, setRequirement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<QueuedTask | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map((p) => p.id)));
    }
  }, [projects, selectedProjects.size]);

  const handleRunTask = useCallback(async () => {
    if (selectedProjects.size === 0 || !requirement.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get selected project details
      const selectedProjectDetails = projects.filter((p) => selectedProjects.has(p.id));

      // Call the API to create a cross-task plan
      const response = await fetch('/api/cross-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          projectIds: Array.from(selectedProjects),
          requirement: requirement.trim(),
          projects: selectedProjectDetails,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create analysis');
        return;
      }

      const { planId, promptContent } = result;

      // Mark the plan as started
      await fetch(`/api/cross-task/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      // Create the task for CompactTerminal
      const task: QueuedTask = {
        id: planId,
        projectId: workspaceId || 'default',
        projectPath: selectedProjectDetails[0]?.path || '.',
        projectName: 'Cross-Task Analysis',
        requirementName: `cross-task-${planId.slice(-8)}`,
        status: createQueuedStatus(),
        addedAt: Date.now(),
        directPrompt: promptContent,
      };

      setCurrentPlanId(planId);
      setCurrentTask(task);
      setAutoStart(true);
    } catch (err) {
      console.error('Error running cross-task:', err);
      setError('Failed to start analysis');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjects, requirement, workspaceId, projects]);

  const handleTaskComplete = useCallback((taskId: string, success: boolean) => {
    setAutoStart(false);
    if (currentTask) {
      setCurrentTask({
        ...currentTask,
        status: success ? createCompletedStatus() : createFailedStatus('Analysis failed'),
        completedAt: Date.now(),
      });
    }
  }, [currentTask]);

  const handleClear = useCallback(() => {
    setCurrentTask(null);
    setCurrentPlanId(null);
    setAutoStart(false);
    setError(null);
  }, []);

  const handleViewPlan = useCallback(() => {
    if (currentPlanId && onViewPlan) {
      onViewPlan(currentPlanId);
    }
  }, [currentPlanId, onViewPlan]);

  const hasProjects = projects.length > 0;
  const hasSelection = selectedProjects.size > 0;
  const hasRequirement = requirement.trim().length > 0;
  const isRunning = currentTask?.status.type === 'running' || (currentTask?.status.type === 'queued' && autoStart);
  const isCompleted = currentTask?.status.type === 'completed';
  const canRun = hasSelection && hasRequirement && !isRunning && !isLoading && !currentTask;

  // If we have a running/completed task, show the terminal view
  if (currentTask) {
    return (
      <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/10">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-zinc-200">Cross-Project Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
            {isCompleted && onViewPlan && (
              <button
                onClick={handleViewPlan}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View Plans
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 border-b border-amber-500/5 bg-zinc-900/50 text-[10px]">
          <div className="flex items-center gap-2">
            {currentTask.status.type === 'queued' && autoStart && (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Starting analysis...
              </span>
            )}
            {currentTask.status.type === 'running' && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Analyzing {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''}...
              </span>
            )}
            {isCompleted && (
              <span className="text-emerald-400">Analysis complete - 3 implementation plans generated</span>
            )}
            {currentTask.status.type === 'failed' && (
              <span className="text-red-400">Analysis failed</span>
            )}
          </div>
        </div>

        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <CompactTerminal
            instanceId="cross-task-panel"
            projectPath={currentTask.projectPath}
            taskQueue={[currentTask]}
            onTaskComplete={handleTaskComplete}
            autoStart={autoStart}
          />
        </div>
      </div>
    );
  }

  // Default form view
  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-500/10">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200">Cross-Project Task</span>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] text-amber-400 border border-amber-500/20">
              {selectedProjects.size} selected
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Project Selection */}
        <div className="w-56 flex-shrink-0 border-r border-zinc-800/50 flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800/30 flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
              Target Projects
            </span>
            {hasProjects && (
              <button
                onClick={handleSelectAll}
                className="text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                {selectedProjects.size === projects.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {hasProjects ? (
              projects.map((project) => {
                const isSelected = selectedProjects.has(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => handleToggleProject(project.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border border-amber-500/30'
                        : 'bg-zinc-800/30 border border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-900'
                          : 'bg-zinc-700/50 border border-zinc-600/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${isSelected ? 'text-amber-300' : 'text-zinc-300'}`}>
                        {project.name}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
                <span>No projects in workspace</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Requirement Input */}
        <div className="flex-1 flex flex-col p-3">
          {/* Info Banner */}
          <div className="flex items-start gap-2 p-2.5 mb-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <Info className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-400/80 leading-relaxed">
              <span className="font-medium">Cross-Project Tasks</span> analyze your requirement across selected projects
              and generate 3 implementation plan options (Conservative, Balanced, Ambitious).
            </div>
          </div>

          {/* Requirement Input */}
          <div className="flex-1 flex flex-col">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
              Implementation Requirement
            </label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Describe what should be implemented across selected projects...

Example: Add a health check endpoint at /api/health that returns { status: 'ok', timestamp: Date.now() }"
              className="flex-1 w-full px-3 py-2 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded-lg resize-none focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/30">
            <div className="text-[10px] text-zinc-500">
              {hasSelection ? (
                <span>
                  Will analyze{' '}
                  <span className="text-amber-400 font-medium">{selectedProjects.size}</span>{' '}
                  project{selectedProjects.size !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>Select projects to analyze</span>
              )}
            </div>
            <button
              onClick={handleRunTask}
              disabled={!canRun}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Run Analysis
              {hasSelection && hasRequirement && (
                <ChevronRight className="w-3 h-3 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
