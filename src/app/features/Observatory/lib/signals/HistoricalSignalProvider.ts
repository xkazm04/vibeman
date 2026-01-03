/**
 * Historical Signal Provider
 * Uses past execution outcomes and prediction results to identify patterns
 */

import { observatoryDb } from '@/app/db';
import type { SignalProvider, SignalResult, FileSignal } from './types';

// Weights for different historical factors
const WEIGHTS = {
  executionFailures: 0.4, // How often executions targeting this file failed
  regressions: 0.3, // How often changes to this file caused regressions
  predictionAccuracy: 0.3, // How accurate predictions about this file have been
};

interface FileHistory {
  file: string;
  executionCount: number;
  failureCount: number;
  regressionCount: number;
  predictionsTotal: number;
  predictionsAccurate: number;
}

/**
 * Analyze historical data for files
 */
function analyzeFileHistory(projectId: string, files: string[]): Map<string, FileHistory> {
  const result = new Map<string, FileHistory>();

  // Initialize all files
  for (const file of files) {
    result.set(file, {
      file,
      executionCount: 0,
      failureCount: 0,
      regressionCount: 0,
      predictionsTotal: 0,
      predictionsAccurate: 0,
    });
  }

  // Get recent execution outcomes
  const executions = observatoryDb.getRecentExecutionOutcomes(projectId, 100);

  for (const exec of executions) {
    // Parse target files
    let targetFiles: string[] = [];
    try {
      if (exec.target_files) {
        targetFiles = JSON.parse(exec.target_files);
      }
    } catch {
      continue;
    }

    // Update file stats
    for (const file of targetFiles) {
      if (!result.has(file)) continue;
      const history = result.get(file)!;

      history.executionCount++;

      if (exec.success === 0) {
        history.failureCount++;
      }

      if (exec.regression_detected === 1) {
        history.regressionCount++;
      }
    }
  }

  return result;
}

/**
 * Calculate historical score for a file
 */
function calculateHistoricalScore(history: FileHistory): number {
  if (history.executionCount === 0) {
    return 100; // No history, assume good
  }

  let score = 100;

  // Failure rate penalty
  const failureRate = history.failureCount / history.executionCount;
  score -= failureRate * 50 * WEIGHTS.executionFailures;

  // Regression rate penalty
  const regressionRate = history.regressionCount / history.executionCount;
  score -= regressionRate * 100 * WEIGHTS.regressions;

  // Prediction accuracy bonus (if we have predictions)
  if (history.predictionsTotal > 0) {
    const accuracy = history.predictionsAccurate / history.predictionsTotal;
    // Poor accuracy suggests unpredictable behavior
    score -= (1 - accuracy) * 30 * WEIGHTS.predictionAccuracy;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Historical Signal Provider
 */
export const HistoricalSignalProvider: SignalProvider = {
  id: 'historical',
  name: 'Historical Patterns',
  description: 'Analyzes past execution outcomes and predictions to identify problem areas',
  weight: 0.25, // 25% weight in overall calculation

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true; // Always available (uses internal database)
  },

  async collect(projectPath: string, files?: string[]): Promise<SignalResult> {
    // Extract project ID from path (last directory)
    const projectId = projectPath.split(/[/\\]/).pop() || projectPath;

    const targetFiles = files || [];
    const fileSignals = await this.getFileSignals(projectPath, targetFiles);

    // Get overall execution success rate
    const successRate = observatoryDb.getExecutionSuccessRate(projectId, 30);

    // Get learning progress
    const learningProgress = observatoryDb.getLearningProgress(projectId);

    // Calculate aggregates
    const scores = fileSignals.map((f) => f.score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;

    // Find problematic files
    const problematic = [...fileSignals]
      .filter((f) => f.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    return {
      providerId: this.id,
      timestamp: new Date().toISOString(),
      confidence: successRate.total > 10 ? 0.85 : 0.3, // Higher confidence with more data
      weight: this.weight,
      data: {
        averageScore: avgScore,
        filesAnalyzed: fileSignals.length,
        problematicFiles: problematic.map((f) => ({
          file: f.filePath,
          score: f.score,
          metrics: f.metrics,
          flags: f.flags,
        })),
        executionStats: {
          totalExecutions: successRate.total,
          successRate: successRate.rate,
          recentDays: 30,
        },
        learningProgress: {
          totalPatterns: learningProgress.totalPatterns,
          activePatterns: learningProgress.activePatterns,
          avgPrecision: learningProgress.avgPrecision,
        },
      },
    };
  },

  async getFileSignals(projectPath: string, files: string[]): Promise<FileSignal[]> {
    const projectId = projectPath.split(/[/\\]/).pop() || projectPath;
    const history = analyzeFileHistory(projectId, files);

    return files.map((file) => {
      const fileHistory = history.get(file);

      if (!fileHistory || fileHistory.executionCount === 0) {
        return {
          filePath: file,
          score: 100, // No history
          metrics: {
            executionCount: 0,
            failureRate: 0,
            regressionRate: 0,
          },
          flags: [],
        };
      }

      const score = calculateHistoricalScore(fileHistory);
      const failureRate = fileHistory.failureCount / fileHistory.executionCount;
      const regressionRate = fileHistory.regressionCount / fileHistory.executionCount;

      const flags: string[] = [];
      if (failureRate > 0.3) flags.push('frequent-failures');
      if (regressionRate > 0.1) flags.push('regression-prone');
      if (fileHistory.executionCount > 10 && score < 50) flags.push('historically-problematic');

      return {
        filePath: file,
        score,
        metrics: {
          executionCount: fileHistory.executionCount,
          failureRate: Math.round(failureRate * 100) / 100,
          regressionRate: Math.round(regressionRate * 100) / 100,
        },
        flags,
      };
    });
  },
};

export default HistoricalSignalProvider;
