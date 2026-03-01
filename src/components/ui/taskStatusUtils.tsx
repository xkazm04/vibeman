import { CheckCircle2, Clock, FileCode, Loader2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared task status utilities for consistent status presentation across the app.
 * Provides status icon and color mappings with configurable themes.
 *
 * Used by: TaskItem, TaskMonitor, TaskProgress, DualBatchPanel,
 * SessionBatchDisplay, and any component that needs to display task/operation status.
 */

export type TaskStatusType = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
export type RunningTheme = 'blue' | 'purple';

// ── Canonical status theme ─────────────────────────────────────────────────
// Single source of truth for all status-related colors across the app.

export interface StatusThemeEntry {
  border: string;   // Tailwind border class (e.g. 'border-blue-500/40')
  bg: string;       // Tailwind background class (e.g. 'bg-blue-500/5')
  text: string;     // Tailwind text color class for icons/labels
  barBg: string;    // Progress bar track color
  barFill: string;  // Progress bar fill color
  Icon: LucideIcon; // Default icon component
}

export const STATUS_THEME: Record<string, StatusThemeEntry> = {
  idle: {
    border: 'border-gray-700/30',
    bg: 'bg-gray-800/20',
    text: 'text-gray-400',
    barBg: 'bg-gray-500/30',
    barFill: 'bg-gray-400',
    Icon: FileCode,
  },
  pending: {
    border: 'border-gray-600/50',
    bg: 'bg-gray-700/10',
    text: 'text-gray-400',
    barBg: 'bg-gray-500/30',
    barFill: 'bg-gray-400',
    Icon: Clock,
  },
  queued: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    barBg: 'bg-amber-500/30',
    barFill: 'bg-amber-400',
    Icon: Clock,
  },
  running: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    barBg: 'bg-blue-500/30',
    barFill: 'bg-blue-400',
    Icon: Loader2,
  },
  completed: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/5',
    text: 'text-green-400',
    barBg: 'bg-green-500/30',
    barFill: 'bg-green-400',
    Icon: CheckCircle2,
  },
  failed: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    barBg: 'bg-red-500/30',
    barFill: 'bg-red-400',
    Icon: XCircle,
  },
  'session-limit': {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    barBg: 'bg-red-500/30',
    barFill: 'bg-red-400',
    Icon: XCircle,
  },
};

/** Look up a theme entry, falling back to idle for unknown statuses. */
export function getTheme(status: string): StatusThemeEntry {
  return STATUS_THEME[status] || STATUS_THEME.idle;
}

// ── Legacy helper functions (kept for backward compatibility) ───────────────

interface StatusIconOptions {
  runningTheme?: RunningTheme;
}

export function getStatusIcon(status: TaskStatusType, options: StatusIconOptions = {}) {
  const { runningTheme = 'blue' } = options;
  const runningColor = runningTheme === 'purple' ? 'text-purple-400' : 'text-blue-400';

  const theme = getTheme(status);
  const textColor = status === 'running' ? runningColor : theme.text;
  const IconComp = theme.Icon;

  const spin = status === 'running' ? ' animate-spin' : '';
  return <IconComp className={`w-3 h-3 ${textColor}${spin}`} />;
}

interface StatusColorOptions {
  runningTheme?: RunningTheme;
}

export function getStatusColor(status: TaskStatusType, options: StatusColorOptions = {}): string {
  const { runningTheme = 'blue' } = options;

  if (status === 'running' && runningTheme === 'purple') {
    return 'border-purple-500/50 bg-purple-500/10';
  }

  const theme = getTheme(status);
  return `${theme.border} ${theme.bg}`;
}
