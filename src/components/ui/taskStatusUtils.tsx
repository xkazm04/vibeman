import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

/**
 * Shared task status utilities for consistent status presentation across the app.
 * Provides status icon and color mappings with configurable themes.
 *
 * Used by: DualBatchPanel, SessionBatchDisplay, TaskMonitor, and any component
 * that needs to display task/operation status.
 */

export type TaskStatusType = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
export type RunningTheme = 'blue' | 'purple';

interface StatusIconOptions {
  runningTheme?: RunningTheme;
}

/**
 * Returns the appropriate icon component for a given task status.
 * @param status - The task status
 * @param options - Configuration options (e.g., running theme color)
 */
export function getStatusIcon(status: TaskStatusType, options: StatusIconOptions = {}) {
  const { runningTheme = 'blue' } = options;
  const runningColor = runningTheme === 'purple' ? 'text-purple-400' : 'text-blue-400';

  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-gray-400" />;
    case 'queued':
      return <Clock className="w-3 h-3 text-amber-400" />;
    case 'running':
      return <Loader2 className={`w-3 h-3 ${runningColor} animate-spin`} />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    case 'failed':
    case 'session-limit':
      return <XCircle className="w-3 h-3 text-red-400" />;
    default:
      return null;
  }
}

interface StatusColorOptions {
  runningTheme?: RunningTheme;
}

/**
 * Returns the appropriate CSS classes for status-based border and background colors.
 * @param status - The task status
 * @param options - Configuration options (e.g., running theme color)
 */
export function getStatusColor(status: TaskStatusType, options: StatusColorOptions = {}): string {
  const { runningTheme = 'blue' } = options;
  const runningClasses = runningTheme === 'purple'
    ? 'border-purple-500/50 bg-purple-500/10'
    : 'border-blue-500/50 bg-blue-500/10';

  switch (status) {
    case 'running':
      return runningClasses;
    case 'completed':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'failed':
    case 'session-limit':
      return 'border-red-500/50 bg-red-500/10';
    case 'queued':
      return 'border-amber-500/50 bg-amber-500/10';
    case 'pending':
    default:
      return 'border-gray-600/50 bg-gray-700/10';
  }
}
