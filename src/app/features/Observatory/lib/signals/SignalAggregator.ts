/**
 * Signal Aggregator
 * Combines signals from all providers into unified metrics
 */

import type { SignalProvider, SignalResult, FileSignal, CombinedSignals, PredictionInput } from './types';
import { ComplexitySignalProvider } from './ComplexitySignalProvider';
import { ChurnSignalProvider } from './ChurnSignalProvider';
import { HistoricalSignalProvider } from './HistoricalSignalProvider';

// Default providers
const defaultProviders: SignalProvider[] = [
  ComplexitySignalProvider,
  ChurnSignalProvider,
  HistoricalSignalProvider,
];

/**
 * Collect signals from all available providers
 */
export async function collectAllSignals(
  projectPath: string,
  files?: string[],
  providers: SignalProvider[] = defaultProviders
): Promise<CombinedSignals> {
  const results: SignalResult[] = [];
  const allFileSignals = new Map<string, Map<string, FileSignal>>();

  // Collect from each provider
  for (const provider of providers) {
    try {
      const isAvailable = await provider.isAvailable(projectPath);
      if (!isAvailable) {
        console.log(`[SignalAggregator] Provider ${provider.id} not available, skipping`);
        continue;
      }

      const result = await provider.collect(projectPath, files);
      results.push(result);

      // Also get per-file signals
      if (files) {
        const fileSignals = await provider.getFileSignals(projectPath, files);
        for (const signal of fileSignals) {
          if (!allFileSignals.has(signal.filePath)) {
            allFileSignals.set(signal.filePath, new Map());
          }
          allFileSignals.get(signal.filePath)!.set(provider.id, signal);
        }
      }
    } catch (error) {
      console.error(`[SignalAggregator] Provider ${provider.id} failed:`, error);
      // Continue with other providers
    }
  }

  // Calculate weighted overall score
  let weightedSum = 0;
  let totalWeight = 0;

  for (const result of results) {
    const score = (result.data as Record<string, unknown>).averageScore as number || 100;
    const adjustedWeight = result.weight * result.confidence;
    weightedSum += score * adjustedWeight;
    totalWeight += adjustedWeight;
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 100;

  // Identify top concerns
  const topConcerns: CombinedSignals['aggregated']['topConcerns'] = [];

  for (const [file, signals] of allFileSignals.entries()) {
    for (const [providerId, signal] of signals.entries()) {
      if (signal.score < 50) {
        const severity = signal.score < 25 ? 'critical' : signal.score < 40 ? 'high' : 'medium';

        for (const flag of signal.flags) {
          topConcerns.push({
            file,
            issue: flag,
            severity,
            source: providerId,
          });
        }
      }
    }
  }

  // Sort by severity and limit
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  topConcerns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  topConcerns.splice(20); // Keep top 20 concerns

  // Determine health trend from historical data
  let healthTrend: 'improving' | 'stable' | 'degrading' = 'stable';
  const historicalResult = results.find((r) => r.providerId === 'historical');
  if (historicalResult) {
    const execStats = (historicalResult.data as Record<string, unknown>).executionStats as { successRate: number } | undefined;
    if (execStats) {
      if (execStats.successRate > 0.8) {
        healthTrend = 'improving';
      } else if (execStats.successRate < 0.5) {
        healthTrend = 'degrading';
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    projectPath,
    providers: results,
    aggregated: {
      overallScore,
      healthTrend,
      topConcerns,
    },
  };
}

/**
 * Generate prediction inputs for files
 * Combines signals into a format suitable for the prediction engine
 */
export async function generatePredictionInputs(
  projectPath: string,
  files: string[],
  providers: SignalProvider[] = defaultProviders
): Promise<PredictionInput[]> {
  const allFileSignals = new Map<string, Map<string, FileSignal>>();

  // Collect file signals from each provider
  for (const provider of providers) {
    try {
      const isAvailable = await provider.isAvailable(projectPath);
      if (!isAvailable) continue;

      const fileSignals = await provider.getFileSignals(projectPath, files);
      for (const signal of fileSignals) {
        if (!allFileSignals.has(signal.filePath)) {
          allFileSignals.set(signal.filePath, new Map());
        }
        allFileSignals.get(signal.filePath)!.set(provider.id, signal);
      }
    } catch (error) {
      console.error(`[SignalAggregator] Provider ${provider.id} failed:`, error);
    }
  }

  // Generate prediction inputs
  const inputs: PredictionInput[] = [];

  for (const [file, signals] of allFileSignals.entries()) {
    const complexitySignal = signals.get('complexity');
    const churnSignal = signals.get('churn');
    const historicalSignal = signals.get('historical');

    inputs.push({
      file,
      signals: {
        complexity: complexitySignal?.score,
        churn: churnSignal?.score,
        historicalIssues: historicalSignal ? 100 - historicalSignal.score : undefined,
      },
      context: {
        recentChanges: (churnSignal?.metrics?.commits as number) || 0,
        lastModified: new Date().toISOString(), // Would need file stat
        contributors: (churnSignal?.metrics?.contributors as number) || 1,
      },
    });
  }

  return inputs;
}

/**
 * Get a quick health check for a project
 * Faster than full signal collection
 */
export async function getQuickHealthCheck(projectPath: string): Promise<{
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  topIssue?: string;
}> {
  try {
    // Use complexity provider for quick check
    const complexityResult = await ComplexitySignalProvider.collect(projectPath);
    const score = (complexityResult.data as Record<string, unknown>).averageScore as number || 100;

    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 70) {
      status = 'healthy';
    } else if (score >= 40) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    const mostComplex = (complexityResult.data as Record<string, unknown>).mostComplex as Array<{ file: string; flags: string[] }> | undefined;
    const topIssue = mostComplex?.[0]?.flags?.[0];

    return { score, status, topIssue };
  } catch {
    return { score: 100, status: 'healthy' };
  }
}

// Export individual providers for direct use
export { ComplexitySignalProvider, ChurnSignalProvider, HistoricalSignalProvider };

// Export types
export type { SignalProvider, SignalResult, FileSignal, CombinedSignals, PredictionInput };
