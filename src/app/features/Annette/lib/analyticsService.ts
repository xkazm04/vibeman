/**
 * Voicebot Analytics Service
 * Lightweight service for logging command usage, error telemetry, and retrieving metrics
 */

import { CommandAnalyticsEntry, AnalyticsFilter, AnalyticsSummary } from './voicebotAnalytics';
import { AnnetteErrorCode } from './annetteErrors';

/**
 * Error telemetry entry for tracking service failures
 */
export interface ErrorTelemetryEntry {
  projectId: string;
  errorCode: AnnetteErrorCode;
  errorMessage: string;
  severity: 'warning' | 'error' | 'critical';
  recoverable: boolean;
  context?: string;
  stack?: string | null;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error pattern for analytics
 */
export interface ErrorPattern {
  errorCode: AnnetteErrorCode;
  count: number;
  firstSeen: string;
  lastSeen: string;
  contexts: string[];
}

/**
 * Error analytics summary
 */
export interface ErrorAnalyticsSummary {
  totalErrors: number;
  errorsByCode: Record<AnnetteErrorCode, number>;
  errorsBySeverity: Record<string, number>;
  recoverableCount: number;
  criticalCount: number;
  recentErrors: Array<{
    errorCode: AnnetteErrorCode;
    errorMessage: string;
    timestamp: string;
    context?: string;
  }>;
  errorPatterns: ErrorPattern[];
}

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
    // Analytics logging failed - non-blocking, silently continue
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
    // Analytics fetch failed - return empty summary
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

// ============================================================================
// Error Telemetry Functions
// ============================================================================

/**
 * In-memory error log for pattern detection (last 100 errors)
 */
const errorLog: Array<ErrorTelemetryEntry & { timestamp: string }> = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Log an error to telemetry for tracking failure patterns
 * Non-blocking - failures are silently ignored
 */
export async function logErrorTelemetry(entry: ErrorTelemetryEntry): Promise<void> {
  try {
    // Add to in-memory log for pattern detection
    const timestampedEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    errorLog.push(timestampedEntry);

    // Keep log size bounded
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
      errorLog.shift();
    }

    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Annette Telemetry] Error logged:', entry.errorCode, entry.context);
    }

    // Send to analytics API (fire and forget)
    fetch('/api/annette/analytics/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timestampedEntry),
    }).catch(() => {
      // Silently ignore - telemetry should never block user actions
    });
  } catch {
    // Telemetry logging failed - non-blocking, silently continue
  }
}

/**
 * Get error analytics summary from in-memory log
 * Useful for displaying error patterns in UI
 */
export function getErrorAnalyticsSummary(projectId?: string): ErrorAnalyticsSummary {
  const filtered = projectId
    ? errorLog.filter(e => e.projectId === projectId)
    : errorLog;

  // Count by error code
  const errorsByCode: Partial<Record<AnnetteErrorCode, number>> = {};
  for (const entry of filtered) {
    errorsByCode[entry.errorCode] = (errorsByCode[entry.errorCode] || 0) + 1;
  }

  // Count by severity
  const errorsBySeverity: Record<string, number> = {
    warning: 0,
    error: 0,
    critical: 0,
  };
  for (const entry of filtered) {
    errorsBySeverity[entry.severity]++;
  }

  // Count recoverable/critical
  const recoverableCount = filtered.filter(e => e.recoverable).length;
  const criticalCount = filtered.filter(e => e.severity === 'critical').length;

  // Get recent errors (last 10)
  const recentErrors = filtered.slice(-10).reverse().map(e => ({
    errorCode: e.errorCode,
    errorMessage: e.errorMessage,
    timestamp: e.timestamp,
    context: e.context,
  }));

  // Detect error patterns (errors occurring multiple times)
  const patternMap = new Map<AnnetteErrorCode, {
    count: number;
    firstSeen: string;
    lastSeen: string;
    contexts: Set<string>;
  }>();

  for (const entry of filtered) {
    const existing = patternMap.get(entry.errorCode);
    if (existing) {
      existing.count++;
      existing.lastSeen = entry.timestamp;
      if (entry.context) {
        existing.contexts.add(entry.context);
      }
    } else {
      patternMap.set(entry.errorCode, {
        count: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp,
        contexts: new Set(entry.context ? [entry.context] : []),
      });
    }
  }

  const errorPatterns: ErrorPattern[] = Array.from(patternMap.entries())
    .filter(([, data]) => data.count > 1)
    .map(([code, data]) => ({
      errorCode: code,
      count: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      contexts: Array.from(data.contexts),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalErrors: filtered.length,
    errorsByCode: errorsByCode as Record<AnnetteErrorCode, number>,
    errorsBySeverity,
    recoverableCount,
    criticalCount,
    recentErrors,
    errorPatterns,
  };
}

/**
 * Clear the in-memory error log
 * Useful for testing or after resolving known issues
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Check if there are critical errors in recent history
 */
export function hasCriticalErrors(projectId?: string): boolean {
  const summary = getErrorAnalyticsSummary(projectId);
  return summary.criticalCount > 0;
}

/**
 * Get the most frequent error code
 */
export function getMostFrequentError(projectId?: string): AnnetteErrorCode | null {
  const summary = getErrorAnalyticsSummary(projectId);

  let maxCount = 0;
  let mostFrequent: AnnetteErrorCode | null = null;

  for (const [code, count] of Object.entries(summary.errorsByCode)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = code as AnnetteErrorCode;
    }
  }

  return mostFrequent;
}
