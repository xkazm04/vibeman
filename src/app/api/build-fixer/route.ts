import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { scanBuildErrors } from './lib/buildScanner';
import { createRequirementFiles } from './lib/requirementCreator';
import { createBuildFixerResponse, validateProjectPath } from './helpers';

export interface BuildFixerResult {
  success: boolean;
  totalErrors: number;
  totalWarnings: number;
  requirementFiles: string[];
  buildCommand: string;
  executionTime: number;
  error?: string;
}

/**
 * Handles successful scan with no errors
 */
function handleNoErrors(scanResult: any, startTime: number) {
  return createBuildFixerResponse({
    success: true,
    totalErrors: 0,
    totalWarnings: scanResult.totalWarnings,
    buildCommand: scanResult.buildCommand,
  }, startTime);
}

/**
 * Handles scan-only mode response
 */
function handleScanOnly(scanResult: any, startTime: number) {
  return createBuildFixerResponse({
    success: true,
    totalErrors: scanResult.totalErrors,
    totalWarnings: scanResult.totalWarnings,
    buildCommand: scanResult.buildCommand,
    // @ts-ignore - Add error groups for client to use
    errorGroups: scanResult.errorGroups,
  }, startTime);
}

/**
 * Handles full execution with requirement file creation
 */
async function handleFullExecution(projectPath: string, scanResult: any, startTime: number) {
  const createResult = await createRequirementFiles(projectPath, scanResult.errorGroups);

  return createBuildFixerResponse({
    success: true,
    totalErrors: scanResult.totalErrors,
    totalWarnings: scanResult.totalWarnings,
    requirementFiles: createResult.requirementFiles,
    buildCommand: scanResult.buildCommand,
  }, startTime);
}

/**
 * Main POST handler - Run build scan and optionally create requirement files
 * Query params:
 *   - scanOnly=true: Only scan for errors, don't create requirements
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { projectPath, buildCommand } = await request.json();
    const { searchParams } = new URL(request.url);
    const scanOnly = searchParams.get('scanOnly') === 'true';

    const validationError = validateProjectPath(projectPath);
    if (validationError) return validationError;

    logger.info('Starting build scan', { projectPath });

    // Scan for build errors
    const scanResult = await scanBuildErrors(projectPath, buildCommand);

    if (!scanResult.success) {
      return createBuildFixerResponse({
        success: false,
        buildCommand: scanResult.buildCommand,
        error: scanResult.error
      }, startTime, 500);
    }

    // If no errors, return success
    if (scanResult.totalErrors === 0) {
      return handleNoErrors(scanResult, startTime);
    }

    // If scan-only mode, return without creating requirements
    if (scanOnly) {
      return handleScanOnly(scanResult, startTime);
    }

    // Create requirement files
    return handleFullExecution(projectPath, scanResult, startTime);

  } catch (error) {
    logger.error('Build fixer error', { error });
    return createBuildFixerResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, startTime, 500);
  }
}
