import { StructureViolation } from '../violationRequirementTemplate';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * Requirement Generator Module
 * Handles generation and saving of requirement files from violations
 */

export interface RequirementGenerationResult {
  success: boolean;
  requirementFiles: string[];
  error?: string;
}

/**
 * Generate a simple requirement file content from violations
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
 * Generate a simple filename for the requirement
 */
function generateSimpleFileName(violationType: string, count: number): string {
  const timestamp = Date.now();
  const sanitizedType = violationType.replace(/[^a-z0-9]/gi, '-');
  return `fix-structure-${sanitizedType}-${count}-items-${timestamp}.md`;
}

/**
 * Generate and save requirement files from violations
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
 * Group violations by type for better organization
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
 * Preview requirements without saving (for decision UI)
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
