/**
 * Hypothesis Engine
 *
 * Transforms direction success criteria into machine-checkable assertions
 * and validates them against direction_outcomes data (git diff metrics).
 *
 * Assertion types supported:
 *   - lines_added, lines_removed, files_changed  → numeric comparators
 *   - execution_success                           → boolean
 *   - was_reverted                                → boolean (expect false)
 *   - file_touched                                → checks files_changed array
 */

import type { DbDirectionOutcome } from '@/app/db/models/brain.types';

// ── Types ──────────────────────────────────────────────────────────────────

export type AssertionMetric =
  | 'lines_added'
  | 'lines_removed'
  | 'files_changed'
  | 'execution_success'
  | 'was_reverted'
  | 'file_touched';

export type AssertionOperator = '<' | '<=' | '>' | '>=' | '==' | '!=' | 'contains';

export interface HypothesisAssertion {
  /** Human-readable description, e.g. "Creates fewer than 5 new files" */
  description: string;
  /** The metric to check against outcome data */
  metric: AssertionMetric;
  /** Comparison operator */
  operator: AssertionOperator;
  /** Expected value (number for numeric, boolean for flags, string for file_touched) */
  expected: number | boolean | string;
}

export type AssertionResult = {
  assertion: HypothesisAssertion;
  passed: boolean;
  actual: number | boolean | string | null;
  reason: string;
};

export interface ValidationResult {
  directionId: string;
  totalAssertions: number;
  passed: number;
  failed: number;
  skipped: number;
  results: AssertionResult[];
  score: number; // 0-1 ratio of passed / (passed + failed)
}

// ── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parse hypothesis_assertions JSON column safely.
 */
export function parseAssertions(json: string | null): HypothesisAssertion[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidAssertion);
  } catch {
    return [];
  }
}

function isValidAssertion(a: unknown): a is HypothesisAssertion {
  if (typeof a !== 'object' || a === null) return false;
  const obj = a as Record<string, unknown>;
  return (
    typeof obj.description === 'string' &&
    typeof obj.metric === 'string' &&
    typeof obj.operator === 'string' &&
    obj.expected !== undefined
  );
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a set of assertions against a direction outcome.
 */
export function validateAssertions(
  directionId: string,
  assertions: HypothesisAssertion[],
  outcome: DbDirectionOutcome | null
): ValidationResult {
  if (!outcome || assertions.length === 0) {
    return {
      directionId,
      totalAssertions: assertions.length,
      passed: 0,
      failed: 0,
      skipped: assertions.length,
      results: assertions.map(a => ({
        assertion: a,
        passed: false,
        actual: null,
        reason: outcome ? 'No assertions defined' : 'No outcome data available',
      })),
      score: 0,
    };
  }

  const filesChanged = parseFilesChanged(outcome.files_changed);
  const results: AssertionResult[] = assertions.map(assertion =>
    evaluateAssertion(assertion, outcome, filesChanged)
  );

  const passed = results.filter(r => r.passed).length;
  const skipped = results.filter(r => r.actual === null).length;
  const failed = results.length - passed - skipped;

  return {
    directionId,
    totalAssertions: assertions.length,
    passed,
    failed,
    skipped,
    results,
    score: passed + failed > 0 ? passed / (passed + failed) : 0,
  };
}

function parseFilesChanged(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function evaluateAssertion(
  assertion: HypothesisAssertion,
  outcome: DbDirectionOutcome,
  filesChanged: string[]
): AssertionResult {
  const { metric, operator, expected } = assertion;

  // Get the actual value from the outcome
  let actual: number | boolean | string | null;

  switch (metric) {
    case 'lines_added':
      actual = outcome.lines_added;
      break;
    case 'lines_removed':
      actual = outcome.lines_removed;
      break;
    case 'files_changed':
      actual = filesChanged.length;
      break;
    case 'execution_success':
      actual = outcome.execution_success === null ? null : outcome.execution_success === 1;
      break;
    case 'was_reverted':
      actual = outcome.was_reverted === 1;
      break;
    case 'file_touched':
      // For file_touched, check if the expected filename pattern appears in filesChanged
      if (typeof expected === 'string') {
        const pattern = expected.toLowerCase();
        const found = filesChanged.some(f => f.toLowerCase().includes(pattern));
        return {
          assertion,
          passed: operator === 'contains' ? found : !found,
          actual: found ? expected : 'not found',
          reason: found
            ? `File matching "${expected}" was ${operator === 'contains' ? 'found' : 'unexpectedly found'}`
            : `File matching "${expected}" was ${operator === 'contains' ? 'not found' : 'correctly absent'}`,
        };
      }
      return { assertion, passed: false, actual: null, reason: 'Invalid expected value for file_touched' };
    default:
      return { assertion, passed: false, actual: null, reason: `Unknown metric: ${metric}` };
  }

  // If actual is null, we can't evaluate
  if (actual === null) {
    return { assertion, passed: false, actual: null, reason: `No data for metric "${metric}"` };
  }

  // Compare
  const passed = compare(actual, operator, expected);

  return {
    assertion,
    passed,
    actual,
    reason: passed
      ? `${metric} ${operator} ${expected}: actual=${actual} ✓`
      : `${metric} ${operator} ${expected}: actual=${actual} ✗`,
  };
}

function compare(
  actual: number | boolean | string,
  operator: AssertionOperator,
  expected: number | boolean | string
): boolean {
  // Numeric comparisons
  if (typeof actual === 'number' && typeof expected === 'number') {
    switch (operator) {
      case '<': return actual < expected;
      case '<=': return actual <= expected;
      case '>': return actual > expected;
      case '>=': return actual >= expected;
      case '==': return actual === expected;
      case '!=': return actual !== expected;
      default: return false;
    }
  }

  // Boolean comparisons
  if (typeof actual === 'boolean' && typeof expected === 'boolean') {
    switch (operator) {
      case '==': return actual === expected;
      case '!=': return actual !== expected;
      default: return false;
    }
  }

  // String contains
  if (typeof actual === 'string' && typeof expected === 'string') {
    if (operator === 'contains') return actual.includes(expected);
    if (operator === '==') return actual === expected;
    if (operator === '!=') return actual !== expected;
  }

  return false;
}

// ── Serialization ──────────────────────────────────────────────────────────

/**
 * Serialize assertions to JSON for storage in the DB column.
 */
export function serializeAssertions(assertions: HypothesisAssertion[]): string {
  return JSON.stringify(assertions);
}
