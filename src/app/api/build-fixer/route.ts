import { NextRequest, NextResponse } from 'next/server';
import { scanBuildErrors } from './lib/buildScanner';
import { createRequirementFiles } from './lib/requirementCreator';

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

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    console.log('[BuildFixer] Starting build scan for:', projectPath);

    // Scan for build errors
    const scanResult = await scanBuildErrors(projectPath, buildCommand);

    if (!scanResult.success) {
      return NextResponse.json<BuildFixerResult>(
        {
          success: false,
          totalErrors: 0,
          totalWarnings: 0,
          requirementFiles: [],
          buildCommand: scanResult.buildCommand,
          executionTime: Date.now() - startTime,
          error: scanResult.error
        },
        { status: 500 }
      );
    }

    // If no errors, return success
    if (scanResult.totalErrors === 0) {
      return NextResponse.json<BuildFixerResult>({
        success: true,
        totalErrors: 0,
        totalWarnings: scanResult.totalWarnings,
        requirementFiles: [],
        buildCommand: scanResult.buildCommand,
        executionTime: Date.now() - startTime
      });
    }

    // If scan-only mode, return without creating requirements
    if (scanOnly) {
      return NextResponse.json<BuildFixerResult>({
        success: true,
        totalErrors: scanResult.totalErrors,
        totalWarnings: scanResult.totalWarnings,
        requirementFiles: [], // No files created yet
        buildCommand: scanResult.buildCommand,
        executionTime: Date.now() - startTime,
        // @ts-ignore - Add error groups for client to use
        errorGroups: scanResult.errorGroups,
      });
    }

    // Create requirement files
    const createResult = await createRequirementFiles(projectPath, scanResult.errorGroups);

    return NextResponse.json<BuildFixerResult>({
      success: true,
      totalErrors: scanResult.totalErrors,
      totalWarnings: scanResult.totalWarnings,
      requirementFiles: createResult.requirementFiles,
      buildCommand: scanResult.buildCommand,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('[BuildFixer] Error:', error);
    return NextResponse.json<BuildFixerResult>(
      {
        success: false,
        totalErrors: 0,
        totalWarnings: 0,
        requirementFiles: [],
        buildCommand: '',
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
