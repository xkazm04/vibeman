/**
 * Weekly Stats API
 * Fetches and calculates weekly statistics for Ideas and Directions
 */

import { WeeklyStats, DailyStats, WeeklySpecialistStats, WeeklyContextMapStats, WeeklyFilters, ProjectImplementationStats } from './types';
import { ScanType, ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';
import { SuggestionFilter } from '../../lib/unifiedTypes';

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
      fetch(`/api/ideas?${params.toString()}`).then(r => r.ok ? r.json() : { ideas: [] });

    const fetchDirections = suggestionType === 'ideas' ? Promise.resolve({ directions: [] }) :
      fetch(`/api/directions?${params.toString()}`).then(r => r.ok ? r.json() : { directions: [] });

    const [ideasData, directionsData] = await Promise.all([fetchIdeas, fetchDirections]);
    const ideas = ideasData.ideas || [];
    const directions = directionsData.directions || [];

    // Fetch last week for comparison
    const lastWeekParams = new URLSearchParams(params);
    const { start: lastStart, end: lastEnd } = getWeekRange(filters.weekOffset - 1);
    lastWeekParams.set('startDate', lastStart.toISOString());
    lastWeekParams.set('endDate', lastEnd.toISOString());

    const fetchLastIdeas = suggestionType === 'directions' ? Promise.resolve({ ideas: [] }) :
      fetch(`/api/ideas?${lastWeekParams.toString()}`).then(r => r.ok ? r.json() : { ideas: [] });

    const fetchLastDirections = suggestionType === 'ideas' ? Promise.resolve({ directions: [] }) :
      fetch(`/api/directions?${lastWeekParams.toString()}`).then(r => r.ok ? r.json() : { directions: [] });

    const [lastIdeasData, lastDirectionsData] = await Promise.all([fetchLastIdeas, fetchLastDirections]);
    const lastWeekIdeas = lastIdeasData.ideas || [];
    const lastWeekDirections = lastDirectionsData.directions || [];

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
 * Process raw ideas and directions into weekly statistics
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
  // Calculate ideas stats
  const ideasStats = {
    total: ideas.length,
    accepted: ideas.filter(i => i.status === 'accepted').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
    pending: ideas.filter(i => i.status === 'pending').length,
  };

  // Calculate directions stats (no implemented status for directions)
  const directionsStats = {
    total: directions.length,
    accepted: directions.filter(d => d.status === 'accepted').length,
    rejected: directions.filter(d => d.status === 'rejected').length,
    pending: directions.filter(d => d.status === 'pending').length,
  };

  // Calculate combined overall stats
  const overall = {
    total: ideasStats.total + directionsStats.total,
    accepted: ideasStats.accepted + directionsStats.accepted,
    rejected: ideasStats.rejected + directionsStats.rejected,
    implemented: ideasStats.implemented, // Only ideas have implemented
    pending: ideasStats.pending + directionsStats.pending,
    acceptanceRate: 0,
    ideasTotal: ideasStats.total,
    directionsTotal: directionsStats.total,
  };

  // Calculate acceptance rate based on suggestion type
  if (suggestionType === 'ideas') {
    overall.acceptanceRate = ideasStats.total > 0
      ? Math.round(((ideasStats.accepted + ideasStats.implemented) / ideasStats.total) * 100)
      : 0;
  } else if (suggestionType === 'directions') {
    overall.acceptanceRate = directionsStats.total > 0
      ? Math.round((directionsStats.accepted / directionsStats.total) * 100)
      : 0;
  } else {
    // Combined: weighted acceptance
    const totalAccepted = ideasStats.accepted + ideasStats.implemented + directionsStats.accepted;
    overall.acceptanceRate = overall.total > 0
      ? Math.round((totalAccepted / overall.total) * 100)
      : 0;
  }

  // Calculate daily breakdown (combined)
  const dailyBreakdown = generateDailyBreakdown(ideas, directions, weekStart);

  // Calculate specialist stats (ideas only)
  const specialists = calculateSpecialistStats(ideas, lastWeekIdeas);

  // Calculate context map stats (directions only)
  const contextMaps = calculateContextMapStats(directions, lastWeekDirections);

  // Calculate comparison with last week (combined totals)
  const lastWeekTotal = lastWeekIdeas.length + lastWeekDirections.length;
  const currentTotal = overall.total;
  const comparison = {
    lastWeekTotal,
    changePercent: lastWeekTotal > 0
      ? Math.round(((currentTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : currentTotal > 0 ? 100 : 0,
    trend: currentTotal > lastWeekTotal ? 'up' as const
      : currentTotal < lastWeekTotal ? 'down' as const : 'stable' as const,
  };

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

    // Filter ideas for this day
    const dayIdeas = ideas.filter(idea => {
      const ideaDate = new Date(idea.created_at || idea.createdAt).toISOString().split('T')[0];
      return ideaDate === dayStr;
    });

    // Filter directions for this day
    const dayDirections = directions.filter(dir => {
      const dirDate = new Date(dir.created_at || dir.createdAt).toISOString().split('T')[0];
      return dirDate === dayStr;
    });

    // Calculate ideas stats
    const ideasAccepted = dayIdeas.filter(i => i.status === 'accepted').length;
    const ideasImplemented = dayIdeas.filter(i => i.status === 'implemented').length;
    const ideasRejected = dayIdeas.filter(i => i.status === 'rejected').length;

    // Calculate directions stats
    const dirsAccepted = dayDirections.filter(d => d.status === 'accepted').length;
    const dirsRejected = dayDirections.filter(d => d.status === 'rejected').length;

    // Combined totals
    const total = dayIdeas.length + dayDirections.length;
    const accepted = ideasAccepted + dirsAccepted;
    const rejected = ideasRejected + dirsRejected;
    const implemented = ideasImplemented; // Only ideas have implemented

    // Acceptance rate: (accepted + implemented) / total for ideas, accepted/total for directions
    const totalAccepted = ideasAccepted + ideasImplemented + dirsAccepted;
    const acceptanceRate = total > 0 ? Math.round((totalAccepted / total) * 100) : 0;

    dailyStats.push({
      date: dayStr,
      dayName: dayNames[i],
      total,
      accepted,
      rejected,
      implemented,
      acceptanceRate,
      ideasTotal: dayIdeas.length,
      directionsTotal: dayDirections.length,
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
    
    const total = typeIdeas.length;
    const accepted = typeIdeas.filter(i => i.status === 'accepted').length;
    const rejected = typeIdeas.filter(i => i.status === 'rejected').length;
    const implemented = typeIdeas.filter(i => i.status === 'implemented').length;
    const acceptanceRate = total > 0 ? Math.round(((accepted + implemented) / total) * 100) : 0;
    
    const lastAcceptanceRate = lastTypeIdeas.length > 0
      ? Math.round(((lastTypeIdeas.filter(i => i.status === 'accepted' || i.status === 'implemented').length) / lastTypeIdeas.length) * 100)
      : 0;
    
    const changeFromLastWeek = acceptanceRate - lastAcceptanceRate;
    
    stats.push({
      scanType,
      total,
      accepted,
      rejected,
      implemented,
      acceptanceRate,
      trend: changeFromLastWeek > 5 ? 'up' : changeFromLastWeek < -5 ? 'down' : 'stable',
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

    const total = cmDirections.length;
    const accepted = cmDirections.filter(d => d.status === 'accepted').length;
    const rejected = cmDirections.filter(d => d.status === 'rejected').length;
    const pending = cmDirections.filter(d => d.status === 'pending').length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const lastAcceptanceRate = lastCmDirections.length > 0
      ? Math.round((lastCmDirections.filter(d => d.status === 'accepted').length / lastCmDirections.length) * 100)
      : 0;

    const changeFromLastWeek = acceptanceRate - lastAcceptanceRate;

    stats.push({
      contextMapId,
      contextMapTitle: title,
      total,
      accepted,
      rejected,
      pending,
      acceptanceRate,
      trend: changeFromLastWeek > 5 ? 'up' : changeFromLastWeek < -5 ? 'down' : 'stable',
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
    return data.projects || [];
  } catch (error) {
    console.error('[ProjectImplementationStats] Error fetching:', error);
    throw error;
  }
}

