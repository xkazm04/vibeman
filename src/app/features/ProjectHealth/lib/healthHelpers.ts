/**
 * Health Score Helper Functions
 * Utility functions for health score calculations and display
 */

import { HealthScoreStatus, HealthScoreCategory } from '@/app/db/models/project-health.types';

/**
 * Get color classes for health status
 */
export function getStatusColors(status: HealthScoreStatus): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
} {
  const colors: Record<HealthScoreStatus, { bg: string; text: string; border: string; gradient: string }> = {
    excellent: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      gradient: 'from-emerald-500 to-green-500',
    },
    good: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
      gradient: 'from-cyan-500 to-blue-500',
    },
    fair: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      gradient: 'from-amber-500 to-yellow-500',
    },
    poor: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/40',
      gradient: 'from-orange-500 to-red-500',
    },
    critical: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/40',
      gradient: 'from-red-500 to-rose-600',
    },
  };

  return colors[status] || colors.fair;
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return '#22c55e'; // emerald
  if (score >= 70) return '#06b6d4'; // cyan
  if (score >= 50) return '#f59e0b'; // amber
  if (score >= 30) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: HealthScoreCategory): string {
  const labels: Record<HealthScoreCategory, string> = {
    idea_backlog: 'Idea Backlog',
    tech_debt: 'Technical Debt',
    security: 'Security',
    test_coverage: 'Test Coverage',
    goal_completion: 'Goal Completion',
    code_quality: 'Code Quality',
  };

  return labels[category] || category;
}

/**
 * Get category icon name (for lucide-react)
 */
export function getCategoryIcon(category: HealthScoreCategory): string {
  const icons: Record<HealthScoreCategory, string> = {
    idea_backlog: 'Lightbulb',
    tech_debt: 'Wrench',
    security: 'Shield',
    test_coverage: 'TestTube2',
    goal_completion: 'Target',
    code_quality: 'Code2',
  };

  return icons[category] || 'Circle';
}

/**
 * Get category color
 */
export function getCategoryColor(category: HealthScoreCategory): string {
  const colors: Record<HealthScoreCategory, string> = {
    idea_backlog: '#a855f7', // purple
    tech_debt: '#f97316', // orange
    security: '#ef4444', // red
    test_coverage: '#22c55e', // green
    goal_completion: '#06b6d4', // cyan
    code_quality: '#3b82f6', // blue
  };

  return colors[category] || '#6b7280';
}

/**
 * Format date for display
 */
export function formatHealthDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate grade from score
 */
export function getScoreGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 77) return 'B+';
  if (score >= 73) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 67) return 'C+';
  if (score >= 63) return 'C';
  if (score >= 60) return 'C-';
  if (score >= 57) return 'D+';
  if (score >= 53) return 'D';
  if (score >= 50) return 'D-';
  return 'F';
}

/**
 * Get trend description
 */
export function getTrendDescription(trend: number, direction: 'up' | 'down' | 'stable'): string {
  if (direction === 'stable' || Math.abs(trend) < 1) {
    return 'Stable';
  }

  const abs = Math.abs(Math.round(trend));

  if (direction === 'up') {
    if (abs >= 10) return `Strong improvement (+${abs})`;
    if (abs >= 5) return `Improving (+${abs})`;
    return `Slight improvement (+${abs})`;
  }

  if (abs >= 10) return `Significant decline (-${abs})`;
  if (abs >= 5) return `Declining (-${abs})`;
  return `Slight decline (-${abs})`;
}
