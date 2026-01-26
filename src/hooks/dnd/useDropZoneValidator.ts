/**
 * @fileoverview Drop zone validation hook for @dnd-kit
 *
 * This hook provides validation logic for drop zones, determining whether
 * a dragged item can be dropped on a specific target. It supports both
 * simple validation and complex rule-based validation.
 *
 * @example Basic usage with allowed targets
 * ```tsx
 * import { useDropZoneValidator } from '@/hooks/dnd/useDropZoneValidator';
 *
 * function MyDropZone({ groupId }: { groupId: string }) {
 *   const { isValidTarget, canDrop } = useDropZoneValidator({
 *     allowedTargets: ['group-1', 'group-2', 'group-3'],
 *   });
 *
 *   // Check if current zone is valid for the active item
 *   const isValid = canDrop('item-123', groupId);
 *
 *   return (
 *     <div className={isValid ? 'bg-green-500/20' : 'bg-red-500/20'}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With custom validation rules
 * ```tsx
 * const { canDrop } = useDropZoneValidator({
 *   customValidator: (itemId, targetId, context) => {
 *     // Custom business logic
 *     const item = items.find(i => i.id === itemId);
 *     const targetGroup = groups.find(g => g.id === targetId);
 *
 *     // Prevent moving locked items
 *     if (item?.isLocked) return false;
 *
 *     // Prevent moving to full groups
 *     if (targetGroup?.isFull) return false;
 *
 *     return true;
 *   },
 * });
 * ```
 *
 * @example With blocked targets (e.g., synthetic groups)
 * ```tsx
 * const { canDrop } = useDropZoneValidator({
 *   blockedTargets: ['synthetic-to-group'],
 *   allowSameTarget: false,
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { SYNTHETIC_GROUP_ID } from '@/app/features/Context/lib/constants';

/**
 * Context passed to custom validators
 */
export interface DropValidationContext {
  /** The item being dragged */
  itemId: string;
  /** The target drop zone */
  targetId: string;
  /** The original group/container of the item (if known) */
  sourceId?: string;
  /** Additional metadata passed by the caller */
  metadata?: Record<string, unknown>;
}

/**
 * Custom validation function type
 */
export type CustomDropValidator = (
  itemId: string,
  targetId: string,
  context: DropValidationContext
) => boolean;

/**
 * Hook configuration options
 */
export interface UseDropZoneValidatorOptions {
  /** List of allowed target IDs (whitelist) */
  allowedTargets?: string[];
  /** List of blocked target IDs (blacklist) */
  blockedTargets?: string[];
  /** Whether dropping on the same target is allowed (default: false) */
  allowSameTarget?: boolean;
  /** Custom validation function for complex rules */
  customValidator?: CustomDropValidator;
  /** Map of special target transformations (e.g., 'synthetic-to-group' -> null) */
  targetTransforms?: Record<string, string | null>;
}

/**
 * Return value from useDropZoneValidator hook
 */
export interface UseDropZoneValidatorReturn {
  /**
   * Check if a target ID is in the allowed list
   */
  isValidTarget: (targetId: string) => boolean;

  /**
   * Check if a target ID is in the blocked list
   */
  isBlockedTarget: (targetId: string) => boolean;

  /**
   * Full validation check combining all rules
   * @param itemId - The ID of the item being dragged
   * @param targetId - The ID of the drop target
   * @param sourceId - Optional source container ID
   * @param metadata - Optional additional context
   * @returns Whether the drop is allowed
   */
  canDrop: (
    itemId: string,
    targetId: string,
    sourceId?: string,
    metadata?: Record<string, unknown>
  ) => boolean;

  /**
   * Transform a target ID using the configured transforms
   * @param targetId - The original target ID
   * @returns The transformed target ID, or null if the target should clear the association
   */
  transformTarget: (targetId: string) => string | null;

  /**
   * Get a validation result with details
   * @returns An object containing the validation result and reason
   */
  validateWithReason: (
    itemId: string,
    targetId: string,
    sourceId?: string
  ) => { valid: boolean; reason?: string };
}

/**
 * A reusable hook for drop zone validation logic.
 *
 * Provides:
 * - Whitelist/blacklist based target validation
 * - Custom validation rules
 * - Same-target prevention
 * - Target ID transformation (for synthetic groups)
 * - Detailed validation results with reasons
 *
 * @param options - Configuration options for validation
 * @returns Validation functions and utilities
 */
export function useDropZoneValidator(
  options: UseDropZoneValidatorOptions = {}
): UseDropZoneValidatorReturn {
  const {
    allowedTargets,
    blockedTargets = [],
    allowSameTarget = false,
    customValidator,
    targetTransforms = {},
  } = options;

  // Create sets for O(1) lookup
  const allowedSet = useMemo(
    () => (allowedTargets ? new Set(allowedTargets) : null),
    [allowedTargets]
  );

  const blockedSet = useMemo(
    () => new Set(blockedTargets),
    [blockedTargets]
  );

  const isValidTarget = useCallback(
    (targetId: string): boolean => {
      // If no whitelist, all non-blocked targets are valid
      if (!allowedSet) return !blockedSet.has(targetId);
      return allowedSet.has(targetId);
    },
    [allowedSet, blockedSet]
  );

  const isBlockedTarget = useCallback(
    (targetId: string): boolean => {
      return blockedSet.has(targetId);
    },
    [blockedSet]
  );

  const transformTarget = useCallback(
    (targetId: string): string | null => {
      if (targetId in targetTransforms) {
        return targetTransforms[targetId];
      }
      return targetId;
    },
    [targetTransforms]
  );

  const validateWithReason = useCallback(
    (
      itemId: string,
      targetId: string,
      sourceId?: string
    ): { valid: boolean; reason?: string } => {
      // Check blocked list
      if (blockedSet.has(targetId)) {
        return { valid: false, reason: 'Target is in blocked list' };
      }

      // Check allowed list
      if (allowedSet && !allowedSet.has(targetId)) {
        return { valid: false, reason: 'Target is not in allowed list' };
      }

      // Check same target
      if (!allowSameTarget && sourceId === targetId) {
        return { valid: false, reason: 'Cannot drop on same target' };
      }

      // Check same item
      if (itemId === targetId) {
        return { valid: false, reason: 'Cannot drop item on itself' };
      }

      // Run custom validator
      if (customValidator) {
        const context: DropValidationContext = {
          itemId,
          targetId,
          sourceId,
        };
        const isValid = customValidator(itemId, targetId, context);
        if (!isValid) {
          return { valid: false, reason: 'Custom validation failed' };
        }
      }

      return { valid: true };
    },
    [allowedSet, blockedSet, allowSameTarget, customValidator]
  );

  const canDrop = useCallback(
    (
      itemId: string,
      targetId: string,
      sourceId?: string,
      metadata?: Record<string, unknown>
    ): boolean => {
      // Check blocked list
      if (blockedSet.has(targetId)) return false;

      // Check allowed list
      if (allowedSet && !allowedSet.has(targetId)) return false;

      // Check same target
      if (!allowSameTarget && sourceId === targetId) return false;

      // Check same item
      if (itemId === targetId) return false;

      // Run custom validator
      if (customValidator) {
        const context: DropValidationContext = {
          itemId,
          targetId,
          sourceId,
          metadata,
        };
        return customValidator(itemId, targetId, context);
      }

      return true;
    },
    [allowedSet, blockedSet, allowSameTarget, customValidator]
  );

  return {
    isValidTarget,
    isBlockedTarget,
    canDrop,
    transformTarget,
    validateWithReason,
  };
}

/**
 * Default target transforms for common patterns
 */
export const DEFAULT_TARGET_TRANSFORMS = {
  /** Transform synthetic ungrouped target to null (remove from group) */
  UNGROUPED: { [SYNTHETIC_GROUP_ID]: null },
} as const;
