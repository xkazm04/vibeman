/**
 * Git Configuration Validation Module
 *
 * Provides strict TypeScript validation for git configuration at runtime.
 * Prevents shell injection, validates commit message templates, and enforces
 * configuration state transitions.
 *
 * @module gitConfigValidator
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a single validation check
 */
export interface GitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Combined validation result with detailed breakdown
 */
export interface GitValidationReport extends GitValidationResult {
  commandResults: GitValidationResult[];
  templateResult: GitValidationResult;
  stateResult: GitValidationResult;
}

/**
 * Git configuration state for transition validation
 */
export type GitConfigState = 'disabled' | 'enabled' | 'executing' | 'error';

/**
 * Allowed state transitions
 */
export type GitStateTransition = {
  from: GitConfigState;
  to: GitConfigState;
};

/**
 * Validated git configuration (type-safe after validation passes)
 */
export interface ValidatedGitConfig {
  commands: readonly string[];
  commitMessageTemplate: string;
  readonly _validated: true;
}

/**
 * Raw git configuration input (before validation)
 */
export interface RawGitConfig {
  commands?: unknown;
  commitMessageTemplate?: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed git command prefixes (whitelist approach)
 */
const ALLOWED_GIT_COMMANDS = [
  'git add',
  'git commit',
  'git push',
  'git pull',
  'git fetch',
  'git checkout',
  'git branch',
  'git status',
  'git log',
  'git diff',
  'git merge',
  'git rebase',
  'git stash',
  'git tag',
  'git reset',
  'git clean',
  'git remote',
] as const;

/**
 * Dangerous shell characters/patterns that could enable injection
 */
const SHELL_INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /[;&|`$]/, description: 'Shell metacharacters (;, &, |, `, $)' },
  { pattern: /\$\(/, description: 'Command substitution $()' },
  { pattern: /`[^`]*`/, description: 'Backtick command substitution' },
  { pattern: /\|{1,2}/, description: 'Pipe operators' },
  { pattern: />{1,2}/, description: 'Redirect operators (>)' },
  { pattern: /<{1,2}/, description: 'Redirect operators (<)' },
  { pattern: /\n/, description: 'Newline characters' },
  { pattern: /\r/, description: 'Carriage return characters' },
  { pattern: /\\x[0-9a-fA-F]{2}/, description: 'Hex escape sequences' },
  { pattern: /\\u[0-9a-fA-F]{4}/, description: 'Unicode escape sequences' },
  { pattern: /&&/, description: 'Shell AND operator' },
  { pattern: /\|\|/, description: 'Shell OR operator' },
];

/**
 * Valid template variables for commit messages
 */
const VALID_TEMPLATE_VARIABLES = [
  '{commitMessage}',
  '{requirementName}',
  '{projectName}',
  '{branch}',
  '{timestamp}',
] as const;

/**
 * Allowed state transitions
 */
const ALLOWED_STATE_TRANSITIONS: GitStateTransition[] = [
  { from: 'disabled', to: 'enabled' },
  { from: 'enabled', to: 'disabled' },
  { from: 'enabled', to: 'executing' },
  { from: 'executing', to: 'enabled' },
  { from: 'executing', to: 'error' },
  { from: 'error', to: 'enabled' },
  { from: 'error', to: 'disabled' },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates an empty validation result
 */
function createEmptyResult(): GitValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Merges multiple validation results into one
 */
function mergeResults(results: GitValidationResult[]): GitValidationResult {
  return results.reduce(
    (acc, result) => ({
      valid: acc.valid && result.valid,
      errors: [...acc.errors, ...result.errors],
      warnings: [...acc.warnings, ...result.warnings],
    }),
    createEmptyResult()
  );
}

// ============================================================================
// Command Validators
// ============================================================================

/**
 * Validates that a command starts with an allowed git prefix
 */
export function validateCommandPrefix(command: string, index: number): GitValidationResult {
  const result = createEmptyResult();
  const trimmed = command.trim().toLowerCase();

  const hasValidPrefix = ALLOWED_GIT_COMMANDS.some(prefix =>
    trimmed.startsWith(prefix)
  );

  if (!hasValidPrefix) {
    result.valid = false;
    result.errors.push(
      `Command ${index + 1}: Must start with a valid git command. ` +
      `Allowed: ${ALLOWED_GIT_COMMANDS.join(', ')}`
    );
  }

  return result;
}

/**
 * Validates that a command doesn't contain shell injection patterns
 */
export function validateNoShellInjection(command: string, index: number): GitValidationResult {
  const result = createEmptyResult();

  // Skip validation for template variables within quotes
  // e.g., git commit -m "{commitMessage}" is valid
  const commandWithoutTemplates = command.replace(/\{[a-zA-Z]+\}/g, 'PLACEHOLDER');

  for (const { pattern, description } of SHELL_INJECTION_PATTERNS) {
    if (pattern.test(commandWithoutTemplates)) {
      result.valid = false;
      result.errors.push(
        `Command ${index + 1}: Contains potentially dangerous pattern: ${description}. ` +
        `Only simple git commands are allowed.`
      );
    }
  }

  return result;
}

/**
 * Validates that command-specific template variables are correct
 */
export function validateCommandTemplateVars(command: string, index: number): GitValidationResult {
  const result = createEmptyResult();

  // Find all template variables in the command
  const templateVarPattern = /\{([a-zA-Z]+)\}/g;
  let match;

  while ((match = templateVarPattern.exec(command)) !== null) {
    const fullVar = match[0];
    const validVars = VALID_TEMPLATE_VARIABLES as readonly string[];

    if (!validVars.includes(fullVar)) {
      result.valid = false;
      result.errors.push(
        `Command ${index + 1}: Invalid template variable "${fullVar}". ` +
        `Valid variables: ${VALID_TEMPLATE_VARIABLES.join(', ')}`
      );
    }
  }

  return result;
}

/**
 * Validates a single git command
 */
export function validateGitCommand(command: string, index: number): GitValidationResult {
  // Check for empty commands
  if (!command || typeof command !== 'string' || command.trim() === '') {
    return {
      valid: false,
      errors: [`Command ${index + 1}: Cannot be empty`],
      warnings: [],
    };
  }

  const results = [
    validateCommandPrefix(command, index),
    validateNoShellInjection(command, index),
    validateCommandTemplateVars(command, index),
  ];

  return mergeResults(results);
}

/**
 * Validates all git commands in a configuration
 */
export function validateGitCommands(commands: unknown): GitValidationResult {
  const result = createEmptyResult();

  // Type validation
  if (!Array.isArray(commands)) {
    result.valid = false;
    result.errors.push('Commands must be an array of strings');
    return result;
  }

  if (commands.length === 0) {
    result.warnings.push('No commands configured. Git operations will be skipped.');
    return result;
  }

  // Validate each command
  const commandResults = commands.map((cmd, index) => {
    if (typeof cmd !== 'string') {
      return {
        valid: false,
        errors: [`Command ${index + 1}: Must be a string, got ${typeof cmd}`],
        warnings: [],
      };
    }
    return validateGitCommand(cmd, index);
  });

  return mergeResults(commandResults);
}

// ============================================================================
// Commit Message Template Validators
// ============================================================================

/**
 * Validates commit message template for proper variable syntax
 */
export function validateCommitMessageTemplate(template: unknown): GitValidationResult {
  const result = createEmptyResult();

  // Type validation
  if (typeof template !== 'string') {
    result.valid = false;
    result.errors.push(`Commit message template must be a string, got ${typeof template}`);
    return result;
  }

  // Empty template check
  if (template.trim() === '') {
    result.valid = false;
    result.errors.push('Commit message template cannot be empty');
    return result;
  }

  // Length check
  if (template.length > 500) {
    result.valid = false;
    result.errors.push('Commit message template cannot exceed 500 characters');
    return result;
  }

  // Find all template variables
  const templateVarPattern = /\{([a-zA-Z]+)\}/g;
  let match;
  let hasValidVariable = false;

  while ((match = templateVarPattern.exec(template)) !== null) {
    const fullVar = match[0];
    const validVars = VALID_TEMPLATE_VARIABLES as readonly string[];

    if (!validVars.includes(fullVar)) {
      result.valid = false;
      result.errors.push(
        `Invalid template variable "${fullVar}". ` +
        `Valid variables: ${VALID_TEMPLATE_VARIABLES.join(', ')}`
      );
    } else {
      hasValidVariable = true;
    }
  }

  // Check for malformed template variables
  const malformedPattern = /\{[^}]*$/;
  if (malformedPattern.test(template)) {
    result.valid = false;
    result.errors.push('Malformed template variable: unclosed brace detected');
  }

  // Warn if no variables used
  if (!hasValidVariable && result.valid) {
    result.warnings.push(
      'Template contains no variables. Consider using ' +
      `${VALID_TEMPLATE_VARIABLES.join(', ')} for dynamic content.`
    );
  }

  // Check for shell injection in template (but allow template variables)
  const templateWithoutVars = template.replace(/\{[a-zA-Z]+\}/g, 'PLACEHOLDER');
  for (const { pattern, description } of SHELL_INJECTION_PATTERNS) {
    if (pattern.test(templateWithoutVars)) {
      result.valid = false;
      result.errors.push(
        `Commit message template contains dangerous pattern: ${description}`
      );
    }
  }

  return result;
}

// ============================================================================
// State Transition Validators
// ============================================================================

/**
 * Validates a state transition
 */
export function validateStateTransition(
  from: GitConfigState,
  to: GitConfigState
): GitValidationResult {
  const result = createEmptyResult();

  // Same state is always allowed (no-op)
  if (from === to) {
    return result;
  }

  const isAllowed = ALLOWED_STATE_TRANSITIONS.some(
    transition => transition.from === from && transition.to === to
  );

  if (!isAllowed) {
    result.valid = false;
    result.errors.push(
      `Invalid state transition: ${from} -> ${to}. ` +
      `Allowed transitions from "${from}": ${
        ALLOWED_STATE_TRANSITIONS
          .filter(t => t.from === from)
          .map(t => t.to)
          .join(', ') || 'none'
      }`
    );
  }

  return result;
}

/**
 * Creates a state machine for git config state management
 */
export function createGitConfigStateMachine(initialState: GitConfigState = 'disabled') {
  let currentState = initialState;

  return {
    getState: () => currentState,

    transition: (to: GitConfigState): GitValidationResult => {
      const result = validateStateTransition(currentState, to);
      if (result.valid) {
        currentState = to;
      }
      return result;
    },

    canTransitionTo: (to: GitConfigState): boolean => {
      return validateStateTransition(currentState, to).valid;
    },

    reset: () => {
      currentState = initialState;
    },
  };
}

// ============================================================================
// Complete Configuration Validator
// ============================================================================

/**
 * Validates a complete git configuration object
 *
 * @param config - Raw configuration to validate
 * @returns Detailed validation report
 *
 * @example
 * const result = validateGitConfig({
 *   commands: ['git add .', 'git commit -m "{commitMessage}"'],
 *   commitMessageTemplate: 'Auto-commit: {requirementName}'
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateGitConfig(config: RawGitConfig): GitValidationReport {
  const commandResults: GitValidationResult[] = [];

  // Validate commands array
  const commandsResult = validateGitCommands(config.commands);

  // Get individual command results for detailed reporting
  if (Array.isArray(config.commands)) {
    for (let i = 0; i < config.commands.length; i++) {
      const cmd = config.commands[i];
      if (typeof cmd === 'string') {
        commandResults.push(validateGitCommand(cmd, i));
      } else {
        commandResults.push({
          valid: false,
          errors: [`Command ${i + 1}: Must be a string`],
          warnings: [],
        });
      }
    }
  }

  // Validate commit message template
  const templateResult = validateCommitMessageTemplate(config.commitMessageTemplate);

  // State validation (default to enabled state)
  const stateResult = createEmptyResult();

  // Combine all results
  const combined = mergeResults([commandsResult, templateResult, stateResult]);

  return {
    ...combined,
    commandResults,
    templateResult,
    stateResult,
  };
}

/**
 * Validates and returns a type-safe validated configuration
 *
 * @param config - Raw configuration to validate
 * @returns Validated configuration or throws
 *
 * @throws Error if validation fails
 */
export function validateAndTransformConfig(config: RawGitConfig): ValidatedGitConfig {
  const report = validateGitConfig(config);

  if (!report.valid) {
    throw new GitConfigValidationError(report);
  }

  return {
    commands: (config.commands as string[]).map(cmd => cmd.trim()),
    commitMessageTemplate: (config.commitMessageTemplate as string).trim(),
    _validated: true,
  };
}

/**
 * Safely validates configuration without throwing
 *
 * @param config - Raw configuration to validate
 * @returns Tuple of [validatedConfig, null] or [null, report]
 */
export function safeValidateConfig(
  config: RawGitConfig
): [ValidatedGitConfig, null] | [null, GitValidationReport] {
  const report = validateGitConfig(config);

  if (!report.valid) {
    return [null, report];
  }

  const validated: ValidatedGitConfig = {
    commands: (config.commands as string[]).map(cmd => cmd.trim()),
    commitMessageTemplate: (config.commitMessageTemplate as string).trim(),
    _validated: true,
  };

  return [validated, null];
}

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * Custom error for git configuration validation failures
 */
export class GitConfigValidationError extends Error {
  public readonly report: GitValidationReport;

  constructor(report: GitValidationReport) {
    const errorSummary = report.errors.slice(0, 3).join('; ');
    const remainingCount = Math.max(0, report.errors.length - 3);
    const message = remainingCount > 0
      ? `${errorSummary} (and ${remainingCount} more errors)`
      : errorSummary;

    super(`Git configuration validation failed: ${message}`);
    this.name = 'GitConfigValidationError';
    this.report = report;
  }
}

// ============================================================================
// Exports for External Use
// ============================================================================

export {
  ALLOWED_GIT_COMMANDS,
  VALID_TEMPLATE_VARIABLES,
  ALLOWED_STATE_TRANSITIONS,
};
