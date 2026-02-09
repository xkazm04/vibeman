'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Zap, CheckCircle, XCircle, Terminal, Clock } from 'lucide-react';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { useAllSessions, type CLISessionId } from '@/components/cli/store';
import TaskProgressItem from './TaskProgressItem';
import type { TaskState } from '@/app/features/TaskRunner/store/taskRunnerStore';
import {
  isTaskRunning,
  isTaskQueued,
  isTaskCompleted,
  isTaskFailed,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
  isBatchIdle,
} from '@/app/features/TaskRunner/lib/types';
import { toast } from 'sonner';

interface GlobalTaskBarProps {
  className?: string;
}

export default function GlobalTaskBar({ className = '' }: GlobalTaskBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Subscribe to TaskRunner store
  const { tasks, batches } = useTaskRunnerStore();

  // Subscribe to CLI Session store
  const cliSessions = useAllSessions();

  // Track notified tasks to avoid duplicate toasts
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  // Time threshold for showing toasts (5 minutes)
  const TOAST_TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Get task lists
  const runningTasks = useMemo(() =>
    Object.values(tasks).filter((t): t is TaskState =>
      Boolean(t && t.id && (isTaskRunning(t.status) || isTaskQueued(t.status)))
    ),
    [tasks]
  );

  const completedTasks = useMemo(() =>
    Object.values(tasks).filter((t): t is TaskState =>
      Boolean(t && t.id && isTaskCompleted(t.status))
    ),
    [tasks]
  );

  const failedTasks = useMemo(() =>
    Object.values(tasks).filter((t): t is TaskState =>
      Boolean(t && t.id && isTaskFailed(t.status))
    ),
    [tasks]
  );

  // Filter recently completed/failed tasks (within last 5 minutes)
  const recentlyCompletedTasks = useMemo(() => {
    const now = Date.now();
    return completedTasks.filter(task => {
      if (isTaskCompleted(task.status)) {
        return (now - task.status.completedAt) < TOAST_TIME_THRESHOLD;
      }
      return false;
    });
  }, [completedTasks, TOAST_TIME_THRESHOLD]);

  const recentlyFailedTasks = useMemo(() => {
    const now = Date.now();
    return failedTasks.filter(task => {
      if (isTaskFailed(task.status)) {
        return (now - task.status.completedAt) < TOAST_TIME_THRESHOLD;
      }
      return false;
    });
  }, [failedTasks, TOAST_TIME_THRESHOLD]);

  const hasRunningTasks = runningTasks.length > 0;
  const hasCompletedTasks = completedTasks.length > 0;
  const hasFailedTasks = failedTasks.length > 0;

  // CLI session stats
  const cliStats = useMemo(() => {
    const sessionIds: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];
    let running = 0;
    let pending = 0;
    let completed = 0;
    let failed = 0;

    sessionIds.forEach(id => {
      const session = cliSessions[id];
      if (session && session.queue.length > 0) {
        session.queue.forEach(task => {
          if (task.status === 'running') running++;
          else if (task.status === 'pending') pending++;
          else if (task.status === 'completed') completed++;
          else if (task.status === 'failed') failed++;
        });
      }
    });

    return { running, pending, completed, failed, total: running + pending + completed + failed };
  }, [cliSessions]);

  const hasActiveCLI = cliStats.running > 0 || cliStats.pending > 0;

  const hasAnyTasks = hasRunningTasks || hasCompletedTasks || hasFailedTasks || hasActiveCLI;

  // Parse task ID to get project name and requirement name
  const parseTaskId = (taskId: string | undefined) => {
    if (!taskId || typeof taskId !== 'string') {
      return {
        projectId: '',
        requirementName: 'Unknown Task',
      };
    }

    const parts = taskId.split(':');
    if (parts.length >= 2) {
      return {
        projectId: parts[0],
        requirementName: parts.slice(1).join(':'),
      };
    }
    return {
      projectId: '',
      requirementName: taskId,
    };
  };

  // Don't auto-expand - let user manually expand to see batch details

  // Auto-collapse when no running tasks, automation sessions, or CLI sessions (after delay)
  useEffect(() => {
    if (!hasRunningTasks && !hasActiveCLI && isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [hasRunningTasks, hasActiveCLI, isExpanded]);

  // Show toast notifications for recently completed/failed tasks
  useEffect(() => {
    recentlyCompletedTasks.forEach(task => {
      if (task.id && !notifiedTasksRef.current.has(task.id)) {
        notifiedTasksRef.current.add(task.id);
        const { requirementName } = parseTaskId(task.id);

        toast.custom(
          () => (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-gradient-to-r from-slate-900/95 via-slate-900/98 to-slate-900/95 backdrop-blur-xl border border-green-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.15)]"
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 opacity-50" />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Content */}
              <div className="relative z-10 p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-green-400 mb-1">
                    Task Completed
                  </div>
                  <div className="text-xs text-gray-300 font-mono truncate">
                    {requirementName}
                  </div>
                </div>
              </div>
            </motion.div>
          ),
          {
            duration: 5000,
          }
        );
      }
    });

    recentlyFailedTasks.forEach(task => {
      if (task.id && !notifiedTasksRef.current.has(task.id)) {
        notifiedTasksRef.current.add(task.id);
        const { requirementName } = parseTaskId(task.id);

        toast.custom(
          () => (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-gradient-to-r from-slate-900/95 via-slate-900/98 to-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)]"
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-rose-500/5 to-red-500/5 opacity-50" />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* Content */}
              <div className="relative z-10 p-4 flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-red-400 mb-1">
                    Task Failed
                  </div>
                  <div className="text-xs text-gray-300 font-mono">
                    {requirementName}
                  </div>
                  {isTaskFailed(task.status) && task.status.error && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {task.status.error}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ),
          {
            duration: 7000,
          }
        );
      }
    });
  }, [recentlyCompletedTasks, recentlyFailedTasks]);

  // Hide completely when no tasks
  if (!hasAnyTasks) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}
      data-testid="global-task-bar"
    >
      <div className="relative bg-gradient-to-r from-slate-900/98 via-slate-900/95 to-slate-900/98 backdrop-blur-md border-t border-cyan-500/30 shadow-[0_-4px_30px_rgba(6,182,212,0.1)]">
        {/* Blueprint grid overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        </div>

        {/* Collapsed State - Summary Bar */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
            onClick={() => setIsExpanded(true)}
            data-testid="task-bar-collapsed"
          >
            {/* Left: Status Summary */}
            <div className="flex items-center gap-4">
              {hasRunningTasks && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">
                    {runningTasks.length} {runningTasks.length === 1 ? 'task' : 'tasks'} running
                  </span>
                </div>
              )}

              {hasCompletedTasks && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    {completedTasks.length} completed
                  </span>
                </div>
              )}

              {hasFailedTasks && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">
                    {failedTasks.length} failed
                  </span>
                </div>
              )}

              {hasActiveCLI && (
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">
                    {cliStats.running > 0 ? `${cliStats.running} CLI running` : `${cliStats.pending} CLI pending`}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Expand Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
              data-testid="expand-task-bar"
            >
              <ChevronUp className="w-5 h-5 text-cyan-400" />
            </button>
          </motion.div>
        )}

        {/* Expanded State - 4-Column Batch View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-800/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">
                    Task Batches
                  </h3>

                  {/* Status badges */}
                  <div className="flex items-center gap-3 text-xs">
                    {hasRunningTasks && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                        <Zap className="w-3 h-3" />
                        {runningTasks.length}
                      </span>
                    )}
                    {hasCompletedTasks && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                        <CheckCircle className="w-3 h-3" />
                        {completedTasks.length}
                      </span>
                    )}
                    {hasFailedTasks && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-400 rounded">
                        <XCircle className="w-3 h-3" />
                        {failedTasks.length}
                      </span>
                    )}
                    {hasActiveCLI && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">
                        <Terminal className="w-3 h-3" />
                        {cliStats.running + cliStats.pending}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Show/Hide completed toggle */}
                  {hasCompletedTasks && (
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 hover:bg-gray-800/50 rounded transition-colors"
                    >
                      {showCompleted ? 'Hide' : 'Show'} completed
                    </button>
                  )}

                  {/* Collapse button */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 hover:bg-cyan-500/10 rounded transition-colors"
                    data-testid="collapse-task-bar"
                  >
                    <ChevronDown className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* 4-Column Batch Grid */}
              <div className="grid grid-cols-4 gap-4 p-4 max-h-96 overflow-y-auto">
                {(['batch1', 'batch2', 'batch3', 'batch4'] as const).map((batchId) => {
                  const batch = batches[batchId];
                  const batchTasks = Object.values(tasks).filter(
                    (t): t is TaskState => Boolean(t && t.id && t.batchId === batchId)
                  );
                  const batchRunning = batchTasks.filter(t => isTaskRunning(t.status) || isTaskQueued(t.status));
                  const batchCompleted = batchTasks.filter(t => isTaskCompleted(t.status));
                  const batchFailed = batchTasks.filter(t => isTaskFailed(t.status));

                  return (
                    <div
                      key={batchId}
                      className="border border-gray-800/50 rounded-lg bg-slate-900/50 overflow-hidden"
                    >
                      {/* Batch Header */}
                      <div className="px-3 py-2 border-b border-gray-800/50 bg-slate-900/80">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">
                              {batchId.toUpperCase()}
                            </span>
                            {batch && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isBatchRunning(batch.status) ? 'bg-cyan-500/20 text-cyan-400' :
                                isBatchCompleted(batch.status) ? 'bg-green-500/20 text-green-400' :
                                isBatchPaused(batch.status) ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {batch.status.type}
                              </span>
                            )}
                          </div>
                        </div>
                        {batch && batch.name && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {batch.name}
                          </div>
                        )}
                      </div>

                      {/* Batch Tasks */}
                      <div className="min-h-[100px] max-h-64 overflow-y-auto">
                        {/* Running/Queued */}
                        {batchRunning.map((task) => {
                          const { requirementName } = parseTaskId(task.id);
                          return (
                            <TaskProgressItem
                              key={task.id}
                              task={task}
                              requirementName={requirementName}
                            />
                          );
                        })}

                        {/* Completed (if enabled) */}
                        {showCompleted && batchCompleted.map((task) => {
                          const { requirementName } = parseTaskId(task.id);
                          return (
                            <TaskProgressItem
                              key={task.id}
                              task={task}
                              requirementName={requirementName}
                            />
                          );
                        })}

                        {/* Failed */}
                        {batchFailed.map((task) => {
                          const { requirementName } = parseTaskId(task.id);
                          return (
                            <TaskProgressItem
                              key={task.id}
                              task={task}
                              requirementName={requirementName}
                            />
                          );
                        })}

                        {/* Empty State */}
                        {batchTasks.length === 0 && (
                          <div className="px-3 py-8 text-center text-gray-600 text-xs">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CLI Sessions Section */}
              {hasActiveCLI && (
                <div className="px-4 pb-4">
                  <div className="border border-cyan-500/30 rounded-lg bg-cyan-500/5 overflow-hidden">
                    <div className="px-3 py-2 border-b border-cyan-500/20 bg-cyan-500/10">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-300">
                          CLI Sessions
                        </span>
                        <span className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                          {cliStats.running} running
                        </span>
                        {cliStats.pending > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                            {cliStats.pending} pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-cyan-500/10">
                      {(['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'] as const).map((sessionId) => {
                        const session = cliSessions[sessionId];
                        if (!session || session.queue.length === 0) return null;

                        const runningTask = session.queue.find(t => t.status === 'running');
                        const pendingCount = session.queue.filter(t => t.status === 'pending').length;

                        return (
                          <div
                            key={sessionId}
                            className="px-3 py-2 flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">
                                  {sessionId.replace('cliSession', 'S')}
                                </span>
                                {runningTask ? (
                                  <span className="text-sm text-gray-200 truncate">
                                    {runningTask.requirementName}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">
                                    Idle
                                  </span>
                                )}
                                {session.isRunning && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-400 rounded">
                                    running
                                  </span>
                                )}
                              </div>
                              {pendingCount > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {pendingCount} pending
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
