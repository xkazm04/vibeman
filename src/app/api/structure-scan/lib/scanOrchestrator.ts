import { getEnforcedStructure } from '../structureTemplates';
import { scanWithEnforcedStructure } from './violationDetector';
import { generateAndSaveRequirements, previewRequirements } from './requirementGenerator';
import { logStructureScanError, logStructureScanAccepted, logStructureScanRejected } from './eventLogger';
import { logger } from '@/lib/logger';
import type { StructureViolation } from '../violationRequirementTemplate';

const log = logger.child('scan-orchestrator');

/**
 * Scan Orchestrator Module
 *
 * Coordinates the complete structure scan workflow:
 * 1. **Analyze** — scan the project and detect violations
 * 2. **Save** — persist accepted violations as requirement files
 * 3. **Reject** — log when the user dismisses results
 *
 * All public functions return typed result objects ({@link ScanResult} or
 * {@link SaveResult}) so callers never need to catch exceptions.
 *
 * @module scanOrchestrator
 */

/**
 * Result of a structure analysis scan.
 *
 * On success, `violations` contains every detected issue and `message`
 * holds a human-readable summary. On failure, `error` describes what
 * went wrong and `violations` is empty.
 */
export interface ScanResult {
  /** Whether the scan completed without errors. */
  success: boolean;
  /** All detected structure violations (empty on failure). */
  violations: StructureViolation[];
  /** Total number of violations found. */
  violationCount: number;
  /** Human-readable summary (present on success). */
  message?: string;
  /** Error description (present on failure). */
  error?: string;
}

/**
 * Result of saving violation requirements to disk.
 *
 * `requirementFiles` lists the filenames that were successfully written,
 * which may be a partial list if the operation failed mid-way.
 */
export interface SaveResult {
  /** Whether all requirement files were saved successfully. */
  success: boolean;
  /** Filenames of created requirement files (relative to requirements dir). */
  requirementFiles: string[];
  /** Error description (present on failure). */
  error?: string;
}

/**
 * Extract a human-readable message from an unknown error value.
 *
 * @param error - The caught error (may be an `Error` instance or anything)
 * @returns The error's `message` property, or `'Unknown error'` as fallback
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Create a failed {@link ScanResult} from an unknown error.
 *
 * @param error - The caught error
 * @returns A `ScanResult` with `success: false` and an error message
 */
function createErrorScanResult(error: unknown): ScanResult {
  return {
    success: false,
    violations: [],
    violationCount: 0,
    error: getErrorMessage(error),
  };
}

/**
 * Create a failed {@link SaveResult} from an unknown error.
 *
 * @param error - The caught error
 * @returns A `SaveResult` with `success: false` and an error message
 */
function createErrorSaveResult(error: unknown): SaveResult {
  return {
    success: false,
    requirementFiles: [],
    error: getErrorMessage(error),
  };
}

/**
 * Step 1: Analyze project structure and detect violations.
 *
 * Loads the enforced structure rules for the given project type,
 * scans the file tree, and returns all detected violations. The
 * caller typically presents these to the user for accept/reject.
 *
 * @param projectPath - Absolute path to the project root directory
 * @param projectType - The project framework type (`'nextjs'` or `'fastapi'`)
 * @returns A {@link ScanResult} — always succeeds at the object level;
 *          check `result.success` for scan-level success
 *
 * @example
 * ```ts
 * const result = await analyzeStructure('/home/user/my-app', 'nextjs');
 * if (result.success && result.violationCount > 0) {
 *   console.log(result.message); // "Found 3 structure violations"
 * }
 * ```
 */
export async function analyzeStructure(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi'
): Promise<ScanResult> {
  const elapsed = logger.startTimer();

  log.info('Analyzing project structure', { projectPath, projectType });

  try {
    // Get enforced structure rules for project type
    const enforcedStructure = getEnforcedStructure(projectType);

    if (!enforcedStructure) {
      log.warn('No enforced structure found', { projectType });
      throw new Error(`No enforced structure found for project type: ${projectType}`);
    }

    log.debug('Using enforced structure', { structureName: enforcedStructure.name });

    // Scan for violations
    const violations = await scanWithEnforcedStructure(projectPath, enforcedStructure);

    const { durationMs } = elapsed();
    log.info('Structure analysis completed', {
      projectType,
      violationCount: violations.length,
      durationMs,
    });

    return {
      success: true,
      violations,
      violationCount: violations.length,
      message: violations.length === 0
        ? 'No structure violations found'
        : `Found ${violations.length} structure violations`,
    };
  } catch (error) {
    const { durationMs } = elapsed();
    log.error('Structure analysis failed', {
      projectType,
      error,
      durationMs,
    });
    return createErrorScanResult(error);
  }
}

/**
 * Step 2: Save accepted violations as requirement files.
 *
 * Groups violations by type and writes one requirement file per group
 * into the project's requirements directory. Also logs a "scan accepted"
 * event to the database.
 *
 * @param violations - The violations the user has accepted
 * @param projectPath - Absolute path to the project root
 * @param projectId - Unique project identifier (used for event logging)
 * @returns A {@link SaveResult} with the list of created filenames
 *
 * @example
 * ```ts
 * const save = await saveRequirements(scanResult.violations, '/my-app', 'proj-123');
 * if (save.success) {
 *   console.log('Created:', save.requirementFiles);
 * }
 * ```
 */
export async function saveRequirements(
  violations: StructureViolation[],
  projectPath: string,
  projectId: string
): Promise<SaveResult> {
  const elapsed = logger.startTimer();

  log.info('Saving requirements', { projectId, violationCount: violations.length });

  try {
    const result = await generateAndSaveRequirements(violations, projectPath, projectId);

    if (result.success) {
      const { durationMs } = elapsed();
      log.info('Requirements saved successfully', {
        projectId,
        filesCreated: result.requirementFiles.length,
        durationMs,
      });

      // Log success event
      logStructureScanAccepted({
        projectId,
        violationsFound: violations.length,
        requirementFilesCreated: result.requirementFiles.length,
        requirementFiles: result.requirementFiles,
      });
    }

    return result;
  } catch (error) {
    const { durationMs } = elapsed();
    log.error('Failed to save requirements', {
      projectId,
      error,
      durationMs,
    });
    logStructureScanError(projectId, getErrorMessage(error));
    return createErrorSaveResult(error);
  }
}

/**
 * Log that the user rejected scan results.
 *
 * Records the rejection in the database event log so it can be
 * reviewed later for analytics or debugging.
 *
 * @param projectId - Unique project identifier
 * @param violationCount - Number of violations that were rejected
 */
export function logRejection(projectId: string, violationCount: number): void {
  log.info('User rejected scan results', { projectId, violationCount });
  logStructureScanRejected(projectId, violationCount);
}

/**
 * Build a summary preview of violations for the decision UI.
 *
 * Groups violations by type and returns counts plus a human-readable
 * summary string (e.g. `"3 misplaced, 1 anti-pattern"`).
 *
 * @param violations - Array of detected violations to summarize
 * @returns An object with total count, per-type counts, and a summary string
 *
 * @example
 * ```ts
 * const preview = getRequirementPreview(violations);
 * // { count: 4, groupedByType: { misplaced: 3, 'anti-pattern': 1 }, summary: '3 misplaced, 1 anti-pattern' }
 * ```
 */
export function getRequirementPreview(violations: StructureViolation[]): {
  count: number;
  groupedByType: Record<string, number>;
  summary: string;
} {
  return previewRequirements(violations);
}
