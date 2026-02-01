/**
 * Context Domain Entity
 *
 * A first-class domain aggregate that owns its invariants and business rules.
 * This entity centralizes validation logic that was previously scattered across:
 * - contextUtils.ts (validateContextName, isContextNameDuplicate)
 * - ContextHealthIndicator.tsx (analyzeHealth)
 * - API routes (validateContextRequest)
 *
 * Key invariants:
 * - A context must have at least one file
 * - Context names must be 2-100 characters
 * - Context names are unique within groups
 * - Context health is derived, not stored
 */

import type { Context, ContextGroup } from './contextStoreTypes';

// ============================================================================
// Types
// ============================================================================

export type HealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface ContextHealth {
  level: HealthLevel;
  issues: string[];
  score: number; // 0-100
}

export interface NameValidationResult {
  valid: boolean;
  error?: string;
}

export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const MIN_FILES_FOR_HEALTHY = 2;

// ============================================================================
// Context Entity
// ============================================================================

/**
 * Context Entity - Domain aggregate for context business logic
 *
 * Wraps a raw Context interface and provides domain-driven methods
 * for validation, health analysis, and business rule enforcement.
 */
export class ContextEntity {
  private readonly _context: Context;

  constructor(context: Context) {
    this._context = context;
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  get id(): string {
    return this._context.id;
  }

  get projectId(): string {
    return this._context.projectId;
  }

  get groupId(): string | null {
    return this._context.groupId;
  }

  get name(): string {
    return this._context.name;
  }

  get description(): string | undefined {
    return this._context.description;
  }

  get filePaths(): string[] {
    return this._context.filePaths || [];
  }

  get createdAt(): Date {
    return this._context.createdAt;
  }

  get updatedAt(): Date {
    return this._context.updatedAt;
  }

  get target(): string | null | undefined {
    return this._context.target;
  }

  get targetFulfillment(): string | null | undefined {
    return this._context.target_fulfillment;
  }

  /**
   * Returns the underlying raw context data
   */
  get raw(): Context {
    return this._context;
  }

  // -------------------------------------------------------------------------
  // Invariant: File count
  // -------------------------------------------------------------------------

  get fileCount(): number {
    return this.filePaths.length;
  }

  /**
   * Invariant: A context must have at least one file
   */
  get hasFiles(): boolean {
    return this.fileCount > 0;
  }

  /**
   * A context is considered well-populated if it has multiple files
   */
  get hasMultipleFiles(): boolean {
    return this.fileCount >= MIN_FILES_FOR_HEALTHY;
  }

  // -------------------------------------------------------------------------
  // Invariant: Description presence
  // -------------------------------------------------------------------------

  get hasDescription(): boolean {
    return Boolean(this._context.description?.trim());
  }

  // -------------------------------------------------------------------------
  // Derived: Health (not stored, always computed)
  // -------------------------------------------------------------------------

  /**
   * Analyzes context health based on domain rules:
   * - Critical: No files assigned (violates core invariant)
   * - Warning: Only one file, or missing description
   * - Healthy: Multiple files and has description
   */
  get health(): ContextHealth {
    const issues: string[] = [];
    let score = 100;

    // File count check - core invariant
    if (this.fileCount === 0) {
      issues.push('No files assigned');
      score -= 50;
    } else if (this.fileCount < MIN_FILES_FOR_HEALTHY) {
      issues.push('Only one file - consider adding more');
      score -= 20;
    }

    // Description check
    if (!this.hasDescription) {
      issues.push('Missing description');
      score -= 15;
    }

    // Determine health level
    let level: HealthLevel;
    if (this.fileCount === 0) {
      level = 'critical';
    } else if (issues.length > 0) {
      level = 'warning';
    } else {
      level = 'healthy';
    }

    return {
      level,
      issues,
      score: Math.max(0, score),
    };
  }

  get healthLevel(): HealthLevel {
    return this.health.level;
  }

  get healthIssues(): string[] {
    return this.health.issues;
  }

  get isHealthy(): boolean {
    return this.health.level === 'healthy';
  }

  get isCritical(): boolean {
    return this.health.level === 'critical';
  }

  // -------------------------------------------------------------------------
  // Validation Methods
  // -------------------------------------------------------------------------

  /**
   * Validates the context against all business rules
   */
  validate(): ContextValidationResult {
    const errors: string[] = [];

    // Name validation
    const nameValidation = ContextEntity.validateName(this.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }

    // File count invariant
    if (!this.hasFiles) {
      errors.push('Context must have at least one file');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if this context can be saved/created
   */
  canBeSaved(): boolean {
    return this.validate().valid;
  }

  // -------------------------------------------------------------------------
  // Static Validation Methods
  // -------------------------------------------------------------------------

  /**
   * Validates a context name against business rules
   */
  static validateName(name: string): NameValidationResult {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { valid: false, error: 'Context name is required' };
    }

    if (trimmedName.length < NAME_MIN_LENGTH) {
      return { valid: false, error: `Context name must be at least ${NAME_MIN_LENGTH} characters` };
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      return { valid: false, error: `Context name must be less than ${NAME_MAX_LENGTH} characters` };
    }

    return { valid: true };
  }

  /**
   * Checks if a context name already exists within a group (uniqueness constraint)
   */
  static isNameDuplicateInGroup(
    contexts: Context[],
    name: string,
    groupId: string | null,
    excludeContextId?: string
  ): boolean {
    const trimmedName = name.trim().toLowerCase();

    return contexts.some(context =>
      context.name.toLowerCase() === trimmedName &&
      context.groupId === groupId &&
      context.id !== excludeContextId
    );
  }

  /**
   * Validates that a name is unique within a group
   */
  static validateNameUniqueness(
    contexts: Context[],
    name: string,
    groupId: string | null,
    excludeContextId?: string
  ): NameValidationResult {
    if (ContextEntity.isNameDuplicateInGroup(contexts, name, groupId, excludeContextId)) {
      return { valid: false, error: 'A context with this name already exists in the group' };
    }
    return { valid: true };
  }

  /**
   * Full name validation including format and uniqueness
   */
  static validateNameFull(
    name: string,
    contexts: Context[],
    groupId: string | null,
    excludeContextId?: string
  ): NameValidationResult {
    // First check format
    const formatResult = ContextEntity.validateName(name);
    if (!formatResult.valid) {
      return formatResult;
    }

    // Then check uniqueness
    return ContextEntity.validateNameUniqueness(contexts, name, groupId, excludeContextId);
  }

  /**
   * Validates file paths for context creation
   */
  static validateFilePaths(filePaths: string[]): NameValidationResult {
    if (!filePaths || filePaths.length === 0) {
      return { valid: false, error: 'At least one file path is required' };
    }
    return { valid: true };
  }

  // -------------------------------------------------------------------------
  // Factory Methods
  // -------------------------------------------------------------------------

  /**
   * Creates a ContextEntity from a raw Context
   */
  static from(context: Context): ContextEntity {
    return new ContextEntity(context);
  }

  /**
   * Creates ContextEntity instances from an array of raw contexts
   */
  static fromArray(contexts: Context[]): ContextEntity[] {
    return contexts.map(ctx => new ContextEntity(ctx));
  }

  /**
   * Analyzes health for a raw context without creating an entity instance
   * (Useful for components that just need health data)
   */
  static analyzeHealth(context: Context): ContextHealth {
    return new ContextEntity(context).health;
  }
}

// ============================================================================
// Utility Functions for backward compatibility
// ============================================================================

/**
 * @deprecated Use ContextEntity.validateName() instead
 */
export function validateContextName(name: string): NameValidationResult {
  return ContextEntity.validateName(name);
}

/**
 * @deprecated Use ContextEntity.isNameDuplicateInGroup() instead
 */
export function isContextNameDuplicate(
  contexts: Context[],
  name: string,
  groupId: string,
  excludeContextId?: string
): boolean {
  return ContextEntity.isNameDuplicateInGroup(contexts, name, groupId, excludeContextId);
}

/**
 * @deprecated Use ContextEntity.analyzeHealth() instead
 */
export function analyzeContextHealth(context: Context): ContextHealth {
  return ContextEntity.analyzeHealth(context);
}

export default ContextEntity;
