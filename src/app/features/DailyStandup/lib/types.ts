/**
 * Daily Standup Feature Types
 * Types for the Daily Standup UI components
 */

import {
  StandupBlocker,
  StandupHighlight,
  StandupFocusArea,
  StandupSummaryResponse,
} from '@/app/db/models/standup.types';

export type { StandupBlocker, StandupHighlight, StandupFocusArea, StandupSummaryResponse };

export type PeriodType = 'daily' | 'weekly';

export interface StandupFilters {
  projectId: string | null;
  periodType: PeriodType;
  dateOffset: number; // 0 = today/this week, -1 = yesterday/last week, etc.
}

export interface StandupLoadingState {
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

export interface StandupDashboardStats {
  implementationsCount: number;
  ideasGenerated: number;
  ideasAccepted: number;
  ideasImplemented: number;
  scansCount: number;
  acceptanceRate: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
  burnoutRisk: 'low' | 'medium' | 'high' | null;
}

export interface StandupHistoryItem {
  id: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  title: string;
  implementationsCount: number;
  ideasGenerated: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
}

export interface DateRangeInfo {
  start: Date;
  end: Date;
  label: string;
  isToday: boolean;
  isCurrentWeek: boolean;
}

/**
 * Get date range info for a period
 */
export function getDateRangeInfo(
  periodType: PeriodType,
  dateOffset: number
): DateRangeInfo {
  const today = new Date();

  if (periodType === 'daily') {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dateOffset);

    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const isToday = dateOffset === 0;

    let label: string;
    if (isToday) {
      label = 'Today';
    } else if (dateOffset === -1) {
      label = 'Yesterday';
    } else {
      label = targetDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }

    return { start, end, label, isToday, isCurrentWeek: false };
  }

  // Weekly
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - daysFromMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const targetWeekStart = new Date(currentWeekStart);
  targetWeekStart.setDate(currentWeekStart.getDate() + dateOffset * 7);

  const targetWeekEnd = new Date(targetWeekStart);
  targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
  targetWeekEnd.setHours(23, 59, 59, 999);

  const isCurrentWeek = dateOffset === 0;

  let label: string;
  if (isCurrentWeek) {
    label = 'This Week';
  } else if (dateOffset === -1) {
    label = 'Last Week';
  } else {
    label = `Week of ${targetWeekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
  }

  return { start: targetWeekStart, end: targetWeekEnd, label, isToday: false, isCurrentWeek };
}
