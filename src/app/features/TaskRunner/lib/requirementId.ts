/**
 * RequirementId Value Object
 *
 * Centralizes requirement ID handling to prevent format inconsistencies.
 * Requirement IDs use the composite format: `${projectId}:${requirementName}`
 *
 * This module provides:
 * - Type-safe parsing and creation of requirement IDs
 * - Consistent string conversion
 * - Equality checking
 * - Validation utilities
 *
 * @example
 * ```typescript
 * // Create from components
 * const id = RequirementId.create('proj-123', 'fix-bug');
 * console.log(id.toString()); // "proj-123:fix-bug"
 *
 * // Parse from string
 * const parsed = RequirementId.parse('proj-123:fix-bug');
 * if (parsed) {
 *   console.log(parsed.projectId); // "proj-123"
 *   console.log(parsed.requirementName); // "fix-bug"
 * }
 *
 * // Equality checking
 * const id1 = RequirementId.create('proj-123', 'fix-bug');
 * const id2 = RequirementId.parse('proj-123:fix-bug');
 * RequirementId.equals(id1, id2); // true
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Branded type for requirement ID strings
 * Provides compile-time distinction from regular strings
 */
export type RequirementIdString = string & { readonly __brand: 'RequirementId' };

/**
 * Parsed requirement ID with component parts
 */
export interface ParsedRequirementId {
  /** The project identifier */
  readonly projectId: string;
  /** The requirement name/identifier */
  readonly requirementName: string;
}

/**
 * Result of parsing a requirement ID string
 * Returns null if the string is not a valid requirement ID format
 */
export type ParseResult = ParsedRequirementId | null;

// ============================================================================
// Constants
// ============================================================================

/** Separator used in composite requirement IDs */
const ID_SEPARATOR = ':';

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a requirement ID from project ID and requirement name
 *
 * @param projectId - The project identifier
 * @param requirementName - The requirement name
 * @returns A composite requirement ID string
 *
 * @example
 * ```typescript
 * const id = RequirementId.create('my-project', 'implement-feature');
 * // Returns: "my-project:implement-feature"
 * ```
 */
function create(projectId: string, requirementName: string): RequirementIdString {
  if (!projectId || !requirementName) {
    throw new Error(
      `Invalid requirement ID components: projectId="${projectId}", requirementName="${requirementName}". ` +
      'Both projectId and requirementName must be non-empty strings.'
    );
  }
  return `${projectId}${ID_SEPARATOR}${requirementName}` as RequirementIdString;
}

/**
 * Parse a requirement ID string into its component parts
 *
 * Handles the composite format `projectId:requirementName`.
 * If the requirement name itself contains colons, they are preserved.
 *
 * @param id - The requirement ID string to parse
 * @returns Parsed components or null if invalid format
 *
 * @example
 * ```typescript
 * // Simple case
 * RequirementId.parse('proj-123:fix-bug');
 * // Returns: { projectId: 'proj-123', requirementName: 'fix-bug' }
 *
 * // Requirement name with colons
 * RequirementId.parse('proj-123:scope:feature:name');
 * // Returns: { projectId: 'proj-123', requirementName: 'scope:feature:name' }
 *
 * // Invalid format
 * RequirementId.parse('no-colon');
 * // Returns: null
 * ```
 */
function parse(id: string): ParseResult {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const separatorIndex = id.indexOf(ID_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  const projectId = id.substring(0, separatorIndex);
  const requirementName = id.substring(separatorIndex + 1);

  // Both parts must be non-empty
  if (!projectId || !requirementName) {
    return null;
  }

  return { projectId, requirementName };
}

/**
 * Check if a string is a valid requirement ID format
 *
 * @param id - The string to check
 * @returns True if the string is a valid requirement ID format
 *
 * @example
 * ```typescript
 * RequirementId.isValid('proj-123:fix-bug'); // true
 * RequirementId.isValid('no-colon'); // false
 * RequirementId.isValid(':missing-project'); // false
 * ```
 */
function isValid(id: string): id is RequirementIdString {
  return parse(id) !== null;
}

/**
 * Convert a parsed requirement ID back to string format
 *
 * @param parsed - The parsed requirement ID
 * @returns The composite ID string
 */
function toString(parsed: ParsedRequirementId): RequirementIdString {
  return create(parsed.projectId, parsed.requirementName);
}

/**
 * Check if two requirement IDs are equal
 *
 * Handles both string IDs and parsed objects.
 *
 * @param a - First requirement ID (string or parsed object)
 * @param b - Second requirement ID (string or parsed object)
 * @returns True if the IDs represent the same requirement
 *
 * @example
 * ```typescript
 * RequirementId.equals('proj:task', 'proj:task'); // true
 * RequirementId.equals(
 *   { projectId: 'proj', requirementName: 'task' },
 *   'proj:task'
 * ); // true
 * ```
 */
function equals(
  a: string | ParsedRequirementId,
  b: string | ParsedRequirementId
): boolean {
  const aStr = typeof a === 'string' ? a : toString(a);
  const bStr = typeof b === 'string' ? b : toString(b);
  return aStr === bStr;
}

/**
 * Extract the project ID from a requirement ID string
 *
 * @param id - The requirement ID string
 * @returns The project ID or null if invalid format
 */
function getProjectId(id: string): string | null {
  const parsed = parse(id);
  return parsed?.projectId ?? null;
}

/**
 * Extract the requirement name from a requirement ID string
 *
 * @param id - The requirement ID string
 * @returns The requirement name or null if invalid format
 */
function getRequirementName(id: string): string | null {
  const parsed = parse(id);
  return parsed?.requirementName ?? null;
}

/**
 * Create a requirement ID from a ProjectRequirement object
 *
 * @param requirement - Object with projectId and requirementName properties
 * @returns The composite requirement ID string
 */
function fromRequirement(requirement: {
  projectId: string;
  requirementName: string;
}): RequirementIdString {
  return create(requirement.projectId, requirement.requirementName);
}

/**
 * Try to parse a requirement ID, returning a default if parsing fails
 *
 * @param id - The requirement ID string to parse
 * @param defaultValue - Default value to return if parsing fails
 * @returns Parsed components or the default value
 */
function parseOrDefault(
  id: string,
  defaultValue: ParsedRequirementId
): ParsedRequirementId {
  return parse(id) ?? defaultValue;
}

/**
 * Assert that a string is a valid requirement ID, throwing if not
 *
 * @param id - The string to validate
 * @param context - Optional context for the error message
 * @returns The parsed requirement ID
 * @throws Error if the string is not a valid requirement ID
 */
function assertValid(id: string, context?: string): ParsedRequirementId {
  const parsed = parse(id);
  if (!parsed) {
    const contextMsg = context ? ` (${context})` : '';
    throw new Error(
      `Invalid requirement ID format${contextMsg}: "${id}". ` +
      `Expected format: "projectId:requirementName"`
    );
  }
  return parsed;
}

// ============================================================================
// Exports
// ============================================================================

/**
 * RequirementId namespace object
 *
 * Provides static methods for working with requirement IDs.
 * Import and use as: `RequirementId.create(...)`, `RequirementId.parse(...)`, etc.
 */
export const RequirementId = {
  /** Separator character used in composite IDs */
  SEPARATOR: ID_SEPARATOR,

  /** Create a requirement ID from components */
  create,

  /** Parse a requirement ID string */
  parse,

  /** Check if a string is valid requirement ID format */
  isValid,

  /** Convert parsed ID to string */
  toString,

  /** Check equality of two IDs */
  equals,

  /** Extract project ID from string */
  getProjectId,

  /** Extract requirement name from string */
  getRequirementName,

  /** Create ID from requirement object */
  fromRequirement,

  /** Parse with fallback default */
  parseOrDefault,

  /** Parse and throw if invalid */
  assertValid,
} as const;

// Default export for convenient imports
export default RequirementId;
