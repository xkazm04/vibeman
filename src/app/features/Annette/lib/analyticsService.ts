/**
 * Voicebot Analytics Service
 * Lightweight service for logging command usage and retrieving metrics
 */

import { CommandAnalyticsEntry, AnalyticsFilter, AnalyticsSummary } from './voicebotAnalytics';

/**
 * Log a command execution to the analytics store
 */
export async function logCommandExecution(
  entry: Omit<CommandAnalyticsEntry, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const response = await fetch('/api/annette/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      throw new Error('Failed to log command execution');
    }
  } catch (error) {
    console.error('[Analytics] Failed to log command execution:', error);
    // Don't throw - analytics should be non-blocking
  }
}

/**
 * Get analytics summary for a project
 */
export async function getAnalyticsSummary(
  projectId: string,
  filter?: Omit<AnalyticsFilter, 'projectId'>
): Promise<AnalyticsSummary> {
  try {
    const params = new URLSearchParams({ projectId });

    if (filter?.commandName) {
      params.append('commandName', filter.commandName);
    }
    if (filter?.commandType) {
      params.append('commandType', filter.commandType);
    }
    if (filter?.success !== undefined) {
      params.append('success', String(filter.success));
    }
    if (filter?.timeRange?.start) {
      params.append('startDate', filter.timeRange.start.toISOString());
    }
    if (filter?.timeRange?.end) {
      params.append('endDate', filter.timeRange.end.toISOString());
    }

    const response = await fetch(`/api/annette/analytics?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch analytics summary');
    }

    return await response.json();
  } catch (error) {
    console.error('[Analytics] Failed to fetch analytics summary:', error);
    // Return empty summary on error
    return {
      totalCommands: 0,
      successRate: 0,
      averageExecutionMs: 0,
      mostFrequentCommands: [],
      recentFailures: [],
      performanceMetrics: {
        avgSttMs: 0,
        avgLlmMs: 0,
        avgTtsMs: 0,
        avgTotalMs: 0,
      },
    };
  }
}

/**
 * Wrapper for voicebot API calls with analytics logging
 */
export async function withAnalytics<T>(
  projectId: string,
  commandName: string,
  commandType: 'button_command' | 'voice_command' | 'text_command',
  fn: () => Promise<T>,
  metadata?: {
    provider?: string;
    model?: string;
    toolsUsed?: string[];
  }
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;
  let result: T;

  try {
    result = await fn();
    success = true;
    return result;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    const executionTimeMs = Date.now() - startTime;

    // Log the command execution
    await logCommandExecution({
      projectId,
      commandName,
      commandType,
      executionTimeMs,
      success,
      errorMessage,
      metadata,
    });
  }
}

/**
 * Wrapper for TTS playback with analytics
 */
export async function withTTSAnalytics(
  projectId: string,
  commandName: string,
  ttsFunction: () => Promise<string>,
  playbackFunction: (audioUrl: string) => Promise<void>
): Promise<string> {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    const audioUrl = await ttsFunction();
    await playbackFunction(audioUrl);
    success = true;
    return audioUrl;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : 'TTS playback failed';
    throw error;
  } finally {
    const ttsMs = Date.now() - startTime;

    // Log TTS execution
    await logCommandExecution({
      projectId,
      commandName: `${commandName}_tts`,
      commandType: 'text_command',
      executionTimeMs: ttsMs,
      success,
      errorMessage,
      timing: {
        ttsMs,
        totalMs: ttsMs,
      },
    });
  }
}
