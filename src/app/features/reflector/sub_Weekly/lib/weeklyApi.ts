/**
 * Weekly Stats API
 * Fetches and calculates weekly statistics for Ideas and Directions.
 * Delegates status counting and acceptance-rate math to IdeaStatsAggregator
 * so that Weekly and Reflection views always agree on the same data.
 */

import { WeeklyStats, DailyStats, WeeklySpecialistStats, WeeklyContextMapStats, WeeklyFilters, ProjectImplementationStats } from './types';
import { ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';
import { SuggestionFilter } from '../../lib/unifiedTypes';
import { safeGet } from '@/lib/apiResponseGuard';
import {
  countIdeaStatuses,
  countDirectionStatuses,
  calculateAcceptanceRate,
  calculateFilteredAcceptanceRate,
  combineDistributions,
  calculateTrend,
  trendFromDelta,
} from '../../lib/ideaStatsAggregator';

/**
 * Get week date range based on offset
 */
export function getWeekRange(weekOffset: number = 0): { start: Date; end: Date; label: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Current week start (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday + (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);
  
  // Week end (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // Generate label
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const label = weekOffset === 0 
    ? 'This Week' 
    : weekOffset === -1 
      ? 'Last Week' 
      : `Week of ${formatDate(weekStart)}`;
  
  return { start: weekStart, end: weekEnd, label };
}

/**
 * Fetch weekly statistics from API
 */
export async function fetchWeeklyStats(filters: WeeklyFilters): Promise<WeeklyStats> {
  const { start, end, label } = getWeekRange(filters.weekOffset);
  const suggestionType = filters.suggestionType || 'both';

  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.contextId) params.set('contextId', filters.contextId);
  params.set('startDate', start.toISOString());
  params.set('endDate', end.toISOString());

  try {
    // Fetch ideas and directions in parallel based on filter
    const fetchIdeas = suggestionType === 'directions' ? Promise.resolve({ ideas: [] }) :
      fetch(`/api/ideas?${params.toString()}`).then(r => r.ok ? r.json() : { ideas: [] }).catch(() => ({ ideas: [] }));

    const fetchDirections = suggestionType === 'ideas' ? Promise.resolve({ directions: [] }) :
      fetch(`/api/directions?${params.toString()}`).then(r => r.ok ? r.json() : { directions: [] }).catch(() => ({ directions: [] }));

    const [ideasData, directionsData] = await Promise.all([fetchIdeas, fetchDirections]);
    const ideas = safeGet<any[]>(ideasData, 'ideas', []);
    const directions = safeGet<any[]>(directionsData, 'directions', []);

    // Fetch last week for comparison
    const lastWeekParams = new URLSearchParams(params);
    const { start: lastStart, end: lastEnd } = getWeekRange(filters.weekOffset - 1);
    lastWeekParams.set('startDate', lastStart.toISOString());
    lastWeekParams.set('endDate', lastEnd.toISOString());

    const fetchLastIdeas = suggestionType === 'directions' ? Promise.resolve({ ideas: [] }) :
      fetch(`/api/ideas?${lastWeekParams.toString()}`).then(r => r.ok ? r.json() : { ideas: [] }).catch(() => ({ ideas: [] }));

    const fetchLastDirections = suggestionType === 'ideas' ? Promise.resolve({ directions: [] }) :
      fetch(`/api/directions?${lastWeekParams.toString()}`).then(r => r.ok ? r.json() : { directions: [] }).catch(() => ({ directions: [] }));

    const [lastIdeasData, lastDirectionsData] = await Promise.all([fetchLastIdeas, fetchLastDirections]);
    const lastWeekIdeas = safeGet<any[]>(lastIdeasData, 'ideas', []);
    const lastWeekDirections = safeGet<any[]>(lastDirectionsData, 'directions', []);

    return processWeeklyData(
      ideas,
      directions,
      lastWeekIdeas,
      lastWeekDirections,
      start,
      end,
      label,
      suggestionType
    );
  } catch (error) {
    console.error('[WeeklyStats] Error fetching:', error);
    throw error;
  }
}

/**
 * Process raw ideas and directions into weekly statistics.
 * Uses IdeaStatsAggregator for all counting & acceptance-rate math.
 */
function processWeeklyData(
  ideas: any[],
  directions: any[],
  lastWeekIdeas: any[],
  lastWeekDirections: any[],
  weekStart: Date,
  weekEnd: Date,
  weekLabel: string,
  suggestionType: SuggestionFilter
): WeeklyStats {
  const ideasDist = countIdeaStatuses(ideas);
  const dirsDist = countDirectionStatuses(directions);
  const combined = combineDistributions(ideasDist, dirsDist);
  const { acceptanceRate } = calculateFilteredAcceptanceRate(ideasDist, dirsDist, suggestionType);

  const overall = {
    total: combined.total,
    accepted: combined.accepted,
    rejected: combined.rejected,
    implemented: combined.implemented,
    pending: combined.pending,
    acceptanceRate,
    ideasTotal: ideasDist.total,
    directionsTotal: dirsDist.total,
  };

  // Calculate daily breakdown (combined)
  const dailyBreakdown = generateDailyBreakdown(ideas, directions, weekStart);

  // Calculate specialist stats (ideas only)
  const specialists = calculateSpecialistStats(ideas, lastWeekIdeas);

  // Calculate context map stats (directions only)
  const contextMaps = calculateContextMapStats(directions, lastWeekDirections);

  // Calculate comparison with last week
  const lastWeekTotal = lastWeekIdeas.length + lastWeekDirections.length;
  const { changePercent, trend } = calculateTrend(overall.total, lastWeekTotal);
  const comparison = { lastWeekTotal, changePercent, trend };

  // Find top performers (ideas - highest acceptance rate with at least 3 ideas)
  const topPerformers = specialists
    .filter(s => s.total >= 3)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 3)
    .map(s => ({ scanType: s.scanType, acceptanceRate: s.acceptanceRate }));

  // Find top context maps (directions)
  const topContextMaps = contextMaps
    .filter(c => c.total >= 2)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 3)
    .map(c => ({ contextMapTitle: c.contextMapTitle, acceptanceRate: c.acceptanceRate }));

  // Find specialists needing attention
  const needsAttention = specialists
    .filter(s => s.total >= 3 && s.acceptanceRate < 40)
    .map(s => ({
      scanType: s.scanType,
      reason: s.acceptanceRate < 20 ? 'Very low acceptance' : 'Below average acceptance',
      acceptanceRate: s.acceptanceRate,
    }));

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekLabel,
    overall,
    dailyBreakdown,
    specialists,
    contextMaps,
    comparison,
    topPerformers,
    topContextMaps,
    needsAttention,
  };
}

/**
 * Generate daily breakdown for the week (combined ideas + directions)
 */
function generateDailyBreakdown(ideas: any[], directions: any[], weekStart: Date): DailyStats[] {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dailyStats: DailyStats[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];

    const dayIdeas = ideas.filter(idea => {
      const ideaDate = new Date(idea.created_at || idea.createdAt).toISOString().split('T')[0];
      return ideaDate === dayStr;
    });

    const dayDirections = directions.filter(dir => {
      const dirDate = new Date(dir.created_at || dir.createdAt).toISOString().split('T')[0];
      return dirDate === dayStr;
    });

    const ideasDist = countIdeaStatuses(dayIdeas);
    const dirsDist = countDirectionStatuses(dayDirections);
    const combined = combineDistributions(ideasDist, dirsDist);
    const { acceptanceRate } = calculateAcceptanceRate(combined);

    dailyStats.push({
      date: dayStr,
      dayName: dayNames[i],
      total: combined.total,
      accepted: combined.accepted,
      rejected: combined.rejected,
      implemented: combined.implemented,
      acceptanceRate,
      ideasTotal: ideasDist.total,
      directionsTotal: dirsDist.total,
    });
  }

  return dailyStats;
}

/**
 * Calculate specialist (scan type) statistics
 */
function calculateSpecialistStats(ideas: any[], lastWeekIdeas: any[]): WeeklySpecialistStats[] {
  const stats: WeeklySpecialistStats[] = [];

  for (const scanType of ALL_SCAN_TYPES) {
    const typeIdeas = ideas.filter(i => i.scan_type === scanType);
    const lastTypeIdeas = lastWeekIdeas.filter(i => i.scan_type === scanType);

    if (typeIdeas.length === 0 && lastTypeIdeas.length === 0) continue;

    const dist = countIdeaStatuses(typeIdeas);
    const { acceptanceRate } = calculateAcceptanceRate(dist);

    const lastDist = countIdeaStatuses(lastTypeIdeas);
    const { acceptanceRate: lastAcceptanceRate } = calculateAcceptanceRate(lastDist);

    const changeFromLastWeek = acceptanceRate - lastAcceptanceRate;

    stats.push({
      scanType,
      total: dist.total,
      accepted: dist.accepted,
      rejected: dist.rejected,
      implemented: dist.implemented,
      acceptanceRate,
      trend: trendFromDelta(changeFromLastWeek),
      changeFromLastWeek,
    });
  }

  return stats.sort((a, b) => b.total - a.total);
}

/**
 * Calculate context map (direction source) statistics
 */
function calculateContextMapStats(directions: any[], lastWeekDirections: any[]): WeeklyContextMapStats[] {
  const stats: WeeklyContextMapStats[] = [];

  // Group directions by context_map_id
  const contextMapGroups = new Map<string, { title: string; directions: any[] }>();
  directions.forEach(d => {
    const existing = contextMapGroups.get(d.context_map_id);
    if (existing) {
      existing.directions.push(d);
    } else {
      contextMapGroups.set(d.context_map_id, {
        title: d.context_map_title || d.context_map_id,
        directions: [d]
      });
    }
  });

  // Group last week directions
  const lastWeekGroups = new Map<string, any[]>();
  lastWeekDirections.forEach(d => {
    const existing = lastWeekGroups.get(d.context_map_id);
    if (existing) {
      existing.push(d);
    } else {
      lastWeekGroups.set(d.context_map_id, [d]);
    }
  });

  // Calculate stats for each context map
  for (const [contextMapId, { title, directions: cmDirections }] of contextMapGroups) {
    const lastCmDirections = lastWeekGroups.get(contextMapId) || [];

    const dist = countDirectionStatuses(cmDirections);
    const { acceptanceRate } = calculateAcceptanceRate(dist);

    const lastDist = countDirectionStatuses(lastCmDirections);
    const { acceptanceRate: lastAcceptanceRate } = calculateAcceptanceRate(lastDist);

    const changeFromLastWeek = acceptanceRate - lastAcceptanceRate;

    stats.push({
      contextMapId,
      contextMapTitle: title,
      total: dist.total,
      accepted: dist.accepted,
      rejected: dist.rejected,
      pending: dist.pending,
      acceptanceRate,
      trend: trendFromDelta(changeFromLastWeek),
      changeFromLastWeek,
    });
  }

  return stats.sort((a, b) => b.total - a.total);
}

/**
 * Fetch project implementation statistics
 */
export async function fetchProjectImplementationStats(): Promise<ProjectImplementationStats[]> {
  try {
    const response = await fetch('/api/reflector/project-implementations');
    if (!response.ok) throw new Error('Failed to fetch project implementation stats');
    const data = await response.json();
    return safeGet<ProjectImplementationStats[]>(data, 'projects', []);
  } catch (error) {
    console.error('[ProjectImplementationStats] Error fetching:', error);
    throw error;
  }
}

