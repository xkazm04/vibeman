/**
 * Pattern Detector Stubs
 *
 * These are stub implementations of pattern detection functions.
 * The original implementations were in RefactorWizard/lib/patternDetectors
 * which was removed as part of dead code cleanup.
 *
 * These stubs return empty/default values to allow the DebtPrediction
 * feature to compile while providing no actual detection.
 *
 * If pattern detection is needed in the future, these functions
 * should be properly implemented.
 */

export interface DetectorMatch {
  line: number;
  column?: number;
  functionName?: string;
  message?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detect functions that are too long - stub
 */
export function detectLongFunctions(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Detect complex conditional statements - stub
 */
export function detectComplexConditionals(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Detect functions with high cyclomatic complexity - stub
 */
export function detectHighComplexityFunctions(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Detect magic numbers in code - stub
 */
export function detectMagicNumbers(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Detect code duplication - stub
 */
export function detectDuplication(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Detect unused imports - stub
 */
export function detectUnusedImports(_content: string): DetectorMatch[] {
  return [];
}

/**
 * Calculate cyclomatic complexity - stub returns default
 */
export function calculateCyclomaticComplexity(_content: string): number {
  return 1; // Base complexity
}
