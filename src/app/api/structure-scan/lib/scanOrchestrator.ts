import { getEnforcedStructure } from '../structureTemplates';
import { scanWithEnforcedStructure } from './violationDetector';
import { generateAndSaveRequirements, previewRequirements } from './requirementGenerator';
import { logStructureScanSuccess, logStructureScanError, logStructureScanAccepted, logStructureScanRejected } from './eventLogger';
import type { StructureViolation } from '../violationRequirementTemplate';

/**
 * Scan Orchestrator Module
 * Coordinates the complete structure scan workflow
 */

export interface ScanResult {
  success: boolean;
  violations: StructureViolation[];
  violationCount: number;
  message?: string;
  error?: string;
}

export interface SaveResult {
  success: boolean;
  requirementFiles: string[];
  error?: string;
}

/**
 * Step 1: Analyze project structure and detect violations
 * Returns violations for user decision
 */
export async function analyzeStructure(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi'
): Promise<ScanResult> {
  try {
    console.log('[ScanOrchestrator] 🎯 Starting structure analysis...');

    // Get enforced structure rules for project type
    const enforcedStructure = getEnforcedStructure(projectType);

    if (!enforcedStructure) {
      throw new Error(`No enforced structure found for project type: ${projectType}`);
    }

    // Scan for violations
    const violations = await scanWithEnforcedStructure(projectPath, enforcedStructure);

    console.log(`[ScanOrchestrator] ✅ Analysis complete: ${violations.length} violations found`);

    return {
      success: true,
      violations,
      violationCount: violations.length,
      message: violations.length === 0
        ? 'No structure violations found'
        : `Found ${violations.length} structure violations`,
    };
  } catch (error) {
    console.error('[ScanOrchestrator] ❌ Analysis failed:', error);

    return {
      success: false,
      violations: [],
      violationCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Step 2: Save requirement files (called after user accepts)
 * Also logs event to database
 */
export async function saveRequirements(
  violations: StructureViolation[],
  projectPath: string,
  projectId: string
): Promise<SaveResult> {
  try {
    console.log('[ScanOrchestrator] 💾 Saving requirements...');

    const result = await generateAndSaveRequirements(violations, projectPath, projectId);

    if (result.success) {
      // Log success event
      logStructureScanAccepted({
        projectId,
        violationsFound: violations.length,
        requirementFilesCreated: result.requirementFiles.length,
        requirementFiles: result.requirementFiles,
      });

      console.log('[ScanOrchestrator] ✅ Requirements saved successfully');
    }

    return result;
  } catch (error) {
    console.error('[ScanOrchestrator] ❌ Save failed:', error);

    logStructureScanError(projectId, error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      requirementFiles: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log rejection (called after user rejects)
 */
export function logRejection(projectId: string, violationCount: number): void {
  logStructureScanRejected(projectId, violationCount);
  console.log('[ScanOrchestrator] ℹ️  User rejected structure scan requirements');
}

/**
 * Get a preview of requirements (for decision UI)
 */
export function getRequirementPreview(violations: StructureViolation[]) {
  return previewRequirements(violations);
}
