/**
 * Shared formatting utilities for the Conductor feature.
 *
 * Consolidates the formatDuration helper that was duplicated across
 * ProcessLog, MetricsBar, RunHistoryTimeline, CompletionHero, and reportGenerator.
 */

/**
 * Format a duration in milliseconds to a human-readable string.
 *
 * - <1000ms  -> "Xms"
 * - <60s     -> "Xs"
 * - <60m     -> "Xm Ys"
 * - >=60m    -> "Xh Ym"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes < 60) {
    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a timestamp string to HH:MM (24-hour).
 */
export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a cost value as a dollar string.
 */
export function formatCost(cost: number): string {
  if (cost <= 0) return '$0.00';
  return `$${cost.toFixed(2)}`;
}
