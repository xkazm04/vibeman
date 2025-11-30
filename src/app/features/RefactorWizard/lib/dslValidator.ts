/**
 * DSL Validator
 *
 * Validates RefactorSpec configurations and provides helpful error messages.
 */

import {
  RefactorSpec,
  TransformationRule,
  ScopeConfig,
  PatternConfig,
  ReplacementConfig,
  ExecutionConfig,
  ValidationConfig,
  ValidationError,
} from './dslTypes';

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Validate a complete RefactorSpec
 */
export function validateSpec(spec: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!spec || typeof spec !== 'object') {
    errors.push({
      path: '',
      message: 'Spec must be an object',
      severity: 'error',
    });
    return errors;
  }

  const s = spec as Record<string, unknown>;

  // Version validation
  if (s.version !== '1.0') {
    errors.push({
      path: 'version',
      message: `Invalid version "${s.version}". Expected "1.0"`,
      severity: 'error',
    });
  }

  // Name validation
  if (!s.name || typeof s.name !== 'string') {
    errors.push({
      path: 'name',
      message: 'Name is required and must be a string',
      severity: 'error',
    });
  } else if (s.name.length < 3) {
    errors.push({
      path: 'name',
      message: 'Name must be at least 3 characters',
      severity: 'warning',
    });
  }

  // Scope validation
  if (!s.scope || typeof s.scope !== 'object') {
    errors.push({
      path: 'scope',
      message: 'Scope is required',
      severity: 'error',
    });
  } else {
    errors.push(...validateScope(s.scope as ScopeConfig));
  }

  // Transformations validation
  if (!Array.isArray(s.transformations)) {
    errors.push({
      path: 'transformations',
      message: 'Transformations must be an array',
      severity: 'error',
    });
  } else if (s.transformations.length === 0) {
    errors.push({
      path: 'transformations',
      message: 'At least one transformation rule is required',
      severity: 'warning',
    });
  } else {
    s.transformations.forEach((rule, index) => {
      errors.push(...validateRule(rule, `transformations[${index}]`));
    });

    // Check for duplicate rule IDs
    const ruleIds = s.transformations.map((r: TransformationRule) => r.id);
    const duplicates = ruleIds.filter((id: string, index: number) => ruleIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push({
        path: 'transformations',
        message: `Duplicate rule IDs found: ${Array.from(new Set(duplicates)).join(', ')}`,
        severity: 'error',
      });
    }
  }

  // Execution validation (optional)
  if (s.execution) {
    errors.push(...validateExecution(s.execution as ExecutionConfig));
  }

  // Validation config validation (optional)
  if (s.validation) {
    errors.push(...validateValidationConfig(s.validation as ValidationConfig));
  }

  return errors;
}

// ============================================================================
// SCOPE VALIDATION
// ============================================================================

function validateScope(scope: ScopeConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(scope.include) || scope.include.length === 0) {
    errors.push({
      path: 'scope.include',
      message: 'At least one include pattern is required',
      severity: 'error',
    });
  } else {
    scope.include.forEach((pattern, index) => {
      if (typeof pattern !== 'string') {
        errors.push({
          path: `scope.include[${index}]`,
          message: 'Include pattern must be a string',
          severity: 'error',
        });
      } else if (!isValidGlobPattern(pattern)) {
        errors.push({
          path: `scope.include[${index}]`,
          message: `Invalid glob pattern: ${pattern}`,
          severity: 'warning',
        });
      }
    });
  }

  if (scope.exclude) {
    scope.exclude.forEach((pattern, index) => {
      if (typeof pattern !== 'string') {
        errors.push({
          path: `scope.exclude[${index}]`,
          message: 'Exclude pattern must be a string',
          severity: 'error',
        });
      }
    });
  }

  const validFileTypes = ['tsx', 'ts', 'jsx', 'js', 'css', 'scss', 'json', 'md'];
  if (scope.fileTypes) {
    scope.fileTypes.forEach((ft, index) => {
      if (!validFileTypes.includes(ft)) {
        errors.push({
          path: `scope.fileTypes[${index}]`,
          message: `Invalid file type: ${ft}. Valid types: ${validFileTypes.join(', ')}`,
          severity: 'error',
        });
      }
    });
  }

  return errors;
}

// ============================================================================
// RULE VALIDATION
// ============================================================================

function validateRule(rule: unknown, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!rule || typeof rule !== 'object') {
    errors.push({
      path,
      message: 'Rule must be an object',
      severity: 'error',
    });
    return errors;
  }

  const r = rule as TransformationRule;

  // ID validation
  if (!r.id || typeof r.id !== 'string') {
    errors.push({
      path: `${path}.id`,
      message: 'Rule ID is required',
      severity: 'error',
    });
  }

  // Name validation
  if (!r.name || typeof r.name !== 'string') {
    errors.push({
      path: `${path}.name`,
      message: 'Rule name is required',
      severity: 'error',
    });
  }

  // Type validation
  const validTypes = [
    'find-replace', 'regex-replace', 'ast-transform',
    'extract-component', 'extract-hook', 'extract-utility',
    'inline', 'move-file', 'rename-export',
    'upgrade-syntax', 'migrate-import', 'migrate-api',
    'add-type', 'add-error-handling', 'add-memoization',
    'remove-dead-code', 'consolidate', 'custom',
  ];

  if (!r.type || !validTypes.includes(r.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid transformation type. Valid types: ${validTypes.join(', ')}`,
      severity: 'error',
    });
  }

  // Pattern validation
  if (!r.pattern || typeof r.pattern !== 'object') {
    errors.push({
      path: `${path}.pattern`,
      message: 'Pattern configuration is required',
      severity: 'error',
    });
  } else {
    errors.push(...validatePattern(r.pattern, `${path}.pattern`));
  }

  // Replacement validation (required for most types)
  const typesRequiringReplacement = [
    'find-replace', 'regex-replace', 'migrate-import', 'migrate-api',
  ];
  if (typesRequiringReplacement.includes(r.type) && !r.replacement) {
    errors.push({
      path: `${path}.replacement`,
      message: `Replacement configuration is required for ${r.type} transformations`,
      severity: 'error',
    });
  }

  if (r.replacement) {
    errors.push(...validateReplacement(r.replacement, `${path}.replacement`, r.type));
  }

  // Priority validation
  if (r.priority !== undefined && (typeof r.priority !== 'number' || r.priority < 0)) {
    errors.push({
      path: `${path}.priority`,
      message: 'Priority must be a non-negative number',
      severity: 'warning',
    });
  }

  // Impact validation
  const validImpacts = ['low', 'medium', 'high', 'critical'];
  if (r.impact && !validImpacts.includes(r.impact)) {
    errors.push({
      path: `${path}.impact`,
      message: `Invalid impact level. Valid levels: ${validImpacts.join(', ')}`,
      severity: 'warning',
    });
  }

  return errors;
}

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

function validatePattern(pattern: PatternConfig, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const validTypes = ['text', 'regex', 'ast', 'semantic'];
  if (!pattern.type || !validTypes.includes(pattern.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid pattern type. Valid types: ${validTypes.join(', ')}`,
      severity: 'error',
    });
  }

  if (!pattern.match || typeof pattern.match !== 'string') {
    errors.push({
      path: `${path}.match`,
      message: 'Pattern match is required',
      severity: 'error',
    });
  } else if (pattern.type === 'regex') {
    try {
      new RegExp(pattern.match);
    } catch (e) {
      errors.push({
        path: `${path}.match`,
        message: `Invalid regex pattern: ${(e as Error).message}`,
        severity: 'error',
      });
    }
  }

  return errors;
}

// ============================================================================
// REPLACEMENT VALIDATION
// ============================================================================

function validateReplacement(
  replacement: ReplacementConfig,
  path: string,
  ruleType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Template is required for find-replace and regex-replace
  if (['find-replace', 'regex-replace'].includes(ruleType)) {
    if (!replacement.template && replacement.template !== '') {
      errors.push({
        path: `${path}.template`,
        message: 'Template is required for find-replace and regex-replace',
        severity: 'error',
      });
    }
  }

  // Target path is required for extract and move operations
  const extractTypes = ['extract-component', 'extract-hook', 'extract-utility', 'move-file'];
  if (extractTypes.includes(ruleType) && !replacement.targetPath) {
    errors.push({
      path: `${path}.targetPath`,
      message: `Target path is required for ${ruleType}`,
      severity: 'error',
    });
  }

  // New import is required for migrate-import
  if (ruleType === 'migrate-import' && !replacement.newImport) {
    errors.push({
      path: `${path}.newImport`,
      message: 'New import path is required for migrate-import',
      severity: 'error',
    });
  }

  // Validate addImports structure
  if (replacement.addImports) {
    replacement.addImports.forEach((imp, index) => {
      if (!imp.from || typeof imp.from !== 'string') {
        errors.push({
          path: `${path}.addImports[${index}].from`,
          message: 'Import source is required',
          severity: 'error',
        });
      }
      if (!imp.named && !imp.default) {
        errors.push({
          path: `${path}.addImports[${index}]`,
          message: 'Either named or default import is required',
          severity: 'error',
        });
      }
    });
  }

  return errors;
}

// ============================================================================
// EXECUTION VALIDATION
// ============================================================================

function validateExecution(execution: ExecutionConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  const validModes = ['preview', 'apply', 'auto'];
  if (execution.mode && !validModes.includes(execution.mode)) {
    errors.push({
      path: 'execution.mode',
      message: `Invalid execution mode. Valid modes: ${validModes.join(', ')}`,
      severity: 'error',
    });
  }

  if (execution.parallelism !== undefined) {
    if (typeof execution.parallelism !== 'number' || execution.parallelism < 1) {
      errors.push({
        path: 'execution.parallelism',
        message: 'Parallelism must be a positive number',
        severity: 'warning',
      });
    }
  }

  // Warning for auto mode without tests
  if (execution.mode === 'auto' && !execution.runTestsAfterEach) {
    errors.push({
      path: 'execution',
      message: 'Auto mode without runTestsAfterEach is risky',
      severity: 'warning',
    });
  }

  // Warning for commitAfterEach without tests
  if (execution.commitAfterEach && !execution.runTestsAfterEach) {
    errors.push({
      path: 'execution',
      message: 'Committing without running tests is not recommended',
      severity: 'warning',
    });
  }

  return errors;
}

// ============================================================================
// VALIDATION CONFIG VALIDATION
// ============================================================================

function validateValidationConfig(validation: ValidationConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (validation.minCoverage !== undefined) {
    if (typeof validation.minCoverage !== 'number' ||
        validation.minCoverage < 0 ||
        validation.minCoverage > 100) {
      errors.push({
        path: 'validation.minCoverage',
        message: 'Minimum coverage must be a number between 0 and 100',
        severity: 'error',
      });
    }
  }

  if (validation.customCommands) {
    validation.customCommands.forEach((cmd, index) => {
      if (typeof cmd !== 'string' || cmd.trim() === '') {
        errors.push({
          path: `validation.customCommands[${index}]`,
          message: 'Custom command must be a non-empty string',
          severity: 'error',
        });
      }
    });
  }

  return errors;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid glob pattern
 */
function isValidGlobPattern(pattern: string): boolean {
  // Basic validation - check for common glob syntax
  if (!pattern || pattern.length === 0) return false;

  // Check for invalid characters
  const invalidChars = ['<', '>', '|', '"', '\0'];
  for (const char of invalidChars) {
    if (pattern.includes(char)) return false;
  }

  return true;
}

/**
 * Get error count by severity
 */
export function getErrorCounts(errors: ValidationError[]): { errors: number; warnings: number } {
  return {
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warning').length,
  };
}

/**
 * Check if spec has blocking errors
 */
export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some(e => e.severity === 'error');
}

/**
 * Format errors for display
 */
export function formatErrors(errors: ValidationError[]): string {
  return errors
    .map(e => `[${e.severity.toUpperCase()}] ${e.path}: ${e.message}`)
    .join('\n');
}
