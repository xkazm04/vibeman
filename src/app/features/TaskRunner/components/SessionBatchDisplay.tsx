'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  X,
  Play,
  Pause,
  Trash2,
  Plus,
  Edit2,
  Check,
} from 'lucide-react';
import { getStatusIcon, getStatusColor } from '@/components/ui/taskStatusUtils';
import {
  useTaskRunnerStore,
  type BatchId,
  type BatchState,
  type TaskState,
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchRunning,
  isBatchPaused,
  isBatchCompleted,
} from '../store';
import { SessionExecutionManager } from '../lib/sessionApi';

interface SessionBatchDisplayProps {
  batchId: BatchId;
  selectedTaskIds: string[];  // Tasks selected in TaskColumn
  onAddTasks?: (taskIds: string[], requirementNames: string[]) => void;
}

// Helper type for displaying tasks (maps TaskState to display format)
interface DisplayTask {
  id: string;
  requirementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  claudeSessionId?: string;
  errorMessage?: string;
}

// Status utilities imported from ../lib/taskStatusUtils with purple theme for sessions

/**
 * Session Batch Display Component
 * Shows status of Claude Code sessions with --resume flag support
 * Uses purple color scheme to differentiate from regular batches
 */
export default function SessionBatchDisplay({
  batchId,
  selectedTaskIds,
  onAddTasks,
}: SessionBatchDisplayProps) {
  const session = useTaskRunnerStore((state) => state.batches[batchId]);
  const allTasks = useTaskRunnerStore((state) => state.tasks);
  const {
    startBatch,
    pauseBatch,
    compactBatch,
    deleteBatch,
    addTaskToBatchWithName,
    renameBatch,
    updateTaskSessionStatus,
    updateBatchClaudeSessionId,
  } = useTaskRunnerStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session?.name || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const executionManagerRef = useRef<SessionExecutionManager | null>(null);

  // Sync edit name when session name changes
  useEffect(() => {
    if (session?.name && !isEditing) {
      setEditName(session.name);
    }
  }, [session?.name, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // Get tasks for this batch and map to display format
  const taskStates = session?.taskIds.map(id => allTasks[id]).filter(Boolean) || [];
  const tasks: DisplayTask[] = taskStates.map(t => ({
    id: t.id,
    requirementName: t.requirementName || t.id.split(':').slice(1).join(':') || t.id,
    status: isTaskRunning(t.status) ? 'running'
      : isTaskCompleted(t.status) ? 'completed'
      : isTaskFailed(t.status) ? 'failed'
      : 'pending',
    claudeSessionId: t.claudeSessionId,
    errorMessage: t.errorMessage,
  }));

  // Calculate stats
  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    total: tasks.length,
  };

  const progress = stats.total > 0
    ? ((stats.completed + stats.failed) / stats.total) * 100
    : 0;

  const isRunning = session && isBatchRunning(session.status);
  const isPaused = session && isBatchPaused(session.status);
  const isCompleted = session && isBatchCompleted(session.status);

  // Tasks that can be added (selected but not in this session)
  const tasksToAdd = selectedTaskIds.filter(id =>
    !tasks.some(t => t.id === id)
  );

  const handleAddSelectedTasks = useCallback(() => {
    if (!session || tasksToAdd.length === 0) return;

    tasksToAdd.forEach(taskId => {
      // Extract requirement name from taskId (format: projectId:requirementName)
      const parts = taskId.split(':');
      const requirementName = parts.length > 1 ? parts.slice(1).join(':') : taskId;
      addTaskToBatchWithName(batchId, taskId, requirementName);
    });

    onAddTasks?.(tasksToAdd, tasksToAdd.map(id => {
      const parts = id.split(':');
      return parts.length > 1 ? parts.slice(1).join(':') : id;
    }));
  }, [session, tasksToAdd, batchId, addTaskToBatchWithName, onAddTasks]);

  const handleStart = useCallback(async () => {
    if (!session || isExecuting || !session.projectPath || !session.projectId) return;

    console.log('🚀 Starting session execution:', session.id);
    setIsExecuting(true);
    startBatch(batchId);

    // Create execution manager
    executionManagerRef.current = new SessionExecutionManager({
      batchId,
      sessionId: session.id,
      claudeSessionId: session.claudeSessionId || null,
      projectPath: session.projectPath,
      projectId: session.projectId,
      onTaskStatusChange: (taskId, status, extras) => {
        console.log(`📋 Task status change: ${taskId} -> ${status}`);
        updateTaskSessionStatus(batchId, taskId, status, extras);
      },
      onSessionStatusChange: (status) => {
        console.log(`📦 Session status change: ${status}`);
        // Status is auto-updated by updateTaskSessionStatus
        if (status === 'completed' || status === 'failed') {
          setIsExecuting(false);
        }
      },
      onClaudeSessionIdCaptured: (claudeSessionId) => {
        console.log(`📎 Captured Claude session ID: ${claudeSessionId}`);
        updateBatchClaudeSessionId(batchId, claudeSessionId);
      },
    });

    // Convert tasks to SessionTask format for execution manager
    const sessionTasks = tasks.map(t => ({
      id: t.id,
      requirementName: t.requirementName,
      status: t.status,
      claudeSessionId: t.claudeSessionId,
      errorMessage: t.errorMessage,
    }));

    await executionManagerRef.current.start(sessionTasks);
  }, [session, batchId, isExecuting, startBatch, updateTaskSessionStatus, updateBatchClaudeSessionId, tasks]);

  const handlePause = useCallback(() => {
    if (executionManagerRef.current) {
      executionManagerRef.current.pause();
    }
    pauseBatch(batchId);
    setIsExecuting(false);
  }, [batchId, pauseBatch]);

  const handleResume = useCallback(async () => {
    if (!session || isExecuting || !session.projectPath || !session.projectId) return;

    setIsExecuting(true);

    // Convert tasks to SessionTask format for execution manager
    const sessionTasks = tasks.map(t => ({
      id: t.id,
      requirementName: t.requirementName,
      status: t.status,
      claudeSessionId: t.claudeSessionId,
      errorMessage: t.errorMessage,
    }));

    if (executionManagerRef.current) {
      await executionManagerRef.current.resume(sessionTasks);
    } else {
      // Recreate execution manager if it doesn't exist
      executionManagerRef.current = new SessionExecutionManager({
        batchId,
        sessionId: session.id,
        claudeSessionId: session.claudeSessionId || null,
        projectPath: session.projectPath,
        projectId: session.projectId,
        onTaskStatusChange: (taskId, status, extras) => {
          updateTaskSessionStatus(batchId, taskId, status, extras);
        },
        onSessionStatusChange: (status) => {
          // Status is auto-updated by updateTaskSessionStatus
          if (status === 'completed' || status === 'failed') {
            setIsExecuting(false);
          }
        },
        onClaudeSessionIdCaptured: (claudeSessionId) => {
          updateBatchClaudeSessionId(batchId, claudeSessionId);
        },
      });

      await executionManagerRef.current.resume(sessionTasks);
    }
  }, [session, batchId, isExecuting, updateTaskSessionStatus, updateBatchClaudeSessionId, tasks]);

  const handleCompact = useCallback(() => {
    compactBatch(batchId);
  }, [batchId, compactBatch]);

  const handleClear = useCallback(() => {
    if (executionManagerRef.current) {
      executionManagerRef.current.pause();
    }
    deleteBatch(batchId);
  }, [batchId, deleteBatch]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditName(session?.name || '');
  }, [session?.name]);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim() && editName.trim() !== session?.name) {
      renameBatch(batchId, editName.trim());
    }
    setIsEditing(false);
  }, [editName, session?.name, batchId, renameBatch]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditName(session?.name || '');
  }, [session?.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  if (!session) return null;

  // Show running/pending items + last completed/failed
  const displayItems = [
    ...tasks.filter(t => t.status === 'running'),
    ...tasks.filter(t => t.status === 'pending'),
    ...tasks.filter(t => t.status === 'completed').slice(-2),
    ...tasks.filter(t => t.status === 'failed').slice(-2),
  ].slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full"
    >
      <div className={`relative bg-purple-900/20 border rounded-lg overflow-hidden ${
        isRunning
          ? 'border-purple-500/50 shadow-sm shadow-purple-500/20'
          : isCompleted
          ? 'border-green-500/50 shadow-sm shadow-green-500/20'
          : isPaused
          ? 'border-amber-500/50 shadow-sm shadow-amber-500/20'
          : 'border-purple-700/50'
      }`}>
        {/* Animated background for running state */}
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-pulse" />
        )}

        <div className="relative p-3 flex items-center gap-4">
          {/* Left Side: Session Info */}
          <div className="w-64 flex-shrink-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className="flex-1 bg-purple-900/50 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-purple-200 focus:outline-none focus:border-purple-400"
                      placeholder="Session name..."
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-0.5 hover:bg-purple-500/20 rounded text-emerald-400"
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-1 min-w-0 group">
                    <h3
                      className="text-xs font-semibold text-purple-300 truncate cursor-pointer hover:text-purple-200"
                      onClick={handleStartEdit}
                      title={`${session.name} (click to edit)`}
                    >
                      {session.name}
                    </h3>
                    <button
                      onClick={handleStartEdit}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-purple-500/20 rounded text-gray-400 hover:text-purple-300 transition-opacity"
                      title="Rename session"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Control Buttons */}
                {!isRunning && !isCompleted && stats.pending > 0 && (
                  <button
                    onClick={isPaused ? handleResume : handleStart}
                    disabled={isExecuting}
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors text-gray-400 hover:text-green-400 disabled:opacity-50"
                    title={isPaused ? "Resume session" : "Start session"}
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
                {isRunning && (
                  <button
                    onClick={handlePause}
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors text-gray-400 hover:text-amber-400"
                    title="Pause session"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                )}
                {stats.completed > 0 && !isRunning && (
                  <button
                    onClick={handleCompact}
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors text-gray-400 hover:text-purple-400"
                    title="Remove completed tasks"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400"
                  title="Clear session"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {isRunning && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] text-purple-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Running...</span>
                </div>
              )}
              {isPaused && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-400">
                  <Pause className="w-3 h-3" />
                  <span>Paused</span>
                </div>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-[10px] text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
                </div>
              )}
              {session.claudeSessionId && (
                <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] text-purple-400 font-mono truncate max-w-[100px]" title={`Session: ${session.claudeSessionId}`}>
                  {session.claudeSessionId.slice(0, 8)}...
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                {stats.pending}
              </span>
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-purple-400" />
                {stats.running}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {stats.completed}
              </span>
              {stats.failed > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  {stats.failed}
                </span>
              )}
            </div>

            {/* Add Tasks Button */}
            {tasksToAdd.length > 0 && (
              <button
                onClick={handleAddSelectedTasks}
                className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded text-[10px] text-purple-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add {tasksToAdd.length} selected
              </button>
            )}
          </div>

          {/* Right Side: Progress and Tasks */}
          <div className="flex-1 min-w-0 border-l border-purple-700/30 pl-4 space-y-2">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className={isRunning ? 'text-purple-400 font-medium' : 'text-gray-500'}>
                  {stats.completed + stats.failed} / {stats.total}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Task Items */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-purple-900">
              <AnimatePresence mode="popLayout">
                {displayItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`
                      relative flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded border
                      transition-all duration-200
                      ${getStatusColor(item.status, { runningTheme: 'purple' })}
                      min-w-[120px] max-w-[160px]
                    `}
                    title={`${item.requirementName} - ${item.status}${item.errorMessage ? `: ${item.errorMessage}` : ''}`}
                  >
                    <div className="flex-shrink-0">{getStatusIcon(item.status, { runningTheme: 'purple' })}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-gray-300 truncate">
                        {item.requirementName}
                      </div>
                      <div className="text-[8px] text-gray-500 truncate capitalize">
                        {item.status}
                      </div>
                    </div>

                    {/* Running pulse effect */}
                    {item.status === 'running' && (
                      <motion.div
                        className="absolute inset-0 rounded border border-purple-500/30"
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.01, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Show indicator if there are more items */}
              {tasks.length > displayItems.length && (
                <div className="flex-shrink-0 text-[9px] text-purple-600 font-medium px-2">
                  +{tasks.length - displayItems.length} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
