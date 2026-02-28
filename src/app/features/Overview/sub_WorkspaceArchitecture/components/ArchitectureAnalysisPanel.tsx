'use client';

import React, { useState, useCallback } from 'react';
import { GitBranch, Play, Loader2, AlertTriangle, X } from 'lucide-react';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';
import { createQueuedStatus, createCompletedStatus, createFailedStatus } from '@/app/features/TaskRunner/lib/types';

interface ArchitectureAnalysisPanelProps {
  workspaceId: string | null;
  projects: Array<{ id: string; name: string; path: string }>;
}

export default function ArchitectureAnalysisPanel({
  workspaceId,
  projects,
}: ArchitectureAnalysisPanelProps) {
  const [analysisTask, setAnalysisTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTriggerAnalysis = useCallback(async () => {
    if (projects.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the API to create an analysis session with proper callback URL
      const response = await fetch('/api/architecture/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'workspace',
          workspaceId,
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            path: p.path,
          })),
          triggerType: 'manual',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to start analysis');
        return;
      }

      const { analysisId, promptContent } = result;

      const task: QueuedTask = {
        id: analysisId,
        projectId: workspaceId || 'default',
        projectPath: projects[0]?.path || '.',
        projectName: 'Architecture Analysis',
        requirementName: `analysis-${analysisId.slice(-8)}`,
        status: createQueuedStatus(),
        addedAt: Date.now(),
        directPrompt: promptContent,
      };

      setAnalysisTask(task);
      setAutoStart(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger analysis');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, projects]);

  const handleTaskComplete = useCallback((taskId: string, success: boolean) => {
    setAutoStart(false);
    // Keep task for reference but mark as done
    if (analysisTask) {
      setAnalysisTask({
        ...analysisTask,
        status: success ? createCompletedStatus() : createFailedStatus('Analysis failed'),
        completedAt: Date.now(),
      });
    }
  }, [analysisTask]);

  const handleClear = useCallback(() => {
    setAnalysisTask(null);
    setAutoStart(false);
  }, []);

  const isRunning = analysisTask?.status.type === 'running' || (analysisTask?.status.type === 'queued' && autoStart);
  const hasProjects = projects.length > 0;

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-purple-500/10 bg-purple-500/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-500/10">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200">Architecture Analysis</span>
        </div>

        <div className="flex items-center gap-2">
          {analysisTask && !isRunning && (
            <button
              onClick={handleClear}
              className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleTriggerAnalysis}
            disabled={!hasProjects || isRunning || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 hover:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Analyze Workspace
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/20 bg-red-500/10 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 flex-1">Analysis failed: {error}</span>
          <button
            onClick={handleTriggerAnalysis}
            disabled={!hasProjects || isLoading}
            className="px-2 py-0.5 text-[10px] font-medium text-red-300 bg-red-500/20 rounded border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => setError(null)}
            className="p-0.5 text-red-400/60 hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Status bar */}
      {analysisTask && (
        <div className="px-3 py-1.5 border-b border-purple-500/5 bg-zinc-900/50 text-[10px]">
          <div className="flex items-center gap-2">
            {analysisTask.status.type === 'queued' && autoStart && (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Starting...
              </span>
            )}
            {analysisTask.status.type === 'running' && (
              <span className="flex items-center gap-1.5 text-purple-400">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Analyzing {projects.length} project{projects.length !== 1 ? 's' : ''}...
              </span>
            )}
            {analysisTask.status.type === 'completed' && (
              <span className="text-emerald-400">Analysis complete</span>
            )}
            {analysisTask.status.type === 'failed' && (
              <span className="text-red-400">Analysis failed</span>
            )}
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        {analysisTask ? (
          <CompactTerminal
            instanceId="architecture-analysis-panel"
            projectPath={analysisTask.projectPath}
            taskQueue={[analysisTask]}
            onTaskComplete={handleTaskComplete}
            autoStart={autoStart}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs gap-2">
            {hasProjects ? (
              <>
                <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <GitBranch className="w-5 h-5 text-purple-400/50" />
                </div>
                <span>Click "Analyze Workspace" to start</span>
                <span className="text-[10px] text-zinc-600">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} will be analyzed
                </span>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <GitBranch className="w-5 h-5 text-zinc-600" />
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
