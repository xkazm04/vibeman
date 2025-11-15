/**
 * Predictive Scan Model
 * AI-powered prediction engine for scan scheduling
 */

import { v4 as uuidv4 } from 'uuid';
import {
  scanPredictionDb,
  fileChangePatternDb,
  DbScanPrediction,
  ScanPrediction,
  ScanRecommendation,
} from '@/app/db';
import {
  calculateStalenessScore,
  getScanFrequency,
  getLastScanTime,
} from './scanHistoryService';

/**
 * Scan type to file pattern mapping
 * Defines which file patterns affect which scans
 */
const SCAN_FILE_PATTERNS: Record<string, string[]> = {
  structure: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
  build: ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.*'],
  contexts: ['src/**/*.ts', 'src/**/*.tsx', '.context', 'src/**/*.md'],
  photo: ['src/**/*.tsx', 'src/**/*.jsx', 'public/**/*'],
  vision: ['README.md', 'docs/**/*.md', 'src/**/*.md'],
  architecture: ['src/**/*.ts', 'src/**/*.tsx'],
  dependency: ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
  documentation: ['**/*.md', 'docs/**/*', 'README*'],
  snapshot: ['src/**/*.tsx', 'src/**/*.jsx', 'src/components/**/*'],
  selectors: ['src/**/*.tsx', 'src/**/*.jsx'],
  unused: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
  goal: ['**/*'],
  security: ['package.json', 'package-lock.json', 'yarn.lock'],
  refactoring: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
  insight_synth: ['**/*'], // Insight synthesis scans all
};

/**
 * Initialize file change patterns for a project
 */
export async function initializeFilePatterns(projectId: string): Promise<void> {
  const scanTypes = Object.keys(SCAN_FILE_PATTERNS);

  for (const scanType of scanTypes) {
    const patterns = SCAN_FILE_PATTERNS[scanType];

    for (const pattern of patterns) {
      fileChangePatternDb.upsert({
        id: uuidv4(),
        project_id: projectId,
        file_pattern: pattern,
        scan_types: JSON.stringify([scanType]),
        change_frequency_days: null,
        last_changed_at: null,
        commit_count: 0,
        total_changes: 0,
      });
    }
  }
}

/**
 * Record file changes from git commits
 */
export async function recordFileChanges(
  projectId: string,
  changedFiles: string[],
  commitSha: string
): Promise<void> {
  // Match changed files to patterns
  for (const [scanType, patterns] of Object.entries(SCAN_FILE_PATTERNS)) {
    for (const pattern of patterns) {
      // Simple glob matching (can be enhanced with minimatch)
      const matches = changedFiles.some((file) => matchesPattern(file, pattern));

      if (matches) {
        // Update or create pattern
        const existing = fileChangePatternDb.getByProject(projectId).find(
          (p) => p.file_pattern === pattern && p.scan_types.includes(scanType)
        );

        if (existing) {
          fileChangePatternDb.recordChange(projectId, pattern, commitSha);
        } else {
          fileChangePatternDb.upsert({
            id: uuidv4(),
            project_id: projectId,
            file_pattern: pattern,
            scan_types: JSON.stringify([scanType]),
            change_frequency_days: null,
            last_changed_at: new Date().toISOString(),
            commit_count: 1,
            total_changes: 1,
          });
        }
      }
    }
  }
}

/**
 * Simple glob pattern matching
 */
function matchesPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Calculate confidence score for a prediction
 * Based on historical data quality and pattern strength
 */
function calculateConfidenceScore(
  scanFrequency: { avgDaysBetweenScans: number; scanCount: number },
  patternStrength: number
): number {
  // More scans = higher confidence
  const frequencyFactor = Math.min(scanFrequency.scanCount / 10, 1) * 50;

  // Pattern strength (0-50)
  const patternFactor = patternStrength * 50;

  return Math.round(frequencyFactor + patternFactor);
}

/**
 * Calculate priority score
 * Combines staleness, confidence, and predicted impact
 */
function calculatePriorityScore(
  stalenessScore: number,
  confidenceScore: number,
  predictedFindings: number
): number {
  // Weighted combination
  const stalenessWeight = 0.4;
  const confidenceWeight = 0.3;
  const findingsWeight = 0.3;

  const findingsScore = Math.min((predictedFindings / 10) * 100, 100);

  const priority =
    stalenessScore * stalenessWeight +
    confidenceScore * confidenceWeight +
    findingsScore * findingsWeight;

  return Math.round(priority);
}

/**
 * Determine recommendation type based on scores
 */
function determineRecommendation(
  stalenessScore: number,
  priorityScore: number
): 'immediate' | 'soon' | 'scheduled' | 'skip' {
  if (stalenessScore >= 80 || priorityScore >= 80) {
    return 'immediate';
  } else if (stalenessScore >= 50 || priorityScore >= 60) {
    return 'soon';
  } else if (stalenessScore >= 25 || priorityScore >= 40) {
    return 'scheduled';
  } else {
    return 'skip';
  }
}

/**
 * Generate scan prediction for a specific scan type
 */
export async function generateScanPrediction(
  projectId: string,
  scanType: string,
  contextId?: string
): Promise<DbScanPrediction> {
  // Get scan history
  const stalenessScore = calculateStalenessScore(projectId, scanType, contextId);
  const scanFrequency = getScanFrequency(projectId, scanType);
  const lastScanTime = getLastScanTime(projectId, scanType, contextId);

  // Get file change patterns
  const patterns = fileChangePatternDb.getByScanType(projectId, scanType);
  const patternStrength = patterns.length > 0 ? Math.min(patterns.length / 5, 1) : 0;

  // Calculate last change time from patterns
  const lastChangeAt = patterns.reduce((latest: Date | null, p) => {
    if (!p.last_changed_at) return latest;
    const changeDate = new Date(p.last_changed_at);
    return !latest || changeDate > latest ? changeDate : latest;
  }, null);

  // Calculate average change frequency
  const avgChangeFrequency =
    patterns.length > 0
      ? patterns.reduce((sum, p) => sum + (p.change_frequency_days || 0), 0) / patterns.length
      : null;

  // Predict findings based on staleness
  const predictedFindings = Math.round((stalenessScore / 100) * 15);

  // Calculate confidence
  const confidenceScore = calculateConfidenceScore(scanFrequency, patternStrength);

  // Calculate priority
  const priorityScore = calculatePriorityScore(stalenessScore, confidenceScore, predictedFindings);

  // Determine recommendation
  const recommendation = determineRecommendation(stalenessScore, priorityScore);

  // Calculate next recommended time
  const nextRecommendedAt = calculateNextRecommendedTime(
    recommendation,
    scanFrequency.avgDaysBetweenScans
  );

  // Generate reasoning
  const reasoning = generateReasoning(
    scanType,
    stalenessScore,
    confidenceScore,
    scanFrequency,
    lastScanTime,
    lastChangeAt
  );

  // Create prediction
  const prediction: Omit<DbScanPrediction, 'created_at' | 'updated_at'> = {
    id: uuidv4(),
    project_id: projectId,
    scan_type: scanType,
    context_id: contextId || null,
    confidence_score: confidenceScore,
    staleness_score: stalenessScore,
    priority_score: priorityScore,
    predicted_findings: predictedFindings,
    recommendation,
    reasoning,
    affected_file_patterns: JSON.stringify(SCAN_FILE_PATTERNS[scanType] || []),
    last_scan_at: lastScanTime?.toISOString() || null,
    last_change_at: lastChangeAt?.toISOString() || null,
    next_recommended_at: nextRecommendedAt,
    change_frequency_days: avgChangeFrequency,
    scan_frequency_days: scanFrequency.avgDaysBetweenScans || null,
    dismissed: 0,
    scheduled: 0,
    calculated_at: new Date().toISOString(),
  };

  return scanPredictionDb.upsert(prediction);
}

/**
 * Calculate next recommended scan time
 */
function calculateNextRecommendedTime(
  recommendation: 'immediate' | 'soon' | 'scheduled' | 'skip',
  avgScanFrequencyDays: number
): string | null {
  const now = new Date();

  switch (recommendation) {
    case 'immediate':
      return now.toISOString(); // Now
    case 'soon':
      now.setHours(now.getHours() + 6); // 6 hours
      return now.toISOString();
    case 'scheduled':
      now.setDate(now.getDate() + Math.max(avgScanFrequencyDays || 7, 1));
      return now.toISOString();
    case 'skip':
      return null;
  }
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  scanType: string,
  stalenessScore: number,
  confidenceScore: number,
  scanFrequency: { avgDaysBetweenScans: number; scanCount: number },
  lastScanTime: Date | null,
  lastChangeAt: Date | null
): string {
  const parts: string[] = [];

  // Staleness
  if (stalenessScore >= 80) {
    parts.push(`${scanType} scan is highly stale (${stalenessScore}%)`);
  } else if (stalenessScore >= 50) {
    parts.push(`${scanType} scan is moderately stale (${stalenessScore}%)`);
  } else {
    parts.push(`${scanType} scan is relatively fresh (${stalenessScore}% staleness)`);
  }

  // Last scan
  if (lastScanTime) {
    const daysSince = Math.round(
      (Date.now() - lastScanTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    parts.push(`last scanned ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`);
  } else {
    parts.push('never scanned before');
  }

  // Recent changes
  if (lastChangeAt) {
    const hoursSince = Math.round((Date.now() - lastChangeAt.getTime()) / (1000 * 60 * 60));
    if (hoursSince < 24) {
      parts.push(`relevant files changed ${hoursSince} hour${hoursSince !== 1 ? 's' : ''} ago`);
    } else {
      const daysSince = Math.round(hoursSince / 24);
      parts.push(`relevant files changed ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`);
    }
  }

  // Confidence note
  if (confidenceScore < 50) {
    parts.push(`(low confidence: ${confidenceScore}% - limited historical data)`);
  }

  return parts.join('. ') + '.';
}

/**
 * Generate predictions for all scan types
 */
export async function generateAllPredictions(projectId: string): Promise<DbScanPrediction[]> {
  const scanTypes = Object.keys(SCAN_FILE_PATTERNS);
  const predictions: DbScanPrediction[] = [];

  for (const scanType of scanTypes) {
    const prediction = await generateScanPrediction(projectId, scanType);
    predictions.push(prediction);
  }

  return predictions;
}

/**
 * Get top scan recommendations for UI
 */
export function getTopRecommendations(
  projectId: string,
  limit = 5
): ScanRecommendation[] {
  const predictions = scanPredictionDb.getTopRecommendations(projectId, limit);

  return predictions.map((p) => ({
    scanType: p.scan_type,
    contextId: p.context_id || undefined,
    priority:
      p.priority_score >= 80
        ? 'immediate'
        : p.priority_score >= 60
        ? 'high'
        : p.priority_score >= 40
        ? 'medium'
        : 'low',
    confidenceScore: p.confidence_score,
    stalenessScore: p.staleness_score,
    reasoning: p.reasoning || '',
    lastScanAt: p.last_scan_at || undefined,
    lastChangeAt: p.last_change_at || undefined,
    nextRecommendedAt: p.next_recommended_at || undefined,
    predictedFindings: p.predicted_findings || undefined,
  }));
}

/**
 * Dismiss a recommendation
 */
export function dismissRecommendation(predictionId: string): boolean {
  return scanPredictionDb.dismiss(predictionId);
}

/**
 * Mark recommendation as scheduled
 */
export function markRecommendationScheduled(predictionId: string): boolean {
  return scanPredictionDb.markScheduled(predictionId);
}
