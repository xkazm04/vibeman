import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { SuggestionFilter } from '@/app/features/reflector/lib/unifiedTypes';

export interface IdeaStats {
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  total: number;
  acceptanceRatio: number; // (accepted + implemented) / total * 100
}

// Direction stats (no implemented status)
export interface DirectionStats {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
  acceptanceRatio: number; // accepted / total * 100
}

// Context map stats (for directions, parallel to ScanTypeStats)
export interface ContextMapStats extends DirectionStats {
  contextMapId: string;
  contextMapTitle: string;
}

export interface ScanTypeStats extends IdeaStats {
  scanType: ScanType;
}

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
  label?: string;
}

export interface FilterState {
  projectId: string | null;
  contextId: string | null;
  dateRange?: DateRange;
}

export interface ComparisonFilterState extends FilterState {
  comparisonMode: boolean;
  period1?: DateRange;
  period2?: DateRange;
  timeWindow?: TimeWindow;
  suggestionType?: SuggestionFilter;
}

export interface ReflectionStats {
  scanTypes: ScanTypeStats[];
  overall: IdeaStats;
  projects: Array<{
    projectId: string;
    name: string;
    totalIdeas: number;
  }>;
  contexts: Array<{
    contextId: string;
    name: string;
    totalIdeas: number;
  }>;
  // Optional direction data (populated when suggestionType includes directions)
  contextMaps?: ContextMapStats[];
  directionsOverall?: DirectionStats;
  // Combined totals for 'both' mode
  combinedOverall?: {
    pending: number;
    accepted: number;
    rejected: number;
    implemented: number;
    total: number;
    acceptanceRatio: number;
    ideasTotal: number;
    directionsTotal: number;
  };
}

export interface ComparisonStats {
  period1: ReflectionStats;
  period2: ReflectionStats;
  period1Label: string;
  period2Label: string;
  differences: {
    scanTypes: Array<{
      scanType: ScanType;
      acceptanceRatioDiff: number;
      totalDiff: number;
    }>;
    overallAcceptanceDiff: number;
    totalIdeasDiff: number;
  };
}

// Time window options for aggregated stats
export type TimeWindow = 'all' | 'week' | 'month' | 'quarter' | 'year';

// Weekly snapshot for temporal analysis
export interface WeeklySnapshotResponse {
  weekStart: string;
  weekEnd: string;
  scanTypes: ScanTypeStats[];
  overall: IdeaStats;
  projectBreakdown: Record<string, number>;
  contextBreakdown: Record<string, number>;
}

// Aggregated stats response from server
export interface AggregatedStatsResponse extends ReflectionStats {
  weeklySnapshots?: WeeklySnapshotResponse[];
  meta: {
    lastUpdated: number;
    cacheKey: string;
    timeWindow: TimeWindow | 'custom';
  };
}
