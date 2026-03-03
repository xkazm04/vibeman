/**
 * Error Classifier — Structured error classification
 *
 * Parses CLI error output and classifies into structured categories.
 * Used by the review stage to build error patterns for self-healing.
 */

import type { ErrorType, ErrorClassification, PipelineStage } from '../types';

// ============================================================================
// Error Pattern Matchers
// ============================================================================

interface ErrorPattern {
  type: ErrorType;
  patterns: RegExp[];
  description: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    type: 'prompt_ambiguity',
    patterns: [
      /ambiguous|unclear|confusing|conflicting instructions/i,
      /didn't understand|couldn't determine|not sure what/i,
      /multiple interpretations|vague requirement/i,
    ],
    description: 'LLM misunderstood requirements due to ambiguous prompting',
  },
  {
    type: 'missing_context',
    patterns: [
      /file not found|no such file|cannot find module/i,
      /not found in|does not exist|missing import/i,
      /unable to locate|couldn't find the/i,
      /context.*missing|need.*more.*information/i,
    ],
    description: 'LLM needed files or context that was not provided',
  },
  {
    type: 'tool_failure',
    patterns: [
      /edit.*failed|write.*failed|tool.*error/i,
      /failed to apply|patch.*rejected/i,
      /could not modify|unable to edit/i,
      /search.*returned.*no results/i,
      /API failed:?\s*\d{3}|execution.*failed:?\s*\d{3}/i,
      /failed to read requirement|requirement.*not found/i,
      /cli execution (?:error|aborted)/i,
    ],
    description: 'CLI tool, API call, or requirement file access failed',
  },
  {
    type: 'timeout',
    patterns: [
      /timeout|timed out|exceeded.*time/i,
      /too long|max.*duration|deadline exceeded/i,
      /process.*killed|signal.*term/i,
    ],
    description: 'Execution took too long and was terminated',
  },
  {
    type: 'permission_error',
    patterns: [
      /permission denied|access denied|forbidden/i,
      /eacces|eperm|not authorized/i,
      /read-only|cannot write/i,
    ],
    description: 'File system or API permission error',
  },
  {
    type: 'dependency_missing',
    patterns: [
      /module not found|cannot resolve|package.*not installed/i,
      /missing dependency|peer dependency|unmet dependency/i,
      /npm.*err|yarn.*error.*not found/i,
      /import.*error|require.*error/i,
    ],
    description: 'Missing npm package, API endpoint, or other dependency',
  },
  {
    type: 'invalid_output',
    patterns: [
      /parse.*error|invalid json|unexpected token/i,
      /syntax error|malformed|corrupt/i,
      /expected.*but.*got|type.*error/i,
      /compilation.*failed|build.*error/i,
      /zero ideas generated|generated 0 ideas|0 ideas/i,
    ],
    description: 'LLM output was invalid, empty, or could not be parsed',
  },
];

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classify an error message into a structured ErrorClassification.
 */
export function classifyError(
  errorMessage: string,
  stage: PipelineStage,
  pipelineRunId: string,
  taskId?: string,
  scanType?: string
): ErrorClassification {
  const errorType = detectErrorType(errorMessage);

  return {
    id: generateErrorId(),
    pipelineRunId,
    stage,
    errorType,
    errorMessage: truncateMessage(errorMessage, 500),
    taskId,
    scanType,
    occurrenceCount: 1,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    resolved: false,
  };
}

/**
 * Detect error type from message content using pattern matching.
 */
export function detectErrorType(errorMessage: string): ErrorType {
  for (const pattern of ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(errorMessage)) {
        return pattern.type;
      }
    }
  }
  return 'unknown';
}

/**
 * Get human-readable description for an error type.
 */
export function getErrorDescription(errorType: ErrorType): string {
  const pattern = ERROR_PATTERNS.find((p) => p.type === errorType);
  return pattern?.description || 'Unclassified error';
}

/**
 * Group error classifications by type for pattern analysis.
 */
export function groupErrorsByType(
  errors: ErrorClassification[]
): Map<ErrorType, ErrorClassification[]> {
  const groups = new Map<ErrorType, ErrorClassification[]>();

  for (const error of errors) {
    const existing = groups.get(error.errorType) || [];
    existing.push(error);
    groups.set(error.errorType, existing);
  }

  return groups;
}

/**
 * Merge a new error into existing classifications.
 * If same type+stage already exists, increment occurrence count.
 */
export function mergeError(
  existing: ErrorClassification[],
  newError: ErrorClassification
): ErrorClassification[] {
  const match = existing.find(
    (e) =>
      e.errorType === newError.errorType &&
      e.stage === newError.stage &&
      !e.resolved
  );

  if (match) {
    return existing.map((e) =>
      e.id === match.id
        ? {
            ...e,
            occurrenceCount: e.occurrenceCount + 1,
            lastSeen: new Date().toISOString(),
            errorMessage: newError.errorMessage,
          }
        : e
    );
  }

  return [...existing, newError];
}

// ============================================================================
// Helpers
// ============================================================================

function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function truncateMessage(msg: string, maxLength: number): string {
  if (msg.length <= maxLength) return msg;
  return msg.slice(0, maxLength - 3) + '...';
}
