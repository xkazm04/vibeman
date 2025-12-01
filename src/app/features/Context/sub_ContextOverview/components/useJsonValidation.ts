/**
 * Generic JSON Validation Hook
 *
 * Provides reusable JSON parsing and validation logic for test scenario editing.
 * Replaces duplicated parsing utilities across the context module.
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UseJsonValidationOptions<T> {
  /** Custom validation function for parsed data */
  validate?: (data: unknown) => ValidationResult<T>;
  /** Initial value */
  initialValue?: string;
}

export interface UseJsonValidationReturn<T> {
  /** Raw JSON string value */
  value: string;
  /** Parsed data (undefined if invalid) */
  parsedData: T | undefined;
  /** Current validation error (null if valid) */
  error: string | null;
  /** Whether the current value is valid JSON */
  isValid: boolean;
  /** Update the raw value and re-validate */
  setValue: (newValue: string) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Parse a string and return validation result */
  parse: (text: string) => ValidationResult<T>;
}

// ============================================================================
// Test Step Types
// ============================================================================

export type TestStepType = 'navigate' | 'wait' | 'click' | 'type' | 'scroll' | 'screenshot';

export interface TestStep {
  type: TestStepType;
  url?: string;
  delay?: number;
  selector?: string;
  text?: string;
  scrollY?: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_STEP_TYPES: TestStepType[] = ['navigate', 'wait', 'click', 'type', 'scroll', 'screenshot'];

/**
 * Validates a single test step
 */
export function isValidTestStep(step: unknown): step is TestStep {
  if (!step || typeof step !== 'object') return false;

  const s = step as Record<string, unknown>;

  if (typeof s.type !== 'string' || !VALID_STEP_TYPES.includes(s.type as TestStepType)) {
    return false;
  }

  switch (s.type) {
    case 'navigate':
      return typeof s.url === 'string' && s.url.length > 0;
    case 'wait':
      return s.delay === undefined || (typeof s.delay === 'number' && s.delay >= 0);
    case 'click':
      return typeof s.selector === 'string' && s.selector.length > 0;
    case 'type':
      return typeof s.selector === 'string' && s.selector.length > 0 && typeof s.text === 'string';
    case 'scroll':
      return s.scrollY === undefined || typeof s.scrollY === 'number';
    case 'screenshot':
      return true;
    default:
      return false;
  }
}

/**
 * Validates an array of test steps and returns detailed errors
 */
export function validateTestSteps(steps: unknown[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(steps)) {
    return { valid: false, errors: ['Input must be an array'] };
  }

  steps.forEach((step, index) => {
    if (!isValidTestStep(step)) {
      const s = step as Record<string, unknown>;
      if (!s || typeof s !== 'object') {
        errors.push(`Step ${index + 1}: Invalid step format (must be an object)`);
      } else if (!s.type) {
        errors.push(`Step ${index + 1}: Missing 'type' field`);
      } else {
        errors.push(`Step ${index + 1}: Invalid configuration for type '${s.type}'`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Generates user-friendly error messages for JSON parsing failures
 */
function getFriendlyParseError(error: unknown, text: string): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';

  if (errorMessage.includes('Unexpected token')) {
    const match = errorMessage.match(/position (\d+)/);
    if (match) {
      const position = parseInt(match[1], 10);
      const context = text.substring(Math.max(0, position - 20), position + 20);
      return `Syntax error near: "...${context}..."`;
    }
    return 'Invalid JSON syntax - check for missing quotes, commas, or brackets';
  }

  if (errorMessage.includes('Unexpected end')) {
    return 'Incomplete JSON - missing closing brackets or braces';
  }

  return `JSON parse error: ${errorMessage}`;
}

// ============================================================================
// Built-in Validators
// ============================================================================

/**
 * Default validator for test scenario arrays
 */
export function testScenarioValidator(data: unknown): ValidationResult<TestStep[]> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      error: 'Test scenario must be an array of steps',
    };
  }

  const validation = validateTestSteps(data);

  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid test steps:\n${validation.errors.join('\n')}`,
    };
  }

  return {
    success: true,
    data: data as TestStep[],
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Generic JSON validation hook for test scenario editing
 *
 * @example
 * ```tsx
 * const { value, parsedData, error, isValid, setValue } = useJsonValidation<TestStep[]>({
 *   validate: testScenarioValidator,
 *   initialValue: existingScenario,
 * });
 * ```
 */
export function useJsonValidation<T = unknown>(
  options: UseJsonValidationOptions<T> = {}
): UseJsonValidationReturn<T> {
  const { validate, initialValue = '' } = options;

  const [value, setValueInternal] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parse and validate a JSON string
   */
  const parse = useCallback((text: string): ValidationResult<T> => {
    if (!text || text.trim() === '') {
      return { success: true, data: undefined };
    }

    try {
      const parsed = JSON.parse(text.trim());

      if (validate) {
        return validate(parsed);
      }

      return { success: true, data: parsed as T };
    } catch (e) {
      return {
        success: false,
        error: getFriendlyParseError(e, text),
      };
    }
  }, [validate]);

  /**
   * Update value and re-validate
   */
  const setValue = useCallback((newValue: string) => {
    setValueInternal(newValue);

    if (!newValue || newValue.trim() === '') {
      setError(null);
      return;
    }

    const result = parse(newValue);
    setError(result.success ? null : result.error || 'Invalid JSON');
  }, [parse]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Memoized parsed data
   */
  const parsedData = useMemo(() => {
    if (!value || value.trim() === '') return undefined;

    const result = parse(value);
    return result.success ? result.data : undefined;
  }, [value, parse]);

  /**
   * Memoized validity check
   */
  const isValid = useMemo(() => {
    if (!value || value.trim() === '') return true;
    return parse(value).success;
  }, [value, parse]);

  return {
    value,
    parsedData,
    error,
    isValid,
    setValue,
    clearError,
    parse,
  };
}

export default useJsonValidation;
