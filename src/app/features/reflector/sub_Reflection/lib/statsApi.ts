import { ReflectionStats, ComparisonStats, DateRange } from './types';

export async function fetchReflectionStats(
  projectId?: string | null,
  contextId?: string | null,
  dateRange?: DateRange
): Promise<ReflectionStats> {
  const params = new URLSearchParams();

  if (projectId) {
    params.append('projectId', projectId);
  }

  if (contextId) {
    params.append('contextId', contextId);
  }

  if (dateRange?.startDate) {
    params.append('startDate', dateRange.startDate);
  }

  if (dateRange?.endDate) {
    params.append('endDate', dateRange.endDate);
  }

  const url = `/api/ideas/stats${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch reflection stats');
  }

  return response.json();
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
