'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Map, Check, X, Loader2, Play, Square } from 'lucide-react';
import { useOrchestratorStore } from '@/stores/orchestratorStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';
import { createQueuedStatus } from '@/app/features/TaskRunner/lib/types';

interface ContextMapPanelProps {
  projects: Array<{ id: string; name: string; path: string }>;
}

export default function ContextMapPanel({ projects }: ContextMapPanelProps) {
  const {
    projects: batchProjects,
    currentIndex,
    isRunning,
    startBatch,
    markProjectRunning,
    markProjectComplete,
    advanceToNext,
    reset,
    getProgress,
  } = useOrchestratorStore();

  // Get selected project from global store
  const { selectedProjectId } = useClientProjectStore();

  // Filter projects based on selection
  const filteredProjects = useMemo(() => {
    if (selectedProjectId === 'all') {
      return projects;
    }
    return projects.filter(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Get selected project name for header
  const selectedProjectName = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    const project = projects.find(p => p.id === selectedProjectId);
    return project?.name || null;
  }, [selectedProjectId, projects]);

  const [currentTask, setCurrentTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const processingRef = useRef(false);

  // Ref to always hold the latest startProject, avoiding stale closures in setTimeout
  const startProjectRef = useRef<(project: { id: string; name: string; path: string }) => Promise<void>>(undefined);

  // Start processing for a specific project
  const startProject = useCallback(
    async (project: { id: string; name: string; path: string }) => {
      if (!project) {
        reset();
        processingRef.current = false;
        return;
      }

      // Mark as running
      markProjectRunning(project.id);

      try {
        // 1. Copy skill file to project
        await fetch('/api/skills/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skillName: 'context-map-generator',
            targetProjectPath: project.path,
          }),
        });

        // 2. Create task with skill invocation prompt
        const task: QueuedTask = {
          id: `ctx-map-${project.id}-${Date.now()}`,
          projectId: project.id,
          projectPath: project.path,
          projectName: project.name,
          requirementName: `context-map-${project.name}`,
          status: createQueuedStatus(),
          addedAt: Date.now(),
          directPrompt: `You have a skill file at .claude/skills/context-map-generator.md

Read the skill file and follow its instructions to generate a context map for this project.

Project Name: "${project.name}"
Project ID: ${project.id}

Execute the context map generation workflow as described in the skill file.`,
        };

        setCurrentTask(task);
        setAutoStart(true);
      } catch (error) {
        console.error('Error starting project:', error);
        markProjectComplete(project.id, false);
        // Try next project - use ref to avoid stale closure
        const nextProject = advanceToNext();
        if (nextProject) {
          setTimeout(() => startProjectRef.current?.(nextProject), 500);
        } else {
          processingRef.current = false;
        }
      }
    },
    [markProjectRunning, markProjectComplete, advanceToNext, reset]
  );

  // Keep ref in sync with latest startProject
  startProjectRef.current = startProject;

  // Start batch context map generation
  const handleStartAll = useCallback(async () => {
    if (filteredProjects.length === 0) return;

    startBatch('context-map', filteredProjects);
    processingRef.current = true;

    // Start first project
    await startProject(filteredProjects[0]);
  }, [filteredProjects, startBatch, startProject]);

  // Handle task completion
  const handleTaskComplete = useCallback(
    async (taskId: string, success: boolean) => {
      // Mark current project as complete
      const currentProject = batchProjects[currentIndex];
      if (currentProject) {
        markProjectComplete(currentProject.id, success);
      }

      // Clear current task
      setCurrentTask(null);
      setAutoStart(false);

      // Advance to next project - use ref to avoid stale closure in setTimeout
      const nextProject = advanceToNext();
      if (nextProject && processingRef.current) {
        // Small delay before starting next to allow cleanup
        setTimeout(() => startProjectRef.current?.(nextProject), 1500);
      } else {
        processingRef.current = false;
      }
    },
    [batchProjects, currentIndex, markProjectComplete, advanceToNext]
  );

  // Cancel batch
  const handleCancel = useCallback(() => {
    processingRef.current = false;
    setCurrentTask(null);
    setAutoStart(false);
    reset();
  }, [reset]);

  const progress = getProgress();
  const hasProjects = filteredProjects.length > 0;
  const isSingleProject = filteredProjects.length === 1;

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-cyan-500/10 bg-cyan-500/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/10">
            <Map className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200">
            Context Map
            {selectedProjectName && (
              <span className="text-cyan-400 ml-1">· {selectedProjectName}</span>
            )}
          </span>
        </div>

        {isRunning ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-xs text-cyan-400 border border-cyan-500/20">
              {currentIndex + 1} / {batchProjects.length}
            </span>
            <button
              onClick={handleCancel}
              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors"
              title="Cancel"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartAll}
            disabled={!hasProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-3 h-3" />
            {isSingleProject ? 'Generate (1)' : `Generate All (${filteredProjects.length})`}
          </button>
        )}
      </div>

      {/* Progress summary */}
      {batchProjects.length > 0 && (
        <div className="px-3 py-1.5 border-b border-cyan-500/5 bg-zinc-900/50">
          <div className="flex items-center gap-3 text-[10px]">
            {progress.completed > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                {progress.completed}
              </span>
            )}
            {progress.failed > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <X className="w-3 h-3" />
                {progress.failed}
              </span>
            )}
            <span className="text-zinc-500">
              {progress.total - progress.completed - progress.failed} pending
            </span>
          </div>
        </div>
      )}

      {/* Project progress list - horizontal row layout */}
      {batchProjects.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-cyan-500/5 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {batchProjects.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] transition-all ${
                  i === currentIndex && isRunning
                    ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'bg-zinc-800/60 border border-zinc-700/50'
                }`}
              >
                {p.status === 'completed' && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                {p.status === 'failed' && <X className="w-2.5 h-2.5 text-red-400" />}
                {p.status === 'running' && (
                  <Loader2 className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
                )}
                {p.status === 'pending' && <span className="w-2.5 h-2.5 text-zinc-600 flex items-center justify-center">○</span>}
                <span
                  className={
                    p.status === 'running'
                      ? 'text-cyan-300 font-medium'
                      : p.status === 'completed'
                        ? 'text-emerald-400'
                        : p.status === 'failed'
                          ? 'text-red-400'
                          : 'text-zinc-500'
                  }
                >
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        {currentTask ? (
          <CompactTerminal
            instanceId="context-map-panel"
            projectPath={currentTask.projectPath}
            taskQueue={[currentTask]}
            onTaskComplete={handleTaskComplete}
            autoStart={autoStart}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs gap-2">
            {hasProjects ? (
              <>
                <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <Map className="w-5 h-5 text-cyan-400/50" />
                </div>
                <span>
                  {isSingleProject
                    ? `Click "Generate" to create context map for ${selectedProjectName}`
                    : `Click "Generate All" to create ${filteredProjects.length} context maps`
                  }
                </span>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <Map className="w-5 h-5 text-zinc-600" />
                </div>
                <span>No projects in workspace</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
