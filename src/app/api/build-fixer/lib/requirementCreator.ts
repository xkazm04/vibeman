/**
 * Requirement Creator Library
 * Creates Claude Code requirement files from build error groups
 */

import { ErrorGroup, formatErrorGroup, generateRequirementName } from './buildScanner';
import { logger } from '@/lib/logger';


/**
 * Create a Claude Code requirement file using the official claudeCodeManager
 */
export async function createRequirementFile(
  projectPath: string,
  requirementName: string,
  content: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const { createRequirement } = await import('@/app/Claude/lib/claudeCodeManager');
    const result = createRequirement(projectPath, requirementName, content);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create requirement files from error groups
 */
export async function createRequirementFiles(
  projectPath: string,
  errorGroups: ErrorGroup[]
): Promise<{ success: boolean; requirementFiles: string[]; errors: string[] }> {
  const requirementFiles: string[] = [];
  const errors: string[] = [];

  for (const group of errorGroups) {
    const requirementName = generateRequirementName(group.file);
    const content = formatErrorGroup(group);

    const result = await createRequirementFile(projectPath, requirementName, content);

    if (result.success) {
      requirementFiles.push(requirementName);
      const uniqueFiles = [...new Set(group.errors.map(e => e.file))];
      logger.info(
        `Created: ${requirementName} (${group.errors.length} errors across ${uniqueFiles.length} file${uniqueFiles.length > 1 ? 's' : ''})`
      );
    } else {
      errors.push(`Failed to create ${requirementName}: ${result.error}`);
      logger.error('Failed to create requirement:', result.error);
    }
  }

  return {
    success: requirementFiles.length > 0,
    requirementFiles,
    errors
  };
}
