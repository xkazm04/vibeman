/**
 * Signal Provider Types
 * Common types for all signal providers in the Observatory
 */

/**
 * Base signal result interface
 * All signal providers must return data conforming to this structure
 */
export interface SignalResult {
  providerId: string;
  timestamp: string;
  confidence: number; // 0-1, how confident the signal is
  weight: number; // Default weight for this signal type
  data: Record<string, unknown>;
}

/**
 * File-level signal data
 * Used for signals that provide per-file metrics
 */
export interface FileSignal {
  filePath: string;
  score: number; // Normalized 0-100
  metrics: Record<string, number>;
  flags: string[]; // Any warning flags
}

/**
 * Aggregated signal summary
 * Used for project-level summaries
 */
export interface SignalSummary {
  averageScore: number;
  worstScore: number;
  bestScore: number;
  distribution: {
    critical: number; // Files with score < 25
    warning: number; // Files with score 25-50
    acceptable: number; // Files with score 50-75
    good: number; // Files with score > 75
  };
}

/**
 * Signal provider interface
 * All signal providers must implement this interface
 */
export interface SignalProvider {
  id: string;
  name: string;
  description: string;
  weight: number; // Default weight (0-1) when aggregating signals

  /**
   * Check if the provider is available for a project
   */
  isAvailable(projectPath: string): Promise<boolean>;

  /**
   * Collect signals for a project
   */
  collect(projectPath: string, files?: string[]): Promise<SignalResult>;

  /**
   * Get signals for specific files
   */
  getFileSignals(projectPath: string, files: string[]): Promise<FileSignal[]>;
}

/**
 * Combined signal data from all providers
 */
export interface CombinedSignals {
  timestamp: string;
  projectPath: string;
  providers: SignalResult[];
  aggregated: {
    overallScore: number; // Weighted average of all signals
    healthTrend: 'improving' | 'stable' | 'degrading';
    topConcerns: Array<{
      file: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      source: string;
    }>;
  };
}

/**
 * Prediction signal - input to the prediction engine
 */
export interface PredictionInput {
  file: string;
  signals: {
    complexity?: number;
    churn?: number;
    testCoverage?: number;
    securityRisk?: number;
    historicalIssues?: number;
  };
  context: {
    recentChanges: number;
    lastModified: string;
    contributors: number;
  };
}
