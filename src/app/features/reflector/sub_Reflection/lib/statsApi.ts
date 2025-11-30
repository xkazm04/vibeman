import { ReflectionStats, ComparisonStats, DateRange, AggregatedStatsResponse, TimeWindow } from './types';
import { ExecutiveInsightReport, ExecutiveInsightRequest, ExecutiveInsightResponse } from './executiveInsightTypes';

/**
 * Fetch reflection stats using the new aggregated endpoint with caching
 * Falls back to legacy endpoint if aggregated fails
 */
export async function fetchReflectionStats(
  projectId?: string | null,
  contextId?: string | null,
  dateRange?: DateRange,
  options?: {
    timeWindow?: TimeWindow;
    includeSnapshots?: boolean;
    useCache?: boolean;
  }
): Promise<ReflectionStats> {
  const params = new URLSearchParams();

  if (projectId) {
    params.append('projectId', projectId);
  }

  if (contextId) {
    params.append('contextId', contextId);
  }

  // Use aggregated endpoint with time window support
  if (dateRange?.startDate) {
    params.append('startDate', dateRange.startDate);
  }

  if (dateRange?.endDate) {
    params.append('endDate', dateRange.endDate);
  }

  if (options?.timeWindow) {
    params.append('timeWindow', options.timeWindow);
  }

  if (options?.includeSnapshots) {
    params.append('includeSnapshots', 'true');
  }

  if (options?.useCache === false) {
    params.append('nocache', 'true');
  }

  // Try aggregated endpoint first for better performance
  const aggregatedUrl = `/api/ideas/stats/aggregated${params.toString() ? `?${params.toString()}` : ''}`;

  try {
    const response = await fetch(aggregatedUrl);

    if (response.ok) {
      return response.json();
    }
  } catch {
    // Fall through to legacy endpoint
  }

  // Fallback to legacy endpoint
  const legacyUrl = `/api/ideas/stats${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(legacyUrl);

  if (!response.ok) {
    throw new Error('Failed to fetch reflection stats');
  }

  return response.json();
}

/**
 * Fetch aggregated stats with weekly snapshots for trend analysis
 */
export async function fetchAggregatedStatsWithSnapshots(
  projectId?: string | null,
  contextId?: string | null,
  timeWindow: TimeWindow = 'all'
): Promise<AggregatedStatsResponse> {
  const params = new URLSearchParams();

  if (projectId) {
    params.append('projectId', projectId);
  }

  if (contextId) {
    params.append('contextId', contextId);
  }

  params.append('timeWindow', timeWindow);
  params.append('includeSnapshots', 'true');

  const url = `/api/ideas/stats/aggregated?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch aggregated stats');
  }

  return response.json();
}

/**
 * Invalidate the analytics cache (call after data changes)
 */
export async function invalidateAnalyticsCache(
  projectId?: string,
  contextId?: string
): Promise<void> {
  try {
    await fetch('/api/ideas/stats/aggregated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalidate',
        projectId,
        contextId
      })
    });
  } catch {
    // Silently fail - cache will expire naturally
  }
}

/**
 * Pre-warm the analytics cache for better initial load performance
 */
export async function prewarmAnalyticsCache(): Promise<void> {
  try {
    await fetch('/api/ideas/stats/aggregated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prewarm' })
    });
  } catch {
    // Silently fail
  }
}

export async function fetchComparisonStats(
  projectId: string | null,
  contextId: string | null,
  period1: DateRange,
  period2: DateRange
): Promise<ComparisonStats> {
  const [stats1, stats2] = await Promise.all([
    fetchReflectionStats(projectId, contextId, period1),
    fetchReflectionStats(projectId, contextId, period2)
  ]);

  const scanTypeDifferences = stats1.scanTypes.map(st1 => {
    const st2 = stats2.scanTypes.find(s => s.scanType === st1.scanType);
    return {
      scanType: st1.scanType,
      acceptanceRatioDiff: st1.acceptanceRatio - (st2?.acceptanceRatio || 0),
      totalDiff: st1.total - (st2?.total || 0)
    };
  });

  return {
    period1: stats1,
    period2: stats2,
    period1Label: period1.label || 'Period 1',
    period2Label: period2.label || 'Period 2',
    differences: {
      scanTypes: scanTypeDifferences,
      overallAcceptanceDiff: stats1.overall.acceptanceRatio - stats2.overall.acceptanceRatio,
      totalIdeasDiff: stats1.overall.total - stats2.overall.total
    }
  };
}

/**
 * Fetch executive insights and narrative report
 */
export async function fetchExecutiveInsights(
  options?: ExecutiveInsightRequest
): Promise<ExecutiveInsightReport> {
  const params = new URLSearchParams();

  if (options?.projectId) {
    params.append('projectId', options.projectId);
  }

  if (options?.contextId) {
    params.append('contextId', options.contextId);
  }

  if (options?.timeWindow) {
    params.append('timeWindow', options.timeWindow);
  }

  if (options?.startDate) {
    params.append('startDate', options.startDate);
  }

  if (options?.endDate) {
    params.append('endDate', options.endDate);
  }

  if (options?.enableAI) {
    params.append('enableAI', 'true');
  }

  const url = `/api/ideas/stats/executive-insights${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch executive insights');
  }

  const result: ExecutiveInsightResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate executive insights');
  }

  return result.data;
}
