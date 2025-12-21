/**
 * Breakdown Panel Component
 * Triggers goal breakdown analysis via Claude Code with auto-execution
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileCode,
  Play,
  Clock,
  XCircle,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import {
  useTaskRunnerStore,
  setCachedRequirements,
} from '@/app/features/TaskRunner/store/taskRunnerStore';
import { isTaskCompleted, isTaskFailed } from '@/app/features/TaskRunner/lib/types';

type ExecutionStatus = 'idle' | 'creating' | 'queued' | 'running' | 'completed' | 'failed';

interface BreakdownPanelProps {
  projectPath: string;
  projectId: string;
  onBreakdownCreated?: () => void;
}

export default function BreakdownPanel({
  projectPath,
  projectId,
  onBreakdownCreated,
}: BreakdownPanelProps) {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requirementName, setRequirementName] = useState<string | null>(null);

  const { activeGoal, loadHypotheses, hypothesisCounts } = useGoalHubStore();
  const tasks = useTaskRunnerStore((state) => state.tasks);
  const createBatch = useTaskRunnerStore((state) => state.createBatch);
  const startBatch = useTaskRunnerStore((state) => state.startBatch);

  // Poll for task completion
  useEffect(() => {
    if (!currentTaskId || executionStatus !== 'running') return;

    const checkStatus = () => {
      const task = tasks[currentTaskId];
      if (!task) return;

      if (isTaskCompleted(task.status)) {
        setExecutionStatus('completed');
        // Refresh hypotheses after successful completion
        if (activeGoal) {
          loadHypotheses(activeGoal.id);
        }
        onBreakdownCreated?.();
      } else if (isTaskFailed(task.status)) {
        setExecutionStatus('failed');
        setErrorMessage('Breakdown execution failed');
      }
    };

    // Check immediately
    checkStatus();

    // Then poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [currentTaskId, executionStatus, tasks, activeGoal, loadHypotheses, onBreakdownCreated]);

  const handleGenerateAndRun = useCallback(async () => {
    if (!activeGoal) return;

    setExecutionStatus('creating');
    setErrorMessage(null);

    try {
      // Step 1: Create the requirement file
      const response = await fetch('/api/goal-hub/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: activeGoal.id,
          projectId,
          projectPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create breakdown requirement');
      }

      setRequirementName(data.requirementName);
      onBreakdownCreated?.();

      // Step 2: Add to TaskRunner batch1 and execute
      const taskId = `${projectId}:${data.requirementName}`;
      setCurrentTaskId(taskId);

      // Cache the requirement for execution
      setCachedRequirements([{
        projectId,
        projectName: 'Goal Breakdown',
        projectPath,
        requirementName: data.requirementName,
        status: 'idle',
      }]);

      // Create batch with single task
      createBatch('batch1', `Goal: ${activeGoal.title.slice(0, 30)}`, [taskId]);

      // Start execution
      setExecutionStatus('queued');
      startBatch('batch1');
      setExecutionStatus('running');

    } catch (error) {
      setExecutionStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate breakdown');
    }
  }, [activeGoal, projectId, projectPath, createBatch, startBatch, onBreakdownCreated]);

  const handleRefreshHypotheses = () => {
    if (activeGoal) {
      loadHypotheses(activeGoal.id);
    }
  };

  const getStatusDisplay = () => {
    switch (executionStatus) {
      case 'creating':
        return { icon: Loader2, text: 'Creating requirement...', color: 'text-cyan-400', spin: true };
      case 'queued':
        return { icon: Clock, text: 'Queued for execution', color: 'text-amber-400', spin: false };
      case 'running':
        return { icon: Loader2, text: 'Running breakdown analysis...', color: 'text-purple-400', spin: true };
      case 'completed':
        return { icon: CheckCircle, text: 'Breakdown complete', color: 'text-emerald-400', spin: false };
      case 'failed':
        return { icon: XCircle, text: errorMessage || 'Execution failed', color: 'text-red-400', spin: false };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  const isExecuting = ['creating', 'queued', 'running'].includes(executionStatus);

  return (
    <div className="space-y-4">
      {/* Header + Agent Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Multi-Agent Breakdown</h3>
        </div>
      </div>

      {/* Agent Perspectives - Compact inline badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
          🏗️ Arch
        </span>
        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
          🐛 Bugs
        </span>
        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
          ⚡ Perf
        </span>
        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
          🔒 Security
        </span>
        <span className="px-2 py-0.5 text-xs bg-fuchsia-500/20 text-fuchsia-300 rounded-full border border-fuchsia-500/30">
          💖 UX
        </span>
        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
          🌊 Data
        </span>
        <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
          🌀 Edge
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerateAndRun}
        disabled={isExecuting || !activeGoal}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-all"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {executionStatus === 'creating' ? 'Creating...' :
             executionStatus === 'queued' ? 'Queued...' : 'Running...'}
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            Generate & Run Breakdown
          </>
        )}
      </button>

      {/* Status Display */}
      {statusDisplay && (
        <div
          className={`p-3 rounded-lg border flex items-center gap-3 ${
            executionStatus === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : executionStatus === 'failed'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          <statusDisplay.icon
            className={`w-5 h-5 ${statusDisplay.color} ${statusDisplay.spin ? 'animate-spin' : ''}`}
          />
          <div className="flex-1">
            <p className={`text-sm font-medium ${statusDisplay.color}`}>
              {statusDisplay.text}
            </p>
            {requirementName && executionStatus === 'running' && (
              <p className="text-xs text-gray-500 mt-0.5">
                Task: {requirementName}
              </p>
            )}
          </div>
          {executionStatus === 'completed' && hypothesisCounts.total > 0 && (
            <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
              {hypothesisCounts.total} hypotheses
            </span>
          )}
        </div>
      )}

      {/* Completion Actions */}
      {executionStatus === 'completed' && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRefreshHypotheses}
            className="text-sm text-purple-400 hover:text-purple-300 underline"
          >
            Refresh hypotheses
          </button>
          <button
            onClick={() => {
              setExecutionStatus('idle');
              setCurrentTaskId(null);
              setRequirementName(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            Run again
          </button>
        </div>
      )}

      {/* Error retry */}
      {executionStatus === 'failed' && (
        <button
          onClick={() => {
            setExecutionStatus('idle');
            setErrorMessage(null);
          }}
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
