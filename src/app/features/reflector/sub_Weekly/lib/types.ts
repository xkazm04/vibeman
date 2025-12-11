/**
 * Weekly View Types
 * Types for weekly insights and analytics
 */

import { ScanType } from '@/app/features/Ideas/lib/scanTypes';

export interface DailyStats {
  date: string; // YYYY-MM-DD
  dayName: string; // Monday, Tuesday, etc.
  total: number;
  accepted: number;
  rejected: number;
  implemented: number;
  acceptanceRate: number;
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
  };
  dailyBreakdown: DailyStats[];
  specialists: WeeklySpecialistStats[];
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
}

export interface WeeklyFilters {
  projectId: string | null;
  contextId: string | null;
  weekOffset: number; // 0 = current week, -1 = last week, etc.
}

export interface ProjectImplementationStats {
  projectId: string;
  projectName: string;
  implementationCount: number;
  lastImplementation: string | null;
}

