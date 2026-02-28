'use client';

import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Ghost,
  Loader2,
  CheckCircle2,
  Play,
  XCircle,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { useSessionCleanup } from '../hooks/useSessionCleanup';
import { OrphanedSessionItem } from './OrphanSessionShared';

interface ExecutionTask {
  id: string;
  projectPath: string;
  requirementName: string;
  projectId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progress: string[];
  startTime?: string;
  endTime?: string;
  error?: string;
}

interface TaskMonitorProps {
  projectId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  /** Show orphan session cleanup section (default: true) */
  showOrphanCleanup?: boolean;
}

/**
 * Fetches all tasks from the execution queue
 */
async function fetchAllTasks(projectId?: string): Promise<ExecutionTask[]> {
  try {
    const url = projectId
      ? `/api/claude-code/tasks?projectId=${encodeURIComponent(projectId)}`
      : '/api/claude-code/tasks';

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

/**
 * Get status icon based on task status
 */
function getStatusIcon(status: ExecutionTask['status'], progressCount: number, reducedMotion?: boolean | null) {
  switch (status) {
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-amber-400" />;
    case 'running':
      return progressCount === 0 ? (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <Loader2 className={`w-3.5 h-3.5 text-amber-400 ${reducedMotion ? 'animate-pulse' : 'animate-spin'}`} />
        </span>
      ) : (
        <Loader2 className={`w-3.5 h-3.5 text-blue-400 ${reducedMotion ? 'animate-pulse' : 'animate-spin'}`} />
      );
    case 'completed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case 'failed':
    case 'session-limit':
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  }
}

/**
 * Get status color class
 */
function getStatusColor(status: ExecutionTask['status'], progressCount: number, reducedMotion?: boolean | null): string {
  switch (status) {
    case 'pending':
      return 'border-amber-500/30 bg-amber-500/5';
    case 'running':
      return progressCount === 0
        ? `border-amber-500/40 bg-amber-500/10 ${reducedMotion ? '' : 'animate-pulse'}`
        : 'border-blue-500/30 bg-blue-500/5';
    case 'completed':
      return 'border-green-500/30 bg-green-500/5';
    case 'failed':
    case 'session-limit':
      return 'border-red-500/30 bg-red-500/5';
    default:
      return 'border-gray-500/30 bg-gray-500/5';
  }
}

/**
 * Format time duration
 */
function formatDuration(startTime?: string, endTime?: string): string {
  if (!startTime) return '-';

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end.getTime() - start.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Single task item in the monitor
 */
const TaskItem = memo(function TaskItem({ task }: { task: ExecutionTask }) {
  const prefersReducedMotion = useReducedMotion();
  const [showDetails, setShowDetails] = useState(false);
  const progressCount = task.progress?.length || 0;
  const isStuck = task.status === 'running' && progressCount === 0;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg overflow-hidden ${getStatusColor(task.status, progressCount, prefersReducedMotion)}`}
    >
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {getStatusIcon(task.status, progressCount, prefersReducedMotion)}
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-300 truncate">
              {task.requirementName}
            </div>
            <div className={`text-[10px] flex items-center gap-2 ${isStuck ? 'text-amber-400/80' : 'text-gray-500'}`}>
              <span>{isStuck ? 'stuck' : task.status}</span>
              <span>|</span>
              <span>{progressCount} lines</span>
              <span>|</span>
              <span>{formatDuration(task.startTime, task.endTime)}</span>
              {isStuck && (
                <>
                  <span>|</span>
                  <span className="text-amber-400 font-medium">No progress</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {showDetails ? (
            <ChevronUp className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 text-[10px] font-mono text-gray-500 max-h-32 overflow-y-auto bg-gray-900/50">
              {task.progress?.slice(-10).map((line, i) => (
                <div key={i} className="truncate py-0.5">
                  {line}
                </div>
              )) || <div className="text-gray-600 italic">No progress yet</div>}
              {task.error && (
                <div className="text-red-400 mt-1">Error: {task.error}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Task Monitor Component
 * Provides transparency into all running execution tasks and orphaned sessions
 */
export const TaskMonitor = memo(function TaskMonitor({
  projectId,
  autoRefresh = true,
  refreshInterval = 5000,
  showOrphanCleanup = true,
}: TaskMonitorProps) {
  const prefersReducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Orphan session cleanup hook
  const {
    orphanedSessions,
    isScanning: isOrphanScanning,
    isCleaning,
    error: orphanError,
    scanForOrphans,
    cleanupSessions,
    cleanupAll,
  } = useSessionCleanup({ projectId, autoScan: showOrphanCleanup });

  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return; // Skip if previous refresh still running
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const fetchedTasks = await fetchAllTasks(projectId);
      setTasks(fetchedTasks);
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [projectId]);

  // Auto-refresh effect
  useEffect(() => {
    refresh();

    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Count tasks by status
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const runningCount = tasks.filter(t => t.status === 'running').length;
  const stuckCount = tasks.filter(t => t.status === 'running' && (t.progress?.length || 0) === 0).length;
  const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'session-limit').length;
  const orphanCount = orphanedSessions.length;

  // Sort: stuck first, then running, then pending, then rest
  const sortedTasks = [...tasks].sort((a, b) => {
    const aStuck = a.status === 'running' && (a.progress?.length || 0) === 0;
    const bStuck = b.status === 'running' && (b.progress?.length || 0) === 0;
    if (aStuck && !bStuck) return -1;
    if (!aStuck && bStuck) return 1;

    const statusOrder = { pending: 0, running: 1, failed: 2, 'session-limit': 2, completed: 3 };
    return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
  });

  const handleCleanupSingle = useCallback(async (sessionId: string) => {
    await cleanupSessions([sessionId]);
  }, [cleanupSessions]);

  const handleCleanupAll = useCallback(async () => {
    await cleanupAll();
  }, [cleanupAll]);

  const handleRefreshAll = useCallback(() => {
    refresh();
    if (showOrphanCleanup) {
      scanForOrphans();
    }
  }, [refresh, showOrphanCleanup, scanForOrphans]);

  // Don't render if no tasks AND no orphans
  if (tasks.length === 0 && orphanCount === 0 && !isOrphanScanning) {
    return null;
  }

  const hasIssues = stuckCount > 0 || pendingCount > 0 || orphanCount > 0;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg overflow-hidden ${
        hasIssues
          ? 'border-orange-500/30 bg-orange-500/5'
          : 'border-gray-700/50 bg-gray-800/30'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Eye className={`w-4 h-4 ${hasIssues ? 'text-orange-400' : 'text-gray-400'}`} />
          <span className={`text-xs font-medium ${hasIssues ? 'text-orange-400' : 'text-gray-400'}`}>
            Session Health
          </span>
          <div className="flex items-center gap-1.5 text-[10px]">
            {orphanCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400" aria-label={`${orphanCount} orphaned session${orphanCount !== 1 ? 's' : ''}`}>
                <Ghost className="w-2.5 h-2.5" />
                {orphanCount} orphan{orphanCount !== 1 ? 's' : ''}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400" aria-label={`${pendingCount} task${pendingCount !== 1 ? 's' : ''} pending`}>
                <Clock className="w-2.5 h-2.5" />
                {pendingCount} pending
              </span>
            )}
            {runningCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400" aria-label={`${runningCount} task${runningCount !== 1 ? 's' : ''} running`}>
                <Play className="w-2.5 h-2.5" />
                {runningCount} running
              </span>
            )}
            {stuckCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-semibold ring-1 ring-amber-500/40" aria-label={`${stuckCount} task${stuckCount !== 1 ? 's' : ''} stuck`}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {stuckCount} stuck
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400" aria-label={`${failedCount} task${failedCount !== 1 ? 's' : ''} failed`}>
                <XCircle className="w-2.5 h-2.5" />
                {failedCount} failed
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Clean All button for orphans */}
          {orphanCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCleanupAll();
              }}
              disabled={isCleaning}
              className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded text-amber-400 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaning ? 'Cleaning...' : 'Clean All'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshAll();
            }}
            disabled={isRefreshing || isOrphanScanning}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-3 h-3 text-gray-400 ${isRefreshing || isOrphanScanning ? (prefersReducedMotion ? 'animate-pulse' : 'animate-spin') : ''}`} />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Error message */}
      {orphanError && (
        <div className="px-2.5 pb-2">
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            <X className="w-3 h-3" />
            <span>{orphanError}</span>
          </div>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 space-y-3 max-h-72 overflow-y-auto">
              {/* Orphaned Sessions Section */}
              {showOrphanCleanup && orphanCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] text-amber-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Orphaned Sessions</span>
                  </div>
                  {orphanedSessions.map((session) => (
                    <OrphanedSessionItem
                      key={session.id}
                      session={session}
                      onCleanup={handleCleanupSingle}
                      isDisabled={isCleaning}
                    />
                  ))}
                </div>
              )}

              {/* Tasks Section */}
              {tasks.length > 0 && (
                <div className="space-y-1.5">
                  {orphanCount > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                      <Activity className="w-3 h-3" />
                      <span>Execution Tasks</span>
                    </div>
                  )}
                  {sortedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
            {lastRefresh && (
              <div className="px-2.5 pb-2 text-[9px] text-gray-600">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default TaskMonitor;
