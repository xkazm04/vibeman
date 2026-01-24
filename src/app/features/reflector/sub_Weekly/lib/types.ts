/**
 * Weekly View Types
 * Types for weekly insights and analytics
 */

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { SuggestionFilter } from '../../lib/unifiedTypes';

export interface DailyStats {
  date: string; // YYYY-MM-DD
  dayName: string; // Monday, Tuesday, etc.
  total: number;
  accepted: number;
  rejected: number;
  implemented: number;
  acceptanceRate: number;
  // Direction-specific (optional for backward compatibility)
  ideasTotal?: number;
  directionsTotal?: number;
}

export interface WeeklySpecialistStats {
  scanType: ScanType;
  total: number;
  accepted: number;
  rejected: number;
  implemented: number;
  acceptanceRate: number;
  trend: 'up' | 'down' | 'stable';
  changeFromLastWeek: number;
}

/**
 * Direction context map stats (parallel to WeeklySpecialistStats)
 */
export interface WeeklyContextMapStats {
  contextMapId: string;
  contextMapTitle: string;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  acceptanceRate: number;
  trend: 'up' | 'down' | 'stable';
  changeFromLastWeek: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  overall: {
    total: number;
    accepted: number;
    rejected: number;
    implemented: number;
    pending: number;
    acceptanceRate: number;
    // Breakdown by type
    ideasTotal?: number;
    directionsTotal?: number;
  };
  dailyBreakdown: DailyStats[];
  specialists: WeeklySpecialistStats[];
  // Direction context map breakdown (parallel to specialists)
  contextMaps?: WeeklyContextMapStats[];
  comparison: {
    lastWeekTotal: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
  topPerformers: Array<{
    scanType: ScanType;
    acceptanceRate: number;
  }>;
  needsAttention: Array<{
    scanType: ScanType;
    reason: string;
    acceptanceRate: number;
  }>;
  // Direction equivalents
  topContextMaps?: Array<{
    contextMapTitle: string;
    acceptanceRate: number;
  }>;
}

export interface WeeklyFilters {
  projectId: string | null;
  contextId: string | null;
  weekOffset: number; // 0 = current week, -1 = last week, etc.
  suggestionType: SuggestionFilter; // 'ideas' | 'directions' | 'both'
}

export interface ProjectImplementationStats {
  projectId: string;
  projectName: string;
  implementationCount: number;
  lastImplementation: string | null;
}

