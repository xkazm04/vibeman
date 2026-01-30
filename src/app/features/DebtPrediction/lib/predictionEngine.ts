/**
 * Debt Prediction Engine
 * Analyzes code patterns and predicts technical debt before it accumulates
 */

import {
  debtPatternDb,
  debtPredictionDb,
  complexityHistoryDb,
  opportunityCardDb,
  codeChangeEventDb,
  type DbDebtPattern,
  type DbDebtPrediction,
  type DbComplexityHistory,
} from '@/app/db';
import {
  detectLongFunctions,
  detectComplexConditionals,
  detectHighComplexityFunctions,
  detectMagicNumbers,
  detectDuplication,
  detectUnusedImports,
  calculateCyclomaticComplexity,
} from './patternDetectorStubs';

// ============================================================================
// TYPES
// ============================================================================

export interface CodeAnalysisResult {
  filePath: string;
  complexity: {
    cyclomatic: number;
    linesOfCode: number;
    functionCount: number;
    avgFunctionLength: number;
  };
  issues: Array<{
    type: string;
    line: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestion: string;
  }>;
  patterns: string[]; // Pattern IDs that match
}

export interface PredictionResult {
  predictions: DbDebtPrediction[];
  opportunityCards: Array<{
    title: string;
    summary: string;
    cardType: 'prevention' | 'quick-win' | 'warning' | 'suggestion';
    actionType: string;
    actionDescription: string;
    priority: number;
    estimatedTimeMinutes: number;
  }>;
  metrics: {
    filesAnalyzed: number;
    issuesFound: number;
    predictionsCreated: number;
    urgentCount: number;
  };
}

export interface TrendAnalysis {
  trend: 'stable' | 'increasing' | 'decreasing';
  delta: number;
  velocity: number; // Change rate per day
  daysUntilCritical: number | null;
}

// ============================================================================
// PREDEFINED DEBT PATTERNS
// ============================================================================

const PREDEFINED_PATTERNS: Omit<DbDebtPattern, 'id' | 'project_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'God Class',
    description: 'A class/file that has grown too large and does too many things',
    pattern_type: 'complexity',
    severity: 'high',
    category: 'god-class',
    detection_rules: JSON.stringify([
      { metric: 'linesOfCode', threshold: 500, operator: '>' },
      { metric: 'functionCount', threshold: 20, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.1,
    avg_time_to_debt: 30,
    prevention_success_rate: 0.8,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Circular Dependency',
    description: 'Files that depend on each other, creating tight coupling',
    pattern_type: 'coupling',
    severity: 'high',
    category: 'circular-dependency',
    detection_rules: JSON.stringify([
      { metric: 'circularImports', threshold: 0, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.05,
    avg_time_to_debt: 14,
    prevention_success_rate: 0.9,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Feature Envy',
    description: 'A function that uses more features from another module than its own',
    pattern_type: 'smell',
    severity: 'medium',
    category: 'feature-envy',
    detection_rules: JSON.stringify([
      { metric: 'externalCalls', threshold: 5, operator: '>' },
      { metric: 'internalCalls', threshold: 2, operator: '<' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.2,
    avg_time_to_debt: 45,
    prevention_success_rate: 0.7,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Long Function',
    description: 'Functions that are too long and should be broken down',
    pattern_type: 'complexity',
    severity: 'medium',
    category: 'long-function',
    detection_rules: JSON.stringify([
      { metric: 'functionLines', threshold: 50, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.15,
    avg_time_to_debt: 21,
    prevention_success_rate: 0.85,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Deep Nesting',
    description: 'Deeply nested conditionals that harm readability',
    pattern_type: 'complexity',
    severity: 'medium',
    category: 'deep-nesting',
    detection_rules: JSON.stringify([
      { metric: 'maxNestingDepth', threshold: 4, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.1,
    avg_time_to_debt: 14,
    prevention_success_rate: 0.9,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Magic Numbers',
    description: 'Hard-coded numbers that should be named constants',
    pattern_type: 'smell',
    severity: 'low',
    category: 'magic-numbers',
    detection_rules: JSON.stringify([
      { metric: 'magicNumberCount', threshold: 3, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.25,
    avg_time_to_debt: 60,
    prevention_success_rate: 0.95,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'Duplicate Code',
    description: 'Similar code blocks that should be abstracted',
    pattern_type: 'duplication',
    severity: 'medium',
    category: 'duplicate-code',
    detection_rules: JSON.stringify([
      { metric: 'duplicateBlocks', threshold: 2, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.2,
    avg_time_to_debt: 30,
    prevention_success_rate: 0.75,
    source: 'predefined',
    learned_from_count: 0,
  },
  {
    name: 'High Cyclomatic Complexity',
    description: 'Functions with too many code paths',
    pattern_type: 'complexity',
    severity: 'high',
    category: 'high-complexity',
    detection_rules: JSON.stringify([
      { metric: 'cyclomaticComplexity', threshold: 15, operator: '>' }
    ]),
    file_patterns: JSON.stringify(['**/*.ts', '**/*.tsx', '**/*.js']),
    code_signatures: JSON.stringify([]),
    occurrence_count: 0,
    false_positive_rate: 0.05,
    avg_time_to_debt: 7,
    prevention_success_rate: 0.8,
    source: 'predefined',
    learned_from_count: 0,
  },
];

// ============================================================================
// ENGINE FUNCTIONS
// ============================================================================

/**
 * Initialize predefined patterns for a project
 */
export async function initializePredefinedPatterns(projectId: string): Promise<void> {
  const existingPatterns = debtPatternDb.getByProject(projectId);

  for (const pattern of PREDEFINED_PATTERNS) {
    const exists = existingPatterns.find(p => p.category === pattern.category);
    if (!exists) {
      debtPatternDb.create({
        ...pattern,
        project_id: projectId,
      });
    }
  }
}

/**
 * Analyze a file for potential debt patterns
 */
export function analyzeFile(filePath: string, content: string): CodeAnalysisResult {
  const lines = content.split('\n');
  const issues: CodeAnalysisResult['issues'] = [];
  const patterns: string[] = [];

  // Detect long functions
  const longFunctions = detectLongFunctions(content);
  longFunctions.forEach(line => {
    issues.push({
      type: 'long-function',
      line,
      severity: 'medium',
      description: 'Function is too long (>50 lines)',
      suggestion: 'Extract smaller functions with single responsibilities',
    });
  });

  // Detect complex conditionals
  const complexConditionals = detectComplexConditionals(content);
  complexConditionals.forEach(issue => {
    issues.push({
      type: issue.type,
      line: issue.line,
      severity: issue.severity as 'low' | 'medium' | 'high' | 'critical',
      description: issue.details,
      suggestion: issue.type === 'deep-nesting'
        ? 'Use early returns or extract to separate functions'
        : 'Extract complex conditions to named boolean variables',
    });
  });

  // Detect high complexity functions
  const highComplexity = detectHighComplexityFunctions(content);
  highComplexity.forEach(fn => {
    issues.push({
      type: 'high-complexity',
      line: fn.line,
      severity: fn.complexity > 20 ? 'critical' : 'high',
      description: `Function "${fn.functionName || 'anonymous'}" has cyclomatic complexity of ${fn.complexity}`,
      suggestion: 'Break down into smaller functions or use strategy pattern',
    });
  });

  // Detect magic numbers
  const magicNumbers = detectMagicNumbers(content);
  magicNumbers.forEach(mn => {
    issues.push({
      type: 'magic-numbers',
      line: mn.line,
      severity: mn.severity,
      description: `Magic number ${mn.number} found: ${mn.context}`,
      suggestion: mn.suggestedName
        ? `Extract to constant: const ${mn.suggestedName} = ${mn.number}`
        : 'Extract to a named constant',
    });
  });

  // Detect duplicate code
  const duplicates = detectDuplication(content);
  if (duplicates.length > 0) {
    issues.push({
      type: 'duplicate-code',
      line: duplicates[0],
      severity: 'medium',
      description: `${duplicates.length} potential duplicate code blocks found`,
      suggestion: 'Extract shared logic to a reusable function',
    });
  }

  // Detect unused imports
  const unusedImports = detectUnusedImports(content);
  unusedImports.forEach(line => {
    issues.push({
      type: 'unused-import',
      line,
      severity: 'low',
      description: 'Potentially unused import',
      suggestion: 'Remove unused imports to reduce bundle size',
    });
  });

  // Calculate overall complexity
  const cyclomaticComplexity = calculateCyclomaticComplexity(content);
  const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) || [];

  // Identify matching patterns
  if (lines.length > 500) patterns.push('god-class');
  if (longFunctions.length > 0) patterns.push('long-function');
  if (complexConditionals.some(c => c.type === 'deep-nesting')) patterns.push('deep-nesting');
  if (highComplexity.length > 0) patterns.push('high-complexity');
  if (magicNumbers.length > 3) patterns.push('magic-numbers');
  if (duplicates.length > 2) patterns.push('duplicate-code');

  return {
    filePath,
    complexity: {
      cyclomatic: cyclomaticComplexity,
      linesOfCode: lines.length,
      functionCount: functionMatches.length,
      avgFunctionLength: functionMatches.length > 0 ? lines.length / functionMatches.length : 0,
    },
    issues,
    patterns,
  };
}

/**
 * Analyze trend for a file based on history
 */
export function analyzeTrend(projectId: string, filePath: string): TrendAnalysis {
  const trend = complexityHistoryDb.getTrend(projectId, filePath, 30);

  // Calculate velocity (change per day)
  const history = complexityHistoryDb.getByFile(projectId, filePath, 30);
  let velocity = 0;

  if (history.length >= 2) {
    const first = history[history.length - 1];
    const last = history[0];
    const daysDiff = (new Date(last.measured_at).getTime() - new Date(first.measured_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      velocity = (last.cyclomatic_complexity - first.cyclomatic_complexity) / daysDiff;
    }
  }

  // Estimate days until critical (complexity > 30)
  let daysUntilCritical: number | null = null;
  if (velocity > 0 && history.length > 0) {
    const currentComplexity = history[0].cyclomatic_complexity;
    const threshold = 30;
    if (currentComplexity < threshold) {
      daysUntilCritical = Math.ceil((threshold - currentComplexity) / velocity);
    }
  }

  return {
    trend: trend.trend,
    delta: trend.delta,
    velocity,
    daysUntilCritical,
  };
}

/**
 * Create predictions from analysis results
 */
export function createPredictions(
  projectId: string,
  analysisResults: CodeAnalysisResult[],
  contextId: string | null = null
): PredictionResult {
  const predictions: DbDebtPrediction[] = [];
  const opportunityCards: PredictionResult['opportunityCards'] = [];
  let urgentCount = 0;

  // Get existing patterns for matching
  const patterns = debtPatternDb.getByProject(projectId);
  const patternMap = new Map(patterns.map(p => [p.category, p]));

  for (const result of analysisResults) {
    // Get trend analysis
    const trend = analyzeTrend(projectId, result.filePath);

    // Determine prediction type based on trend
    let predictionType: DbDebtPrediction['prediction_type'] = 'emerging';
    if (trend.trend === 'increasing' && trend.velocity > 1) {
      predictionType = 'accelerating';
    }
    if (trend.daysUntilCritical !== null && trend.daysUntilCritical < 14) {
      predictionType = 'imminent';
    }
    if (result.issues.some(i => i.severity === 'critical' || i.severity === 'high')) {
      predictionType = 'exists';
    }

    // Create predictions for each significant issue
    for (const issue of result.issues) {
      if (issue.severity === 'low' && predictionType === 'emerging') continue;

      // Calculate scores
      const confidenceScore = calculateConfidence(issue, trend);
      const urgencyScore = calculateUrgency(issue, trend, predictionType);

      if (urgencyScore >= 70) urgentCount++;

      // Find matching pattern
      const pattern = patternMap.get(issue.type);

      // Create prediction
      const prediction = debtPredictionDb.create({
        project_id: projectId,
        context_id: contextId,
        pattern_id: pattern?.id || null,
        file_path: result.filePath,
        line_start: issue.line,
        line_end: issue.line + 10,
        code_snippet: getCodeSnippet(result.filePath, issue.line),
        title: getIssueTitle(issue.type),
        description: issue.description,
        prediction_type: predictionType,
        confidence_score: confidenceScore,
        urgency_score: urgencyScore,
        complexity_trend: trend.trend,
        complexity_delta: trend.delta,
        velocity: trend.velocity,
        suggested_action: issue.suggestion,
        micro_refactoring: generateMicroRefactoring(issue),
        estimated_prevention_effort: estimatePreventionEffort(issue),
        estimated_cleanup_effort: estimateCleanupEffort(issue, trend),
        status: 'active',
        dismissed_reason: null,
        addressed_at: null,
        first_detected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });

      predictions.push(prediction);

      // Create opportunity card for high-priority issues
      if (urgencyScore >= 50 || issue.severity === 'high' || issue.severity === 'critical') {
        opportunityCards.push({
          title: getIssueTitle(issue.type),
          summary: issue.description,
          cardType: getCardType(issue, predictionType),
          actionType: getActionType(issue.type),
          actionDescription: issue.suggestion,
          priority: Math.ceil(urgencyScore / 10),
          estimatedTimeMinutes: getEstimatedTime(issue),
        });
      }
    }

    // Record complexity history
    complexityHistoryDb.record({
      project_id: projectId,
      file_path: result.filePath,
      cyclomatic_complexity: result.complexity.cyclomatic,
      lines_of_code: result.complexity.linesOfCode,
      dependency_count: 0,
      coupling_score: 0,
      cohesion_score: 100,
      commit_hash: null,
      change_type: 'modify',
      measured_at: new Date().toISOString(),
    });

    // Update pattern occurrence counts
    for (const patternCategory of result.patterns) {
      const pattern = patternMap.get(patternCategory);
      if (pattern) {
        debtPatternDb.incrementOccurrence(pattern.id);
      }
    }
  }

  return {
    predictions,
    opportunityCards,
    metrics: {
      filesAnalyzed: analysisResults.length,
      issuesFound: analysisResults.reduce((sum, r) => sum + r.issues.length, 0),
      predictionsCreated: predictions.length,
      urgentCount,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateConfidence(issue: CodeAnalysisResult['issues'][0], trend: TrendAnalysis): number {
  let confidence = 50;

  // Severity increases confidence
  if (issue.severity === 'critical') confidence += 30;
  else if (issue.severity === 'high') confidence += 20;
  else if (issue.severity === 'medium') confidence += 10;

  // Trend increases confidence
  if (trend.trend === 'increasing') confidence += 15;
  if (trend.velocity > 1) confidence += 10;

  return Math.min(100, confidence);
}

function calculateUrgency(
  issue: CodeAnalysisResult['issues'][0],
  trend: TrendAnalysis,
  predictionType: string
): number {
  let urgency = 30;

  // Severity
  if (issue.severity === 'critical') urgency += 40;
  else if (issue.severity === 'high') urgency += 25;
  else if (issue.severity === 'medium') urgency += 10;

  // Trend
  if (trend.trend === 'increasing') urgency += 15;
  if (trend.velocity > 2) urgency += 10;

  // Days until critical
  if (trend.daysUntilCritical !== null) {
    if (trend.daysUntilCritical < 7) urgency += 20;
    else if (trend.daysUntilCritical < 14) urgency += 10;
  }

  // Prediction type
  if (predictionType === 'exists') urgency += 15;
  if (predictionType === 'imminent') urgency += 10;

  return Math.min(100, urgency);
}

function getCodeSnippet(filePath: string, line: number): string {
  // In a real implementation, this would read the actual file
  // For now, return a placeholder
  return `// Code at ${filePath}:${line}`;
}

function getIssueTitle(issueType: string): string {
  const titles: Record<string, string> = {
    'long-function': 'Long Function Detected',
    'deep-nesting': 'Deep Nesting Alert',
    'complex-boolean': 'Complex Boolean Expression',
    'high-complexity': 'High Cyclomatic Complexity',
    'magic-numbers': 'Magic Numbers Found',
    'duplicate-code': 'Duplicate Code Pattern',
    'unused-import': 'Unused Import',
  };
  return titles[issueType] || 'Code Quality Issue';
}

function generateMicroRefactoring(issue: CodeAnalysisResult['issues'][0]): string | null {
  switch (issue.type) {
    case 'magic-numbers':
      return 'Extract magic number to named constant at file top';
    case 'deep-nesting':
      return 'Add early return to reduce nesting by one level';
    case 'unused-import':
      return 'Remove the unused import statement';
    case 'complex-boolean':
      return 'Extract boolean expression to descriptive variable';
    default:
      return null;
  }
}

function estimatePreventionEffort(issue: CodeAnalysisResult['issues'][0]): DbDebtPrediction['estimated_prevention_effort'] {
  switch (issue.severity) {
    case 'low':
      return 'trivial';
    case 'medium':
      return 'small';
    case 'high':
      return 'medium';
    case 'critical':
      return 'large';
    default:
      return 'small';
  }
}

function estimateCleanupEffort(
  issue: CodeAnalysisResult['issues'][0],
  trend: TrendAnalysis
): DbDebtPrediction['estimated_cleanup_effort'] {
  let base: DbDebtPrediction['estimated_cleanup_effort'] = 'small';

  if (issue.severity === 'high') base = 'medium';
  if (issue.severity === 'critical') base = 'large';

  // Trend increases cleanup effort
  if (trend.trend === 'increasing') {
    if (base === 'small') base = 'medium';
    else if (base === 'medium') base = 'large';
    else if (base === 'large') base = 'major';
  }

  return base;
}

function getCardType(
  issue: CodeAnalysisResult['issues'][0],
  predictionType: string
): 'prevention' | 'quick-win' | 'warning' | 'suggestion' {
  if (issue.severity === 'critical' || predictionType === 'exists') {
    return 'warning';
  }
  if (issue.severity === 'low' && issue.type !== 'high-complexity') {
    return 'quick-win';
  }
  if (predictionType === 'imminent' || predictionType === 'accelerating') {
    return 'prevention';
  }
  return 'suggestion';
}

function getActionType(issueType: string): string {
  const actionTypes: Record<string, string> = {
    'long-function': 'extract',
    'deep-nesting': 'restructure',
    'complex-boolean': 'extract',
    'high-complexity': 'restructure',
    'magic-numbers': 'rename',
    'duplicate-code': 'extract',
    'unused-import': 'micro-refactor',
  };
  return actionTypes[issueType] || 'review';
}

function getEstimatedTime(issue: CodeAnalysisResult['issues'][0]): number {
  switch (issue.severity) {
    case 'low':
      return 2;
    case 'medium':
      return 10;
    case 'high':
      return 30;
    case 'critical':
      return 60;
    default:
      return 15;
  }
}
