/**
 * Reusable input validators for API route request bodies.
 *
 * Each validator returns `null` on success or an error message string on
 * failure. Compose them freely inside route handlers with the shared
 * `validate()` helper that throws a `ValidationError` on first failure.
 *
 * Builds on top of `@/lib/pathSecurity` for path-specific checks.
 */

import fs from 'fs';
import path from 'path';
import { validatePathTraversal } from '@/lib/pathSecurity';
import { ValidationError } from '@/lib/api/errorHandler';
import { VALID_IDEA_STATUSES } from '@/app/features/Ideas/lib/ideasHandlers';

// ── Individual validators ───────────────────────────────────────────

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
 * Validate a project type: must be one of the recognised values.
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
 * Validate an idea description: optional string, max 5000 chars.
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
 * Validate idea reasoning: optional string, max 5000 chars.
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
 * Validate idea user_feedback: optional string, max 2000 chars.
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
 * Validate idea status: must be one of the known idea statuses.
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
 * Validate effort/impact/risk score: integer 1–10.
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
 * Validate scan_type: non-empty string, max 100 chars, no shell metacharacters.
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
 * Validate a UUID string (required). Accepts standard UUID v4 format.
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
 * Validate user_pattern: must be 0 or 1 (SQLite boolean).
 */
export function validateBooleanFlag(value: unknown): string | null {
  if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
    return 'must be 0 or 1';
  }
  return null;
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
