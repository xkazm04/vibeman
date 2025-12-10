/**
 * Weekly Stats API
 * Fetches and calculates weekly statistics
 */

import { WeeklyStats, DailyStats, WeeklySpecialistStats, WeeklyFilters } from './types';
import { ScanType, ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';

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
  
  const params = new URLSearchParams();
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.contextId) params.set('contextId', filters.contextId);
  params.set('startDate', start.toISOString());
  params.set('endDate', end.toISOString());
  
  try {
    // Fetch ideas for the current week
    const response = await fetch(`/api/ideas?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch ideas');
    const data = await response.json();
    const ideas = data.ideas || [];
    
    // Fetch last week for comparison
    const lastWeekParams = new URLSearchParams(params);
    const { start: lastStart, end: lastEnd } = getWeekRange(filters.weekOffset - 1);
    lastWeekParams.set('startDate', lastStart.toISOString());
    lastWeekParams.set('endDate', lastEnd.toISOString());
    
    const lastWeekResponse = await fetch(`/api/ideas?${lastWeekParams.toString()}`);
    const lastWeekData = await lastWeekResponse.json();
    const lastWeekIdeas = lastWeekData.ideas || [];
    
    return processWeeklyData(ideas, lastWeekIdeas, start, end, label);
  } catch (error) {
    console.error('[WeeklyStats] Error fetching:', error);
    throw error;
  }
}

/**
 * Process raw ideas into weekly statistics
 */
function processWeeklyData(
  ideas: any[],
  lastWeekIdeas: any[],
  weekStart: Date,
  weekEnd: Date,
  weekLabel: string
): WeeklyStats {
  // Calculate overall stats
  const overall = {
    total: ideas.length,
    accepted: ideas.filter(i => i.status === 'accepted').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
    pending: ideas.filter(i => i.status === 'pending').length,
    acceptanceRate: 0,
  };
  overall.acceptanceRate = overall.total > 0 
    ? Math.round(((overall.accepted + overall.implemented) / overall.total) * 100) 
    : 0;
  
  // Calculate daily breakdown
  const dailyBreakdown = generateDailyBreakdown(ideas, weekStart);
  
  // Calculate specialist stats
  const specialists = calculateSpecialistStats(ideas, lastWeekIdeas);
  
  // Calculate comparison with last week
  const comparison = {
    lastWeekTotal: lastWeekIdeas.length,
    changePercent: lastWeekIdeas.length > 0 
      ? Math.round(((ideas.length - lastWeekIdeas.length) / lastWeekIdeas.length) * 100)
      : ideas.length > 0 ? 100 : 0,
    trend: ideas.length > lastWeekIdeas.length ? 'up' as const 
      : ideas.length < lastWeekIdeas.length ? 'down' as const : 'stable' as const,
  };
  
  // Find top performers (highest acceptance rate with at least 3 ideas)
  const topPerformers = specialists
    .filter(s => s.total >= 3)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 3)
    .map(s => ({ scanType: s.scanType, acceptanceRate: s.acceptanceRate }));
  
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
    comparison,
    topPerformers,
    needsAttention,
  };
}

/**
 * Generate daily breakdown for the week
 */
function generateDailyBreakdown(ideas: any[], weekStart: Date): DailyStats[] {
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
    
    const total = dayIdeas.length;
    const accepted = dayIdeas.filter(i => i.status === 'accepted').length;
    const rejected = dayIdeas.filter(i => i.status === 'rejected').length;
    const implemented = dayIdeas.filter(i => i.status === 'implemented').length;
    
    dailyStats.push({
      date: dayStr,
      dayName: dayNames[i],
      total,
      accepted,
      rejected,
      implemented,
      acceptanceRate: total > 0 ? Math.round(((accepted + implemented) / total) * 100) : 0,
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

