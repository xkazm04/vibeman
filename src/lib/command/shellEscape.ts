/**
 * Shell Escape Utility
 *
 * Provides functions for safely escaping shell arguments and validating
 * command inputs to prevent command injection attacks.
 *
 * @module shellEscape
 */

/**
 * Dangerous shell characters that should never appear in command arguments
 */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>\\!*?#~'"]/;

/**
 * Pattern for valid alphanumeric arguments with common safe characters
 * Allows: alphanumeric, dash, underscore, dot, forward slash, space, @, :, =
 */
const SAFE_ARGUMENT_PATTERN = /^[a-zA-Z0-9\-_./\s@:=]+$/;

/**
 * Pattern for safe git branch names
 * Follows git's branch naming rules
 */
const SAFE_BRANCH_PATTERN = /^[a-zA-Z0-9\-_./]+$/;

/**
 * Pattern for safe commit messages
 * Allows common characters but blocks shell metacharacters
 */
const SAFE_COMMIT_MESSAGE_PATTERN = /^[a-zA-Z0-9\-_./\s,!?:;'"()[\]@#&+=]+$/;

/**
 * Result of argument validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Escapes a string for safe use in shell commands on Windows
 * Uses double-quote escaping rules for cmd.exe
 */
export function escapeWindowsArg(arg: string): string {
  // For Windows, we wrap in double quotes and escape internal double quotes
  // Also escape % to prevent environment variable expansion
  return `"${arg.replace(/"/g, '\\"').replace(/%/g, '%%')}"`;
}

/**
 * Escapes a string for safe use in shell commands on Unix
 * Uses single-quote escaping which is the safest approach
 */
export function escapeUnixArg(arg: string): string {
  // Single quotes prevent all interpretation except for single quotes themselves
  // To include a single quote, we end the quoted string, add an escaped quote, and start a new quoted string
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Escapes a string for safe use in shell commands (platform-aware)
 */
export function escapeShellArg(arg: string): string {
  if (process.platform === 'win32') {
    return escapeWindowsArg(arg);
  }
  return escapeUnixArg(arg);
}

/**
 * Validates that an argument is safe for shell execution without escaping
 * This is a strict validation for use when shell: false is not possible
 */
export function validateArgument(arg: string, context: string = 'argument'): ValidationResult {
  if (typeof arg !== 'string') {
    return {
      valid: false,
      error: `${context} must be a string`
    };
  }

  if (arg.length === 0) {
    return {
      valid: false,
      error: `${context} cannot be empty`
    };
  }

  if (arg.length > 1000) {
    return {
      valid: false,
      error: `${context} exceeds maximum length of 1000 characters`
    };
  }

  // Check for null bytes
  if (arg.includes('\0')) {
    return {
      valid: false,
      error: `${context} contains null bytes`
    };
  }

  // Check for newlines (can be used for command injection)
  if (arg.includes('\n') || arg.includes('\r')) {
    return {
      valid: false,
      error: `${context} contains newline characters`
    };
  }

  // Check for shell metacharacters
  if (SHELL_METACHARACTERS.test(arg)) {
    return {
      valid: false,
      error: `${context} contains shell metacharacters`
    };
  }

  return { valid: true, sanitized: arg };
}

/**
 * Validates that a string matches the safe argument pattern
 */
export function validateSafeArgument(arg: string, context: string = 'argument'): ValidationResult {
  const basicValidation = validateArgument(arg, context);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  if (!SAFE_ARGUMENT_PATTERN.test(arg)) {
    return {
      valid: false,
      error: `${context} contains characters not allowed in safe arguments`
    };
  }

  return { valid: true, sanitized: arg };
}

/**
 * Validates a git branch name
 */
export function validateBranchName(branch: string): ValidationResult {
  if (typeof branch !== 'string' || branch.length === 0) {
    return {
      valid: false,
      error: 'Branch name must be a non-empty string'
    };
  }

  if (branch.length > 255) {
    return {
      valid: false,
      error: 'Branch name exceeds maximum length of 255 characters'
    };
  }

  if (!SAFE_BRANCH_PATTERN.test(branch)) {
    return {
      valid: false,
      error: 'Branch name contains invalid characters'
    };
  }

  // Git-specific validation
  if (branch.startsWith('-')) {
    return {
      valid: false,
      error: 'Branch name cannot start with a dash'
    };
  }

  if (branch.endsWith('.lock') || branch.endsWith('.')) {
    return {
      valid: false,
      error: 'Branch name cannot end with .lock or .'
    };
  }

  if (branch.includes('..') || branch.includes('@{')) {
    return {
      valid: false,
      error: 'Branch name contains invalid sequences'
    };
  }

  return { valid: true, sanitized: branch };
}

/**
 * Validates a project name
 */
export function validateProjectName(name: string): ValidationResult {
  if (typeof name !== 'string' || name.length === 0) {
    return {
      valid: false,
      error: 'Project name must be a non-empty string'
    };
  }

  if (name.length > 255) {
    return {
      valid: false,
      error: 'Project name exceeds maximum length of 255 characters'
    };
  }

  // Allow alphanumeric, dash, underscore, dot, and space
  if (!/^[a-zA-Z0-9\-_. ]+$/.test(name)) {
    return {
      valid: false,
      error: 'Project name contains invalid characters'
    };
  }

  return { valid: true, sanitized: name };
}

/**
 * Validates a commit message
 * More permissive than other validations but still blocks dangerous patterns
 */
export function validateCommitMessage(message: string): ValidationResult {
  if (typeof message !== 'string' || message.length === 0) {
    return {
      valid: false,
      error: 'Commit message must be a non-empty string'
    };
  }

  if (message.length > 1000) {
    return {
      valid: false,
      error: 'Commit message exceeds maximum length of 1000 characters'
    };
  }

  // Check for null bytes
  if (message.includes('\0')) {
    return {
      valid: false,
      error: 'Commit message contains null bytes'
    };
  }

  // Allow newlines in commit messages (they're valid for multi-line messages)
  // but sanitize carriage returns
  const sanitized = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Block command substitution patterns
  if (/\$\(|`/.test(sanitized)) {
    return {
      valid: false,
      error: 'Commit message contains command substitution patterns'
    };
  }

  // Block shell operators
  if (/[;&|]/.test(sanitized)) {
    return {
      valid: false,
      error: 'Commit message contains shell operators'
    };
  }

  return { valid: true, sanitized };
}

/**
 * Sanitizes a file path by removing potentially dangerous characters
 */
export function sanitizeFilePath(filePath: string): ValidationResult {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return {
      valid: false,
      error: 'File path must be a non-empty string'
    };
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    return {
      valid: false,
      error: 'File path contains null bytes'
    };
  }

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Check for path traversal attempts
  if (normalized.includes('../') || normalized.includes('/..')) {
    return {
      valid: false,
      error: 'File path contains path traversal sequences'
    };
  }

  // Check for shell metacharacters (except forward slash)
  if (/[;&|`$(){}[\]<>\\!*?#~]/.test(normalized)) {
    return {
      valid: false,
      error: 'File path contains shell metacharacters'
    };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Builds an array of safe arguments for execFile
 * Validates each argument and returns null if any are invalid
 */
export function buildSafeArgs(
  args: Array<{ value: string; validator: (v: string) => ValidationResult }>
): string[] | null {
  const safeArgs: string[] = [];

  for (const arg of args) {
    const result = arg.validator(arg.value);
    if (!result.valid) {
      console.error(`Argument validation failed: ${result.error}`);
      return null;
    }
    safeArgs.push(result.sanitized!);
  }

  return safeArgs;
}

/**
 * Validates an array of arguments using a single validator
 */
export function validateArgs(
  args: string[],
  validator: (v: string) => ValidationResult = validateSafeArgument
): { valid: boolean; errors: string[]; sanitized: string[] } {
  const errors: string[] = [];
  const sanitized: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const result = validator(args[i]);
    if (!result.valid) {
      errors.push(`Argument ${i}: ${result.error}`);
    } else {
      sanitized.push(result.sanitized!);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}
