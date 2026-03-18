/**
 * Reusable input validators for API route request bodies.
 *
 * Each validator returns `null` on success or an error message string on
 * failure. Compose them freely inside route handlers with the shared
 * `validate()` helper that throws a `ValidationError` on first failure,
 * or use `validateRequestBody()` from `apiValidator.ts` for declarative
 * request-level validation.
 *
 * Validator categories:
 * - **Generic**: `validateString`, `validateBoolean`, `validateInteger`,
 *   `validateEnum`, `validateArray`, `validateObject` — configurable building blocks.
 * - **Domain-specific**: `validateProjectPath`, `validateProjectId`,
 *   `validateRequirementName`, etc. — pre-configured for specific fields.
 * - **Composite**: `validateGitConfig`, `validateSessionConfig` — validate
 *   nested object shapes used by multiple API routes.
 *
 * Builds on top of `@/lib/pathSecurity` for path-specific checks.
 */

import fs from 'fs';
import path from 'path';
import { validatePathTraversal } from '@/lib/pathSecurity';
import { ValidationError } from '@/lib/api/errorHandler';
import { VALID_IDEA_STATUSES } from '@/app/features/Ideas/lib/ideasHandlers';

// ── Generic validators ──────────────────────────────────────────────

/**
 * Validate that a value is a string, optionally enforcing non-empty and
 * a maximum length. Returns a curried validator when called with options.
 *
 * @param fieldName - Human-readable field name for error messages.
 * @param options.required - If true, rejects empty/whitespace-only strings. Default: true.
 * @param options.maxLength - Maximum allowed character count. Default: 1000.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * validateString('title', { maxLength: 500 })('hello') // null (valid)
 * validateString('title', { maxLength: 500 })('')       // 'title must not be empty'
 * ```
 */
export function validateString(
  fieldName: string,
  options: { required?: boolean; maxLength?: number } = {},
) {
  const { required = true, maxLength = 1000 } = options;
  return (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    if (required && value.trim().length === 0) {
      return `${fieldName} must not be empty`;
    }
    if (value.length > maxLength) {
      return `${fieldName} must be ${maxLength} characters or fewer`;
    }
    return null;
  };
}

/**
 * Validate that a value is a boolean (`true` or `false`).
 *
 * @param fieldName - Human-readable field name for error messages.
 * @returns `null` on success, or an error message string.
 *
 * @example
 * ```ts
 * validateBoolean('enabled')(true)  // null
 * validateBoolean('enabled')('yes') // 'enabled must be a boolean'
 * ```
 */
export function validateBoolean(fieldName: string) {
  return (value: unknown): string | null => {
    if (typeof value !== 'boolean') {
      return `${fieldName} must be a boolean`;
    }
    return null;
  };
}

/**
 * Validate that a value is an integer within an optional range.
 *
 * @param fieldName - Human-readable field name for error messages.
 * @param options.min - Minimum value (inclusive). Default: -Infinity.
 * @param options.max - Maximum value (inclusive). Default: Infinity.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * validateInteger('port', { min: 1, max: 65535 })(8080) // null
 * validateInteger('port', { min: 1, max: 65535 })(0)    // 'port must be between 1 and 65535'
 * ```
 */
export function validateInteger(
  fieldName: string,
  options: { min?: number; max?: number } = {},
) {
  const { min = -Infinity, max = Infinity } = options;
  return (value: unknown): string | null => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return `${fieldName} must be an integer`;
    }
    if (value < min || value > max) {
      return `${fieldName} must be between ${min} and ${max}`;
    }
    return null;
  };
}

/**
 * Validate that a value is one of a fixed set of allowed strings.
 *
 * @param fieldName - Human-readable field name for error messages.
 * @param allowed - Set or array of valid string values.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * validateEnum('status', ['active', 'archived'])('active') // null
 * validateEnum('status', ['active', 'archived'])('deleted') // 'status must be one of: active, archived'
 * ```
 */
export function validateEnum(
  fieldName: string,
  allowed: ReadonlyArray<string> | ReadonlySet<string>,
) {
  const values = allowed instanceof Set ? allowed : new Set(allowed);
  const display = [...values].join(', ');
  return (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    if (!values.has(value)) {
      return `${fieldName} must be one of: ${display}`;
    }
    return null;
  };
}

/**
 * Validate that a value is an array, optionally checking each item with
 * an item validator.
 *
 * @param fieldName - Human-readable field name for error messages.
 * @param options.itemValidator - Validator applied to each element. Default: none.
 * @param options.maxLength - Maximum number of items. Default: 100.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * validateArray('commands', { itemValidator: (v) => typeof v === 'string' ? null : 'must be string', maxLength: 20 })
 * ```
 */
export function validateArray(
  fieldName: string,
  options: {
    itemValidator?: (value: unknown) => string | null;
    maxLength?: number;
  } = {},
) {
  const { itemValidator, maxLength = 100 } = options;
  return (value: unknown): string | null => {
    if (!Array.isArray(value)) {
      return `${fieldName} must be an array`;
    }
    if (value.length > maxLength) {
      return `${fieldName} must have ${maxLength} or fewer entries`;
    }
    if (itemValidator) {
      for (let i = 0; i < value.length; i++) {
        const err = itemValidator(value[i]);
        if (err) return `${fieldName}[${i}]: ${err}`;
      }
    }
    return null;
  };
}

/**
 * Validate that a value is a plain object (not null, not an array).
 *
 * @param fieldName - Human-readable field name for error messages.
 * @returns A validator function `(value: unknown) => string | null`.
 */
export function validateObject(fieldName: string) {
  return (value: unknown): string | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${fieldName} must be an object`;
    }
    return null;
  };
}

// ── Domain-specific validators ──────────────────────────────────────

/** Allowed project types for structure scanning and initialization. */
export type ProjectType = 'nextjs' | 'fastapi';

const PROJECT_TYPES: ReadonlySet<string> = new Set<ProjectType>(['nextjs', 'fastapi']);

/** UUID v4 format (case-insensitive). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only word chars, hyphens, and dots — no path separators, null bytes, or
 * shell metacharacters. Max 255 chars (common FS limit).
 */
const FILENAME_SAFE_RE = /^[\w][\w.\-]{0,253}[\w]$/;

/**
 * Validate a project path: must be a non-empty absolute path, free of
 * traversal patterns, and point to a readable directory on disk.
 *
 * Checks performed:
 * 1. Type is string and non-empty
 * 2. No null bytes
 * 3. No path traversal sequences (via `pathSecurity`)
 * 4. Must be an absolute path (Unix or Windows)
 * 5. Must exist on disk as a readable directory
 *
 * @returns `null` if valid, or an error message describing the first failure.
 */
export function validateProjectPath(value: unknown): string | null {
  if (!value || typeof value !== 'string') {
    return 'projectPath is required and must be a string';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'projectPath must not be empty';
  }

  // Null-byte check
  if (trimmed.includes('\0')) {
    return 'projectPath contains invalid characters';
  }

  // Traversal check (delegates to pathSecurity)
  const traversalError = validatePathTraversal(trimmed);
  if (traversalError) return traversalError;

  // Must be absolute (Unix or Windows drive letter)
  const isAbsolute = path.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed);
  if (!isAbsolute) {
    return 'projectPath must be an absolute path';
  }

  // Must exist and be a readable directory
  try {
    const stat = fs.statSync(trimmed);
    if (!stat.isDirectory()) {
      return 'projectPath must be a directory';
    }
    fs.accessSync(trimmed, fs.constants.R_OK);
  } catch {
    return 'projectPath does not exist or is not readable';
  }

  return null;
}

/**
 * Validate a project type for structure scanning: must be `'nextjs'` or `'fastapi'`.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateProjectType(value: unknown): string | null {
  if (!value || typeof value !== 'string') {
    return 'projectType is required and must be a string';
  }
  if (!PROJECT_TYPES.has(value)) {
    return `projectType must be one of: ${[...PROJECT_TYPES].join(', ')}`;
  }
  return null;
}

/**
 * Validate a project ID: must be a valid UUID v4 string.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateProjectId(value: unknown): string | null {
  if (!value || typeof value !== 'string') {
    return 'projectId is required and must be a string';
  }
  if (!UUID_RE.test(value)) {
    return 'projectId must be a valid UUID';
  }
  return null;
}

/**
 * Validate a requirement / filename: must be filesystem-safe with no
 * path separators or shell metacharacters, and at most 255 characters.
 *
 * Allowed characters: alphanumeric, hyphens, underscores, dots.
 * Must start and end with a word character.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateRequirementName(value: unknown): string | null {
  if (!value || typeof value !== 'string') {
    return 'requirementName is required and must be a string';
  }
  if (value.length > 255) {
    return 'requirementName must be 255 characters or fewer';
  }
  if (!FILENAME_SAFE_RE.test(value)) {
    return 'requirementName must contain only alphanumeric characters, hyphens, underscores, and dots';
  }
  return null;
}

// ── Idea validators ─────────────────────────────────────────────────

/** Max lengths for idea text fields. */
const IDEA_TITLE_MAX = 500;
const IDEA_DESCRIPTION_MAX = 5000;
const IDEA_REASONING_MAX = 5000;
const IDEA_FEEDBACK_MAX = 2000;
const IDEA_SCAN_TYPE_MAX = 100;
const IDEA_CATEGORY_MAX = 100;

/**
 * Validate an idea title: non-empty string, max 500 chars.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateIdeaTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'title must be a string';
  }
  if (value.trim().length === 0) {
    return 'title must not be empty';
  }
  if (value.length > IDEA_TITLE_MAX) {
    return `title must be ${IDEA_TITLE_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate an idea description: string, max 5000 chars (may be empty).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateIdeaDescription(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'description must be a string';
  }
  if (value.length > IDEA_DESCRIPTION_MAX) {
    return `description must be ${IDEA_DESCRIPTION_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate idea reasoning: string, max 5000 chars (may be empty).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateIdeaReasoning(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'reasoning must be a string';
  }
  if (value.length > IDEA_REASONING_MAX) {
    return `reasoning must be ${IDEA_REASONING_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate idea user_feedback: string, max 2000 chars (may be empty).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateIdeaFeedback(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'user_feedback must be a string';
  }
  if (value.length > IDEA_FEEDBACK_MAX) {
    return `user_feedback must be ${IDEA_FEEDBACK_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate idea status: must be one of the known idea statuses
 * (`pending`, `accepted`, `rejected`, `implemented`, `in_progress`, `archived`).
 *
 * @returns `null` if valid, or an error message listing valid statuses.
 */
export function validateIdeaStatus(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'status must be a string';
  }
  if (!VALID_IDEA_STATUSES.includes(value as typeof VALID_IDEA_STATUSES[number])) {
    return `status must be one of: ${VALID_IDEA_STATUSES.join(', ')}`;
  }
  return null;
}

/**
 * Validate an effort/impact/risk score: integer between 1 and 10 (inclusive).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateScore(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 'must be an integer';
  }
  if (value < 1 || value > 10) {
    return 'must be between 1 and 10';
  }
  return null;
}

/**
 * Validate scan_type: non-empty string, max 100 chars.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateScanType(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'scan_type must be a string';
  }
  if (value.trim().length === 0) {
    return 'scan_type must not be empty';
  }
  if (value.length > IDEA_SCAN_TYPE_MAX) {
    return `scan_type must be ${IDEA_SCAN_TYPE_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate category: non-empty string, max 100 chars.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateCategory(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'category must be a string';
  }
  if (value.trim().length === 0) {
    return 'category must not be empty';
  }
  if (value.length > IDEA_CATEGORY_MAX) {
    return `category must be ${IDEA_CATEGORY_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate a UUID string (required). Accepts standard UUID v4 format
 * (8-4-4-4-12 hex characters, case-insensitive).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateUUID(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'must be a string';
  }
  if (!UUID_RE.test(value)) {
    return 'must be a valid UUID';
  }
  return null;
}

/**
 * Validate an entity ID: accepts UUID format OR prefixed IDs like ctx_*, grp_*, etc.
 * Use this for fields where IDs may not be standard UUIDs (e.g., context_id).
 */
const ENTITY_ID_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z]{2,6}_[a-z0-9_]+)$/i;
export function validateEntityId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'must be a string';
  }
  if (!ENTITY_ID_RE.test(value)) {
    return 'must be a valid ID (UUID or entity ID format)';
  }
  return null;
}

/**
 * Validate user_pattern: must be 0 or 1 (SQLite boolean convention).
 *
 * For JavaScript `true`/`false` booleans, use `validateBoolean()` instead.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateBooleanFlag(value: unknown): string | null {
  if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
    return 'must be 0 or 1';
  }
  return null;
}

// ── Project validators ──────────────────────────────────────────────

/** Max lengths for project text fields. */
const PROJECT_NAME_MAX = 255;
const PROJECT_DESCRIPTION_MAX = 2000;
const RUN_SCRIPT_MAX = 500;
const GIT_REPO_MAX = 500;
const GIT_BRANCH_MAX = 255;

/** Valid project types matching the ProjectType union (extended set for manager). */
const VALID_PROJECT_TYPES: ReadonlySet<string> = new Set([
  'nextjs', 'react', 'express', 'fastapi', 'django', 'rails', 'generic', 'combined',
]);

/**
 * Validate a project name: non-empty string, max 255 chars.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateProjectName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'name must be a string';
  }
  if (value.trim().length === 0) {
    return 'name must not be empty';
  }
  if (value.length > PROJECT_NAME_MAX) {
    return `name must be ${PROJECT_NAME_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate a project description: string, max 2000 chars (may be empty).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateProjectDescription(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'description must be a string';
  }
  if (value.length > PROJECT_DESCRIPTION_MAX) {
    return `description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate a project type enum: must be one of the recognised project types
 * (`nextjs`, `react`, `express`, `fastapi`, `django`, `rails`, `generic`, `combined`).
 *
 * @returns `null` if valid, or an error message.
 */
export function validateProjectTypeEnum(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'type must be a string';
  }
  if (!VALID_PROJECT_TYPES.has(value)) {
    return `type must be one of: ${[...VALID_PROJECT_TYPES].join(', ')}`;
  }
  return null;
}

/**
 * Validate a port number: integer between 1 and 65535.
 *
 * @returns `null` if valid, or an error message.
 */
export function validatePort(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 'port must be an integer';
  }
  if (value < 1 || value > 65535) {
    return 'port must be between 1 and 65535';
  }
  return null;
}

/**
 * Validate a run script command: non-empty string, max 500 chars.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateRunScript(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'runScript must be a string';
  }
  if (value.trim().length === 0) {
    return 'runScript must not be empty';
  }
  if (value.length > RUN_SCRIPT_MAX) {
    return `runScript must be ${RUN_SCRIPT_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate a git repository identifier: non-empty string, max 500 chars.
 * Accepts `owner/repo` shorthand or full URLs.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateGitRepository(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'git repository must be a string';
  }
  if (value.trim().length === 0) {
    return 'git repository must not be empty';
  }
  if (value.length > GIT_REPO_MAX) {
    return `git repository must be ${GIT_REPO_MAX} characters or fewer`;
  }
  return null;
}

/**
 * Validate a git branch name: non-empty string, max 255 chars, no whitespace.
 *
 * @returns `null` if valid, or an error message.
 */
export function validateGitBranch(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'git branch must be a string';
  }
  if (value.trim().length === 0) {
    return 'git branch must not be empty';
  }
  if (value.length > GIT_BRANCH_MAX) {
    return `git branch must be ${GIT_BRANCH_MAX} characters or fewer`;
  }
  if (/\s/.test(value)) {
    return 'git branch must not contain whitespace';
  }
  return null;
}

// ── Composite validators ────────────────────────────────────────────

/**
 * Validate the optional `gitConfig` parameter shape used by execution endpoints.
 *
 * Expected shape:
 * ```ts
 * {
 *   enabled: boolean;
 *   commands: string[];        // max 20 entries
 *   commitMessage: string;     // non-empty, max 1000 chars
 * }
 * ```
 *
 * Returns `null` if the value is `undefined`/`null` (optional field) or if
 * the shape is valid. Returns an error message describing the first failure.
 *
 * @returns `null` if valid or absent, or an error message.
 */
export function validateGitConfig(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'gitConfig must be an object';
  }
  const cfg = value as Record<string, unknown>;
  if (typeof cfg.enabled !== 'boolean') {
    return 'gitConfig.enabled must be a boolean';
  }
  if (!Array.isArray(cfg.commands) || !cfg.commands.every((c: unknown) => typeof c === 'string')) {
    return 'gitConfig.commands must be an array of strings';
  }
  if (cfg.commands.length > 20) {
    return 'gitConfig.commands must have 20 or fewer entries';
  }
  if (typeof cfg.commitMessage !== 'string' || cfg.commitMessage.trim().length === 0) {
    return 'gitConfig.commitMessage must be a non-empty string';
  }
  if (cfg.commitMessage.length > 1000) {
    return 'gitConfig.commitMessage must be 1000 characters or fewer';
  }
  return null;
}

/**
 * Validate the optional `sessionConfig` parameter shape used by execution endpoints.
 *
 * Expected shape:
 * ```ts
 * {
 *   sessionId?: string;
 *   claudeSessionId?: string;
 * }
 * ```
 *
 * Returns `null` if the value is `undefined`/`null` (optional field) or if
 * the shape is valid. Returns an error message describing the first failure.
 *
 * @returns `null` if valid or absent, or an error message.
 */
export function validateSessionConfig(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'sessionConfig must be an object';
  }
  const cfg = value as Record<string, unknown>;
  if (cfg.sessionId !== undefined && typeof cfg.sessionId !== 'string') {
    return 'sessionConfig.sessionId must be a string';
  }
  if (cfg.claudeSessionId !== undefined && typeof cfg.claudeSessionId !== 'string') {
    return 'sessionConfig.claudeSessionId must be a string';
  }
  return null;
}

// ── Factory validators ──────────────────────────────────────────────

/**
 * Create a validator for a required non-empty string with configurable max length.
 * Useful for task content, requirement content, and similar text fields.
 *
 * @param maxLength - Maximum allowed character count.
 * @param fieldName - Human-readable field name for error messages.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * const validateContent = validateNonEmptyString(50000, 'content');
 * validateContent('')      // 'content must not be empty'
 * validateContent('hello') // null (valid)
 * ```
 */
export function validateNonEmptyString(maxLength: number, fieldName: string) {
  return (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    if (value.trim().length === 0) {
      return `${fieldName} must not be empty`;
    }
    if (value.length > maxLength) {
      return `${fieldName} must be ${maxLength} characters or fewer`;
    }
    return null;
  };
}

/**
 * Create a validator for an optional string (may be empty) with configurable max length.
 *
 * @param maxLength - Maximum allowed character count.
 * @param fieldName - Human-readable field name for error messages.
 * @returns A validator function `(value: unknown) => string | null`.
 *
 * @example
 * ```ts
 * const validateNotes = validateOptionalString(2000, 'notes');
 * validateNotes('')      // null (valid — empty is OK)
 * validateNotes('hello') // null (valid)
 * ```
 */
export function validateOptionalString(maxLength: number, fieldName: string) {
  return (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    if (value.length > maxLength) {
      return `${fieldName} must be ${maxLength} characters or fewer`;
    }
    return null;
  };
}

// ── Composition helper ──────────────────────────────────────────────

export interface ValidationRule {
  field: string;
  value: unknown;
  validator: (value: unknown) => string | null;
}

/**
 * Run an array of validation rules. Throws a `ValidationError` with the
 * first failure message, or returns silently if all pass.
 *
 * For request-level validation that returns a `NextResponse` instead of
 * throwing, use `validateRequestBody()` from `apiValidator.ts`.
 *
 * @throws {ValidationError} On the first validation failure.
 *
 * @example
 * ```ts
 * validate([
 *   { field: 'projectPath', value: body.projectPath, validator: validateProjectPath },
 *   { field: 'projectType', value: body.projectType, validator: validateProjectType },
 * ]);
 * ```
 */
export function validate(rules: ValidationRule[]): void {
  for (const rule of rules) {
    const error = rule.validator(rule.value);
    if (error) {
      throw new ValidationError(error);
    }
  }
}
