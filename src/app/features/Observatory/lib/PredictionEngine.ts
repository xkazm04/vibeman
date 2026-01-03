/**
 * Prediction Engine
 * Generates predictions about potential issues based on combined signals
 */

import { observatoryDb, debtPredictionDb } from '@/app/db';
import type { DbDebtPrediction } from '@/app/db/models/debt-prediction.types';
import type { DbLearnedPattern } from '@/app/db/models/observatory.types';
import { generatePredictionInputs, type PredictionInput, type CombinedSignals } from './signals';

// Prediction configuration
export interface PredictionConfig {
  confidenceThreshold: number; // Minimum confidence to create prediction (0-1)
  urgencyBoostForHighComplexity: number; // Additional urgency for complex files
  urgencyBoostForHighChurn: number; // Additional urgency for frequently changed files
  maxPredictionsPerFile: number; // Limit predictions per file
}

const DEFAULT_CONFIG: PredictionConfig = {
  confidenceThreshold: 0.3,
  urgencyBoostForHighComplexity: 0.2,
  urgencyBoostForHighChurn: 0.15,
  maxPredictionsPerFile: 3,
};

// Prediction types
export interface Prediction {
  file: string;
  type: 'emerging' | 'accelerating' | 'imminent' | 'exists';
  title: string;
  description: string;
  confidence: number;
  urgency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
  microRefactoring?: string;
  effort: 'trivial' | 'small' | 'medium' | 'large';
  signals: PredictionInput['signals'];
  patternId?: string;
}

export interface PredictionResult {
  predictions: Prediction[];
  summary: {
    totalFiles: number;
    filesWithPredictions: number;
    byType: Record<Prediction['type'], number>;
    bySeverity: Record<Prediction['severity'], number>;
    averageConfidence: number;
  };
}

/**
 * Calculate severity from signals
 */
function calculateSeverity(signals: PredictionInput['signals']): Prediction['severity'] {
  const scores = [
    signals.complexity,
    signals.churn,
    signals.testCoverage,
    signals.securityRisk,
    signals.historicalIssues,
  ].filter((s) => s !== undefined) as number[];

  if (scores.length === 0) return 'low';

  // Lower score = worse
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avgScore < 30) return 'critical';
  if (avgScore < 50) return 'high';
  if (avgScore < 70) return 'medium';
  return 'low';
}

/**
 * Calculate prediction type based on signals and trends
 */
function calculatePredictionType(
  signals: PredictionInput['signals'],
  context: PredictionInput['context']
): Prediction['type'] {
  const hasHighChurn = signals.churn !== undefined && signals.churn < 50;
  const hasHistoricalIssues = signals.historicalIssues !== undefined && signals.historicalIssues > 30;
  const hasComplexity = signals.complexity !== undefined && signals.complexity < 50;

  if (hasHistoricalIssues && hasComplexity) return 'exists';
  if (hasHighChurn && hasComplexity) return 'imminent';
  if (hasHighChurn || context.recentChanges > 5) return 'accelerating';
  return 'emerging';
}

/**
 * Calculate confidence based on signal availability and strength
 */
function calculateConfidence(signals: PredictionInput['signals']): number {
  const signalValues = Object.values(signals).filter((s) => s !== undefined);
  const signalCount = signalValues.length;

  if (signalCount === 0) return 0;

  // Base confidence from having signals
  let confidence = 0.3 + signalCount * 0.1;

  // Boost confidence if signals agree (all low or all high)
  const avgSignal = signalValues.reduce((a, b) => a + (b || 0), 0) / signalCount;
  const variance = signalValues.reduce((acc, val) => acc + Math.pow((val || 0) - avgSignal, 2), 0) / signalCount;

  if (variance < 100) {
    confidence += 0.2; // Signals agree
  }

  return Math.min(1, confidence);
}

/**
 * Calculate urgency based on signals and type
 */
function calculateUrgency(
  signals: PredictionInput['signals'],
  type: Prediction['type'],
  config: PredictionConfig
): number {
  let urgency = 0.3; // Base urgency

  // Type-based urgency
  const typeUrgency: Record<Prediction['type'], number> = {
    emerging: 0,
    accelerating: 0.2,
    imminent: 0.4,
    exists: 0.5,
  };
  urgency += typeUrgency[type];

  // Signal-based urgency boosts
  if (signals.complexity !== undefined && signals.complexity < 40) {
    urgency += config.urgencyBoostForHighComplexity;
  }

  if (signals.churn !== undefined && signals.churn < 40) {
    urgency += config.urgencyBoostForHighChurn;
  }

  return Math.min(1, urgency);
}

/**
 * Generate suggested action based on signals
 */
function generateSuggestedAction(signals: PredictionInput['signals'], severity: Prediction['severity']): string {
  const suggestions: string[] = [];

  if (signals.complexity !== undefined && signals.complexity < 50) {
    suggestions.push('Consider breaking down into smaller modules');
  }

  if (signals.churn !== undefined && signals.churn < 50) {
    suggestions.push('Review recent changes for potential issues');
  }

  if (signals.historicalIssues !== undefined && signals.historicalIssues > 30) {
    suggestions.push('Add more tests to prevent regressions');
  }

  if (signals.testCoverage !== undefined && signals.testCoverage < 50) {
    suggestions.push('Increase test coverage');
  }

  if (suggestions.length === 0) {
    if (severity === 'critical') return 'Immediate refactoring recommended';
    if (severity === 'high') return 'Schedule refactoring soon';
    if (severity === 'medium') return 'Add to technical debt backlog';
    return 'Monitor for changes';
  }

  return suggestions[0];
}

/**
 * Generate micro-refactoring suggestion if applicable
 */
function generateMicroRefactoring(
  file: string,
  signals: PredictionInput['signals']
): string | undefined {
  if (signals.complexity !== undefined && signals.complexity < 40) {
    return `Extract helper functions from ${file} to reduce complexity`;
  }

  if (signals.churn !== undefined && signals.churn < 30) {
    return `Add integration tests for ${file} to catch issues early`;
  }

  return undefined;
}

/**
 * Estimate effort based on severity and signals
 */
function estimateEffort(severity: Prediction['severity'], signals: PredictionInput['signals']): Prediction['effort'] {
  if (severity === 'low') return 'trivial';
  if (severity === 'medium') return 'small';

  // Check if it's just one signal causing issues
  const badSignals = Object.values(signals).filter((s) => s !== undefined && s < 50);
  if (badSignals.length <= 1) return 'small';
  if (badSignals.length === 2) return 'medium';

  return 'large';
}

/**
 * Match signals against learned patterns
 */
function matchPatterns(
  signals: PredictionInput['signals'],
  patterns: DbLearnedPattern[]
): DbLearnedPattern | undefined {
  // Find patterns that match the signal profile
  for (const pattern of patterns) {
    if (pattern.status !== 'active') continue;

    try {
      const rules = JSON.parse(pattern.detection_rules) as Record<string, unknown>;

      // Check if this pattern matches our signals
      let matches = true;

      if (rules.minComplexity && signals.complexity !== undefined) {
        if (signals.complexity > (rules.minComplexity as number)) matches = false;
      }

      if (rules.minChurn && signals.churn !== undefined) {
        if (signals.churn > (rules.minChurn as number)) matches = false;
      }

      if (matches && pattern.confidence_score && pattern.confidence_score > 0.5) {
        return pattern;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Generate predictions for a project
 */
export async function generatePredictions(
  projectPath: string,
  projectId: string,
  files: string[],
  config: PredictionConfig = DEFAULT_CONFIG
): Promise<PredictionResult> {
  // Get prediction inputs from signals
  const inputs = await generatePredictionInputs(projectPath, files);

  // Get learned patterns for matching
  const patterns = observatoryDb.getLearnedPatterns(projectId, { status: 'active' });

  const predictions: Prediction[] = [];
  let filesWithPredictions = 0;

  for (const input of inputs) {
    // Calculate metrics
    const severity = calculateSeverity(input.signals);
    const type = calculatePredictionType(input.signals, input.context);
    const confidence = calculateConfidence(input.signals);
    const urgency = calculateUrgency(input.signals, type, config);

    // Skip if below confidence threshold
    if (confidence < config.confidenceThreshold) continue;

    // Only create predictions for concerning files
    if (severity === 'low' && type === 'emerging') continue;

    // Match against patterns
    const matchedPattern = matchPatterns(input.signals, patterns);

    // Generate prediction
    const prediction: Prediction = {
      file: input.file,
      type,
      title: generatePredictionTitle(input.file, severity, type),
      description: generatePredictionDescription(input.signals, type),
      confidence,
      urgency,
      severity,
      suggestedAction: generateSuggestedAction(input.signals, severity),
      microRefactoring: generateMicroRefactoring(input.file, input.signals),
      effort: estimateEffort(severity, input.signals),
      signals: input.signals,
      patternId: matchedPattern?.id,
    };

    predictions.push(prediction);

    // Check if we've hit the per-file limit
    const filePredictions = predictions.filter((p) => p.file === input.file);
    if (filePredictions.length === 1) {
      filesWithPredictions++;
    }
  }

  // Sort by urgency and severity
  predictions.sort((a, b) => {
    if (a.urgency !== b.urgency) return b.urgency - a.urgency;
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Generate summary
  const summary = {
    totalFiles: files.length,
    filesWithPredictions,
    byType: {
      emerging: predictions.filter((p) => p.type === 'emerging').length,
      accelerating: predictions.filter((p) => p.type === 'accelerating').length,
      imminent: predictions.filter((p) => p.type === 'imminent').length,
      exists: predictions.filter((p) => p.type === 'exists').length,
    },
    bySeverity: {
      critical: predictions.filter((p) => p.severity === 'critical').length,
      high: predictions.filter((p) => p.severity === 'high').length,
      medium: predictions.filter((p) => p.severity === 'medium').length,
      low: predictions.filter((p) => p.severity === 'low').length,
    },
    averageConfidence:
      predictions.length > 0
        ? predictions.reduce((acc, p) => acc + p.confidence, 0) / predictions.length
        : 0,
  };

  return { predictions, summary };
}

/**
 * Generate prediction title
 */
function generatePredictionTitle(file: string, severity: Prediction['severity'], type: Prediction['type']): string {
  const fileName = file.split('/').pop() || file;

  const typeLabels: Record<Prediction['type'], string> = {
    emerging: 'Potential issue developing',
    accelerating: 'Growing concern',
    imminent: 'Issue likely soon',
    exists: 'Active issue detected',
  };

  return `${typeLabels[type]} in ${fileName}`;
}

/**
 * Generate prediction description
 */
function generatePredictionDescription(signals: PredictionInput['signals'], type: Prediction['type']): string {
  const issues: string[] = [];

  if (signals.complexity !== undefined && signals.complexity < 50) {
    issues.push(`High complexity (score: ${Math.round(signals.complexity)})`);
  }

  if (signals.churn !== undefined && signals.churn < 50) {
    issues.push(`High change frequency (score: ${Math.round(signals.churn)})`);
  }

  if (signals.historicalIssues !== undefined && signals.historicalIssues > 30) {
    issues.push(`History of issues (score: ${Math.round(100 - signals.historicalIssues)})`);
  }

  if (issues.length === 0) {
    return 'Multiple signals indicate potential issues.';
  }

  return issues.join('. ') + '.';
}

/**
 * Store predictions in the database
 */
export async function storePredictions(
  projectId: string,
  contextId: string | null,
  predictions: Prediction[]
): Promise<string[]> {
  const ids: string[] = [];

  const now = new Date().toISOString();

  for (const prediction of predictions) {
    const dbPrediction = debtPredictionDb.create({
      project_id: projectId,
      context_id: contextId,
      pattern_id: prediction.patternId || null,
      file_path: prediction.file,
      line_start: 0,
      line_end: 0,
      code_snippet: '',
      title: prediction.title,
      description: prediction.description,
      prediction_type: prediction.type,
      confidence_score: Math.round(prediction.confidence * 100),
      urgency_score: Math.round(prediction.urgency * 100),
      complexity_trend: 'stable',
      complexity_delta: 0,
      velocity: 0,
      suggested_action: prediction.suggestedAction,
      micro_refactoring: prediction.microRefactoring || null,
      estimated_prevention_effort: prediction.effort,
      estimated_cleanup_effort: prediction.effort === 'trivial' ? 'small' : prediction.effort === 'small' ? 'medium' : 'large',
      status: 'active',
      dismissed_reason: null,
      addressed_at: null,
      first_detected_at: now,
      last_seen_at: now,
    });

    ids.push(dbPrediction.id);
  }

  return ids;
}

