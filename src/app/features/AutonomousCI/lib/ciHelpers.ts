/**
 * CI Helper Functions
 * Utility functions for Autonomous CI feature
 */

import type { BuildStatus } from '@/app/db/models/autonomous-ci.types';

/**
 * Get color classes for build status
 */
export function getStatusColors(status: BuildStatus): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  icon: string;
} {
  const colors: Record<BuildStatus, {
    bg: string;
    text: string;
    border: string;
    gradient: string;
    icon: string;
  }> = {
    pending: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-400',
      border: 'border-gray-500/40',
      gradient: 'from-gray-500 to-slate-600',
      icon: 'text-gray-400',
    },
    running: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      gradient: 'from-amber-500 to-yellow-500',
      icon: 'text-amber-400',
    },
    success: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      gradient: 'from-emerald-500 to-green-500',
      icon: 'text-emerald-400',
    },
    failure: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/40',
      gradient: 'from-red-500 to-rose-600',
      icon: 'text-red-400',
    },
    cancelled: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
      gradient: 'from-orange-500 to-red-500',
      icon: 'text-orange-400',
    },
    skipped: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      border: 'border-slate-500/40',
      gradient: 'from-slate-500 to-slate-600',
      icon: 'text-slate-400',
    },
  };

  return colors[status] || colors.pending;
}

/**
 * Get score color for metrics
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e'; // emerald
  if (score >= 70) return '#f59e0b'; // amber
  if (score >= 50) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Format duration from milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms === 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format duration from seconds
 */
export function formatDurationSeconds(seconds: number): string {
  return formatDuration(seconds * 1000);
}

/**
 * Format relative time (time ago)
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return 'Just now';
}

/**
 * Format CI date for display
 */
export function formatCIDate(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate health score for a pipeline
 */
export function calculatePipelineHealth(
  successRate: number,
  avgBuildTime: number,
  maxBuildTime: number,
  flakyTestsCount: number
): number {
  // 60% success rate, 25% build time, 15% flaky tests
  const successScore = successRate;

  // Build time score (lower is better, max penalty if > 2x target)
  const timeRatio = maxBuildTime > 0 ? avgBuildTime / maxBuildTime : 0;
  const timeScore = Math.max(0, 100 - (timeRatio * 100));

  // Flaky tests score (0 flaky = 100, each flaky test reduces score)
  const flakyScore = Math.max(0, 100 - (flakyTestsCount * 10));

  const health = (successScore * 0.6) + (timeScore * 0.25) + (flakyScore * 0.15);
  return Math.round(Math.max(0, Math.min(100, health)));
}

/**
 * Get health status label
 */
export function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
}

/**
 * Get flakiness label
 */
export function getFlakinessLabel(score: number): string {
  if (score >= 50) return 'Very Flaky';
  if (score >= 30) return 'Flaky';
  if (score >= 10) return 'Occasionally Flaky';
  return 'Stable';
}

/**
 * Format test results
 */
export function formatTestResults(
  total: number,
  passed: number,
  failed: number,
  skipped: number
): string {
  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  return parts.join(', ') || 'No tests';
}

/**
 * Calculate success rate from build history
 */
export function calculateSuccessRate(
  successCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 100;
  return Math.round((successCount / totalCount) * 100 * 100) / 100;
}

/**
 * Get trigger type display name
 */
export function getTriggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    on_push: 'On Push',
    on_schedule: 'Scheduled',
    manual: 'Manual',
    webhook: 'Webhook',
    auto: 'Auto',
  };
  return labels[trigger] || trigger;
}

/**
 * Get prediction type display name
 */
export function getPredictionLabel(type: string): string {
  const labels: Record<string, string> = {
    build_failure: 'Build Failure',
    flaky_test: 'Flaky Test',
    performance_regression: 'Performance Regression',
    coverage_drop: 'Coverage Drop',
    long_build_time: 'Long Build Time',
    dependency_conflict: 'Dependency Conflict',
  };
  return labels[type] || type;
}

/**
 * Get impact color
 */
export function getImpactColor(impact: string): string {
  const colors: Record<string, string> = {
    low: 'text-gray-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };
  return colors[impact] || colors.medium;
}
