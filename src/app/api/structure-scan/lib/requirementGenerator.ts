import { StructureViolation } from '../violationRequirementTemplate';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * Requirement Generator Module
 *
 * Converts {@link StructureViolation} objects into Markdown requirement
 * files that can be fed to Claude Code or reviewed by developers.
 *
 * Violations are grouped by type (misplaced, anti-pattern, missing-structure)
 * and each group produces a separate requirement file.
 *
 * @module requirementGenerator
 */

/** Result of generating and saving requirement files from violations. */
export interface RequirementGenerationResult {
  /** Whether all files were generated successfully. */
  success: boolean;
  /** Filenames of created requirement files. */
  requirementFiles: string[];
  /** Error description (present on failure). */
  error?: string;
}

/**
 * Generate Markdown content for a requirement file from a set of violations.
 *
 * Each violation is rendered as a numbered subsection with file path,
 * current/expected locations, reason, and rule reference.
 *
 * @param violations - Non-empty array of violations to include
 * @returns Markdown string ready to be written to a `.md` file
 */
function generateSimpleRequirement(violations: StructureViolation[]): string {
  const violationsList = violations
    .map((v, idx) => `
### Violation ${idx + 1}: ${v.violationType}

**File:** \`${v.filePath}\`
**Current Location:** ${v.currentLocation}
**Expected Location:** ${v.expectedLocation}
**Reason:** ${v.reason}
**Rule:** ${v.rule}
`)
    .join('\n---\n');

  return `# Structure Violation Fixes

## Overview
This requirement addresses ${violations.length} structure violation(s) detected in the project.

## Violations to Fix

${violationsList}

## Instructions
Please review each violation and move/refactor the affected files according to the expected locations.
`;
}

/**
 * Generate a unique filename for a requirement file.
 *
 * Format: `fix-structure-{type}-{count}-items-{timestamp}.md`
 *
 * @param violationType - The violation type (e.g. `'misplaced'`, `'anti-pattern'`)
 * @param count - Number of violations in this group
 * @returns A sanitized filename string
 */
function generateSimpleFileName(violationType: string, count: number): string {
  const timestamp = Date.now();
  const sanitizedType = violationType.replace(/[^a-z0-9]/gi, '-');
  return `fix-structure-${sanitizedType}-${count}-items-${timestamp}.md`;
}

/**
 * Generate and save requirement files from detected violations.
 *
 * Violations are grouped by type and each group is written as a separate
 * Markdown requirement file via {@link createRequirement}. Returns early
 * with an empty list when no violations are provided.
 *
 * @param violations - Array of violations to convert into requirements
 * @param projectPath - Absolute path to the project root (used for file creation)
 * @param projectId - Optional project identifier (reserved for future use)
 * @returns A {@link RequirementGenerationResult} with the list of created files
 *
 * @example
 * ```ts
 * const result = await generateAndSaveRequirements(violations, '/my-app', 'proj-1');
 * if (result.success) {
 *   console.log('Created files:', result.requirementFiles);
 * }
 * ```
 */
export async function generateAndSaveRequirements(
  violations: StructureViolation[],
  projectPath: string,
  projectId?: string
): Promise<RequirementGenerationResult> {
  if (violations.length === 0) {
    return {
      success: true,
      requirementFiles: [],
    };
  }

  const requirementFiles: string[] = [];

  try {
    // Group violations by type for better organization
    const groupedViolations = groupViolationsByType(violations);

    for (const [type, typeViolations] of Object.entries(groupedViolations)) {
      // Create requirement file for this group
      const requirementContent = generateSimpleRequirement(typeViolations);
      const requirementFileName = generateSimpleFileName(type, typeViolations.length);

      const result = createRequirement(projectPath, requirementFileName, requirementContent);

      if (result.success) {
        requirementFiles.push(requirementFileName);
      }
    }

    return {
      success: true,
      requirementFiles,
    };
  } catch (error) {
    return {
      success: false,
      requirementFiles,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Group violations by their `violationType` field.
 *
 * @param violations - Array of violations to group
 * @returns A record mapping each violation type to its violations
 */
function groupViolationsByType(violations: StructureViolation[]): Record<string, StructureViolation[]> {
  const grouped: Record<string, StructureViolation[]> = {};

  for (const violation of violations) {
    const type = violation.violationType || 'unknown';

    if (!grouped[type]) {
      grouped[type] = [];
    }

    grouped[type].push(violation);
  }

  return grouped;
}

/**
 * Preview requirement breakdown without persisting to disk.
 *
 * Useful for rendering a decision UI where the user reviews
 * violation counts before accepting or rejecting.
 *
 * @param violations - Array of violations to summarize
 * @returns An object with total count, per-type counts, and a summary string
 *
 * @example
 * ```ts
 * const preview = previewRequirements(violations);
 * // { count: 5, groupedByType: { misplaced: 3, 'anti-pattern': 2 }, summary: '3 misplaced, 2 anti-pattern' }
 * ```
 */
export function previewRequirements(violations: StructureViolation[]): {
  count: number;
  groupedByType: Record<string, number>;
  summary: string;
} {
  const grouped = groupViolationsByType(violations);
  const groupedCounts: Record<string, number> = {};

  for (const [type, typeViolations] of Object.entries(grouped)) {
    groupedCounts[type] = typeViolations.length;
  }

  const summary = Object.entries(groupedCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  return {
    count: violations.length,
    groupedByType: groupedCounts,
    summary,
  };
}
