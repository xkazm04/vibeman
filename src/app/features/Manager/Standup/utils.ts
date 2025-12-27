/**
 * Standup Module Utilities
 * Helper functions for time formatting and data processing
 */

import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, STATUS_CONFIGS } from './constants';
import type { GoalStatus, StatusConfig } from './types';

/**
 * Format a timestamp as relative time ago
 */
export function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Format a timestamp as time until
 */
export function formatTimeUntil(isoString: string | null): string {
  if (!isoString) return '--';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins <= 0) return 'Soon';
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m`;
}

/**
 * Get status configuration for a goal status
 */
export function getStatusConfig(status: GoalStatus): StatusConfig {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.open;
}

/**
 * Get color classes for a category
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

/**
 * Get priority score color classes
 */
export function getPriorityColor(score: number): string {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  if (score >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
  return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
}
