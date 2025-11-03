import { StructureViolation, generateViolationRequirement, generateRequirementFileName } from '../violationRequirementTemplate';
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
 * Generate and save requirement files from violations
 */
export async function generateAndSaveRequirements(
  violations: StructureViolation[],
  projectPath: string,
  projectId?: string
): Promise<RequirementGenerationResult> {
  if (violations.length === 0) {
    console.log('[RequirementGenerator] ✅ No violations to process');
    return {
      success: true,
      requirementFiles: [],
    };
  }

  const requirementFiles: string[] = [];

  try {
    console.log(`[RequirementGenerator] 📝 Generating ${violations.length} requirement files...`);

    // Group violations by type for better organization
    const groupedViolations = groupViolationsByType(violations);

    for (const [type, typeViolations] of Object.entries(groupedViolations)) {
      console.log(`[RequirementGenerator] 🔧 Processing ${typeViolations.length} ${type} violations`);

      // Create requirement file for this group
      const requirementContent = generateViolationRequirement(typeViolations);
      const requirementFileName = generateRequirementFileName(typeViolations[0], typeViolations.length);

      console.log(`[RequirementGenerator] 💾 Saving requirement: ${requirementFileName}`);

      const success = await createRequirement(projectPath, requirementFileName, requirementContent);

      if (success) {
        requirementFiles.push(requirementFileName);
        console.log(`[RequirementGenerator] ✅ Saved: ${requirementFileName}`);
      } else {
        console.error(`[RequirementGenerator] ❌ Failed to save: ${requirementFileName}`);
      }
    }

    console.log(`[RequirementGenerator] ✅ Generated ${requirementFiles.length} requirement files`);

    return {
      success: true,
      requirementFiles,
    };
  } catch (error) {
    console.error('[RequirementGenerator] 💥 Error generating requirements:', error);
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
