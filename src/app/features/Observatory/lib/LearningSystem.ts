/**
 * Learning System
 * Learns from execution outcomes to improve predictions and auto-fixes
 * Implements the feedback loop for continuous improvement
 */

import { observatoryDb } from '@/app/db';
import type {
  DbLearnedPattern,
  DbPredictionOutcome,
  DbExecutionOutcome,
  CreateLearnedPattern,
} from '@/app/db/models/observatory.types';

// Learning configuration
export interface LearningConfig {
  minSamplesForPattern: number; // Minimum executions to learn a pattern
  minSamplesForAutoFix: number; // Minimum successful executions for auto-fix
  precisionThresholdForActive: number; // Minimum precision to activate a pattern
  autoFixSuccessThreshold: number; // Minimum success rate for auto-fix
  maxPatternsPerProject: number; // Limit patterns to prevent noise
}

const DEFAULT_CONFIG: LearningConfig = {
  minSamplesForPattern: 3,
  minSamplesForAutoFix: 5,
  precisionThresholdForActive: 0.6,
  autoFixSuccessThreshold: 0.7,
  maxPatternsPerProject: 50,
};

// Pattern candidate from analysis
interface PatternCandidate {
  name: string;
  description: string;
  patternType: DbLearnedPattern['pattern_type'];
  category: string;
  detectionRules: Record<string, unknown>;
  filePatterns: string[];
  sourceOutcomes: string[];
}

/**
 * Record a prediction outcome
 * Called when we can determine if a prediction was accurate
 */
export async function recordPredictionOutcome(
  projectId: string,
  predictionId: string,
  outcome: DbPredictionOutcome['outcome_type'],
  details: {
    actualSeverity?: string;
    userAction?: string;
    timeToOutcomeDays?: number;
  } = {}
): Promise<void> {
  // Get the prediction to extract original values
  // Note: Would need to integrate with debt prediction repository
  const outcomeRecord = observatoryDb.createPredictionOutcome({
    project_id: projectId,
    prediction_id: predictionId,
    original_confidence: 0.7, // Would come from actual prediction
    original_urgency: 0.5,
    prediction_type: 'emerging',
    predicted_severity: 'medium',
    outcome_type: outcome,
    contributing_signals: [],
  });

  // Update with details
  if (details.actualSeverity || details.userAction || details.timeToOutcomeDays) {
    observatoryDb.updatePredictionOutcome(outcomeRecord.id, {
      actual_severity: details.actualSeverity,
      user_action_taken: details.userAction,
      time_to_outcome_days: details.timeToOutcomeDays,
    });
  }

  // Update pattern metrics if applicable
  const prediction = observatoryDb.getPredictionOutcomeById(outcomeRecord.id);
  if (prediction?.pattern_id) {
    if (outcome === 'confirmed' || outcome === 'prevented') {
      observatoryDb.incrementPatternMetric(prediction.pattern_id, 'true_positives');
    } else if (outcome === 'false_positive') {
      observatoryDb.incrementPatternMetric(prediction.pattern_id, 'false_positives');
    }

    // Recalculate pattern scores
    observatoryDb.recalculatePatternScores(prediction.pattern_id);
  }
}

/**
 * Learn from execution outcomes
 * Identifies patterns in successful/failed executions
 */
export async function learnFromExecutions(
  projectId: string,
  config: LearningConfig = DEFAULT_CONFIG
): Promise<{
  patternsCreated: number;
  patternsUpdated: number;
  autoFixesEnabled: number;
}> {
  let patternsCreated = 0;
  let patternsUpdated = 0;
  let autoFixesEnabled = 0;

  // Get recent execution outcomes
  const outcomes = observatoryDb.getRecentExecutionOutcomes(projectId, 100);

  // Group by outcome rating
  const successfulOutcomes = outcomes.filter(
    (o) => o.success === 1 && (o.outcome_rating === 'excellent' || o.outcome_rating === 'good')
  );
  const failedOutcomes = outcomes.filter(
    (o) => o.success === 0 || o.outcome_rating === 'failed' || o.outcome_rating === 'poor'
  );

  // Analyze successful patterns
  const successPatterns = analyzeOutcomePatterns(successfulOutcomes);

  for (const candidate of successPatterns) {
    if (candidate.sourceOutcomes.length < config.minSamplesForPattern) continue;

    // Check if pattern already exists
    const existingPatterns = observatoryDb.getLearnedPatterns(projectId, {
      type: candidate.patternType,
    });

    const existing = existingPatterns.find(
      (p) => p.category === candidate.category && p.name === candidate.name
    );

    if (existing) {
      // Update existing pattern
      observatoryDb.updateLearnedPattern(existing.id, {
        detection_rules: candidate.detectionRules,
      });
      patternsUpdated++;

      // Check if we should enable auto-fix
      if (
        !existing.has_auto_fix &&
        candidate.sourceOutcomes.length >= config.minSamplesForAutoFix &&
        existing.precision_score &&
        existing.precision_score >= config.autoFixSuccessThreshold
      ) {
        // Generate auto-fix template from successful outcomes
        const template = generateAutoFixTemplate(candidate, successfulOutcomes);
        if (template) {
          observatoryDb.updateLearnedPattern(existing.id, {
            has_auto_fix: true,
            auto_fix_template: template,
            auto_fix_confidence: existing.precision_score,
            auto_fix_risk: 'medium',
          });
          autoFixesEnabled++;
        }
      }
    } else {
      // Create new pattern
      const currentPatternCount = existingPatterns.length;
      if (currentPatternCount < config.maxPatternsPerProject) {
        observatoryDb.createLearnedPattern({
          project_id: projectId,
          name: candidate.name,
          description: candidate.description,
          pattern_type: candidate.patternType,
          category: candidate.category,
          detection_rules: candidate.detectionRules,
          file_patterns: candidate.filePatterns,
          source: 'learned',
        });
        patternsCreated++;
      }
    }
  }

  // Analyze failed patterns (to avoid)
  const failPatterns = analyzeOutcomePatterns(failedOutcomes);

  for (const candidate of failPatterns) {
    if (candidate.sourceOutcomes.length < config.minSamplesForPattern) continue;

    // Create negative pattern to avoid
    const existingPatterns = observatoryDb.getLearnedPatterns(projectId, {
      type: candidate.patternType,
    });

    if (existingPatterns.length < config.maxPatternsPerProject) {
      const existing = existingPatterns.find(
        (p) => p.category === candidate.category && p.name.startsWith('[AVOID]')
      );

      if (!existing) {
        observatoryDb.createLearnedPattern({
          project_id: projectId,
          name: `[AVOID] ${candidate.name}`,
          description: `Pattern associated with failed executions: ${candidate.description}`,
          pattern_type: candidate.patternType,
          category: `avoid-${candidate.category}`,
          detection_rules: candidate.detectionRules,
          file_patterns: candidate.filePatterns,
          source: 'learned',
        });
        patternsCreated++;
      }
    }
  }

  return { patternsCreated, patternsUpdated, autoFixesEnabled };
}

/**
 * Analyze outcomes to find patterns
 */
function analyzeOutcomePatterns(outcomes: DbExecutionOutcome[]): PatternCandidate[] {
  const candidates: PatternCandidate[] = [];

  // Group by execution type
  const byType = new Map<string, DbExecutionOutcome[]>();
  for (const outcome of outcomes) {
    const type = outcome.execution_type;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(outcome);
  }

  for (const [type, typeOutcomes] of byType.entries()) {
    if (typeOutcomes.length < 2) continue;

    // Find common file patterns
    const allFiles: string[] = [];
    for (const outcome of typeOutcomes) {
      try {
        const files = outcome.target_files ? JSON.parse(outcome.target_files) : [];
        allFiles.push(...files);
      } catch {
        continue;
      }
    }

    // Find common patterns in file paths
    const filePatterns = findCommonPatterns(allFiles);

    if (filePatterns.length > 0) {
      candidates.push({
        name: `${type} pattern for ${filePatterns[0]}`,
        description: `Pattern identified from ${typeOutcomes.length} executions`,
        patternType: type === 'fix' ? 'smell' : 'complexity',
        category: type,
        detectionRules: {
          executionType: type,
          minOccurrences: typeOutcomes.length,
          filePatterns,
        },
        filePatterns,
        sourceOutcomes: typeOutcomes.map((o) => o.id),
      });
    }
  }

  return candidates;
}

/**
 * Find common patterns in file paths
 */
function findCommonPatterns(files: string[]): string[] {
  if (files.length === 0) return [];

  // Extract directory patterns
  const dirs = new Map<string, number>();
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      dirs.set(dir, (dirs.get(dir) || 0) + 1);
    }
  }

  // Find directories that appear frequently
  const threshold = Math.max(2, Math.floor(files.length * 0.3));
  const commonDirs = Array.from(dirs.entries())
    .filter(([, count]) => count >= threshold)
    .map(([dir]) => `${dir}/**`);

  // Extract file extensions
  const extensions = new Map<string, number>();
  for (const file of files) {
    const ext = file.split('.').pop();
    if (ext) {
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    }
  }

  const commonExtensions = Array.from(extensions.entries())
    .filter(([, count]) => count >= threshold)
    .map(([ext]) => `**/*.${ext}`);

  return [...commonDirs, ...commonExtensions].slice(0, 3);
}

/**
 * Generate an auto-fix template from successful outcomes
 */
function generateAutoFixTemplate(
  candidate: PatternCandidate,
  outcomes: DbExecutionOutcome[]
): string | null {
  // Find outcomes that match this candidate
  const matchingOutcomes = outcomes.filter((o) =>
    candidate.sourceOutcomes.includes(o.id)
  );

  if (matchingOutcomes.length === 0) return null;

  // Find the most successful requirement (highest health improvement)
  const sorted = matchingOutcomes
    .filter((o) => o.requirement_content)
    .sort((a, b) => (b.health_improvement || 0) - (a.health_improvement || 0));

  if (sorted.length === 0) return null;

  // Use the best performing requirement as template
  const best = sorted[0];

  // Generalize the template
  let template = best.requirement_content || '';

  // Replace specific file names with placeholder
  template = template.replace(/`[^`]+\.(ts|tsx|js|jsx|py)`/g, '`{{file}}`');

  return template;
}

/**
 * Suspend a pattern that's underperforming
 */
export function suspendPattern(patternId: string, reason: string): void {
  observatoryDb.updateLearnedPattern(patternId, {
    status: 'suspended',
    description: `Suspended: ${reason}`,
  });
}

/**
 * Deprecate a pattern that's no longer useful
 */
export function deprecatePattern(patternId: string): void {
  observatoryDb.updateLearnedPattern(patternId, {
    status: 'deprecated',
  });
}

/**
 * Get learning progress summary
 */
export function getLearningProgress(projectId: string) {
  return observatoryDb.getLearningProgress(projectId);
}

/**
 * Perform automated cleanup of low-quality patterns
 */
export async function cleanupPatterns(
  projectId: string,
  config: LearningConfig = DEFAULT_CONFIG
): Promise<{
  deprecated: number;
  suspended: number;
}> {
  let deprecated = 0;
  let suspended = 0;

  const patterns = observatoryDb.getLearnedPatterns(projectId);

  for (const pattern of patterns) {
    if (pattern.status !== 'active' && pattern.status !== 'learning') continue;

    // Deprecate patterns with too many false positives
    if (
      pattern.total_detections > 10 &&
      pattern.precision_score !== null &&
      pattern.precision_score < 0.3
    ) {
      deprecatePattern(pattern.id);
      deprecated++;
      continue;
    }

    // Suspend patterns with failing auto-fixes
    if (
      pattern.has_auto_fix &&
      pattern.auto_fixes_attempted > 5 &&
      pattern.auto_fix_success_rate !== null &&
      pattern.auto_fix_success_rate < 0.4
    ) {
      observatoryDb.updateLearnedPattern(pattern.id, {
        has_auto_fix: false,
      });
      suspendPattern(pattern.id, 'Auto-fix success rate too low');
      suspended++;
    }
  }

  return { deprecated, suspended };
}

/**
 * Record user feedback on a prediction or auto-fix
 */
export function recordUserFeedback(
  outcomeId: string,
  feedback: 'accurate' | 'inaccurate' | 'partially_accurate',
  notes?: string
): void {
  observatoryDb.updatePredictionOutcome(outcomeId, {
    user_feedback: feedback,
    feedback_notes: notes,
  });
}

/**
 * Record when user overrides an auto-fix
 */
export function recordAutoFixOverride(patternId: string): void {
  observatoryDb.incrementPatternMetric(patternId, 'user_overrides');
  observatoryDb.recalculatePatternScores(patternId);
}

