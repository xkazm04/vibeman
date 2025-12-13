/**
 * Standup API Client
 * Client-side API functions for standup operations
 */

import {
  StandupSummaryResponse,
  StandupHistoryItem,
  PeriodType,
  getDateRangeInfo,
} from './types';

/**
 * Fetch standup summary for a specific period
 */
export async function fetchStandupSummary(
  projectId: string,
  periodType: PeriodType,
  dateOffset: number = 0
): Promise<StandupSummaryResponse | null> {
  const { start } = getDateRangeInfo(periodType, dateOffset);
  const periodStart = start.toISOString().split('T')[0];

  const params = new URLSearchParams({
    projectId,
    periodType,
    periodStart,
  });

  try {
    const response = await fetch(`/api/standup?${params.toString()}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch standup: ${response.statusText}`);
    }

    const data = await response.json();
    return data.summary || null;
  } catch (error) {
    console.error('[StandupAPI] Error fetching summary:', error);
    throw error;
  }
}

/**
 * Generate a new standup summary
 */
export async function generateStandupSummary(
  projectId: string,
  periodType: PeriodType,
  dateOffset: number = 0,
  forceRegenerate: boolean = false
): Promise<StandupSummaryResponse> {
  const { start } = getDateRangeInfo(periodType, dateOffset);
  const periodStart = start.toISOString().split('T')[0];

  try {
    const response = await fetch('/api/standup/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        periodType,
        periodStart,
        forceRegenerate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to generate standup: ${response.statusText}`);
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('[StandupAPI] Error generating summary:', error);
    throw error;
  }
}

/**
 * Fetch standup history for a project
 */
export async function fetchStandupHistory(
  projectId: string,
  periodType?: PeriodType,
  limit: number = 14
): Promise<StandupHistoryItem[]> {
  const params = new URLSearchParams({
    projectId,
    limit: limit.toString(),
  });

  if (periodType) {
    params.set('periodType', periodType);
  }

  try {
    const response = await fetch(`/api/standup/history?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('[StandupAPI] Error fetching history:', error);
    throw error;
  }
}

/**
 * Delete a standup summary
 */
export async function deleteStandupSummary(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/standup/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete standup: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[StandupAPI] Error deleting summary:', error);
    throw error;
  }
}
