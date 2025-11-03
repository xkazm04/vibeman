import { NextRequest, NextResponse } from 'next/server';
import { analyzeStructure } from '../lib/scanOrchestrator';
import type { StructureViolation } from '../violationRequirementTemplate';

/**
 * POST /api/structure-scan/trigger
 *
 * Unified trigger endpoint for Blueprint integration
 * Analyzes structure and returns violations for decision queue
 *
 * Request body:
 * {
 *   projectId: string;
 *   projectPath: string;
 *   projectType: 'nextjs' | 'fastapi';
 *   projectName: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   violations: StructureViolation[];
 *   violationCount: number;
 *   message?: string;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath, projectType, projectName } = await request.json();

    if (!projectId || !projectPath || !projectType) {
      return NextResponse.json(
        { success: false, error: 'projectId, projectPath, and projectType are required' },
        { status: 400 }
      );
    }

    // Analyze structure
    const result = await analyzeStructure(projectPath, projectType);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // Return violations for client to show in decision queue
    return NextResponse.json({
      success: true,
      violations: result.violations,
      violationCount: result.violationCount,
      message: result.message,
      projectId,
      projectPath,
      projectName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        violations: [],
        violationCount: 0,
      },
      { status: 500 }
    );
  }
}
