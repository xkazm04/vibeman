/**
 * Stats Helpers for Reflector
 * Helper functions for calculating statistics
 */

import { DbIdea } from '@/app/db';

export interface ReflectorStats {
  today: number;
  week: number;
  month: number;
}

/**
 * Calculate stats for implemented ideas
 */
export function calculateImplementedStats(ideas: DbIdea[]): ReflectorStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    today: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= today;
    }).length,
    week: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= weekAgo;
    }).length,
    month: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= monthAgo;
    }).length,
  };
}

/**
 * Filter ideas by view mode (weekly vs total)
 */
export function filterIdeasByViewMode(
  ideas: DbIdea[],
  viewMode: 'weekly' | 'total' | 'ideas_stats' | 'dependencies'
): DbIdea[] {
  if (viewMode === 'weekly') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return ideas.filter(idea => {
      if (!idea.implemented_at) return false;
      const implementedDate = new Date(idea.implemented_at);
      return implementedDate >= oneWeekAgo;
    });
  }

  return ideas;
}













