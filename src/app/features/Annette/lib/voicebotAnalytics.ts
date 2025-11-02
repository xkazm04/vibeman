/**
 * Voicebot Analytics Types and Interfaces
 * Tracks command usage, execution time, and success/failure metrics
 */

export interface CommandAnalyticsEntry {
  id: string;
  projectId: string;
  commandName: string;
  commandType: 'button_command' | 'voice_command' | 'text_command';
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
  timing?: {
    sttMs?: number;
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  };
  metadata?: {
    provider?: string;
    model?: string;
    toolsUsed?: string[];
  };
  timestamp: string;
}

export interface AnalyticsSummary {
  totalCommands: number;
  successRate: number;
  averageExecutionMs: number;
  mostFrequentCommands: Array<{
    commandName: string;
    count: number;
    averageMs: number;
  }>;
  recentFailures: Array<{
    commandName: string;
    errorMessage: string;
    timestamp: string;
  }>;
  performanceMetrics: {
    avgSttMs: number;
    avgLlmMs: number;
    avgTtsMs: number;
    avgTotalMs: number;
  };
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilter {
  projectId?: string;
  commandName?: string;
  commandType?: 'button_command' | 'voice_command' | 'text_command';
  success?: boolean;
  timeRange?: AnalyticsTimeRange;
}
