import { NextRequest, NextResponse } from 'next/server';
import { analyzeStructure } from '../lib/scanOrchestrator';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateProjectId,
  validateProjectPath,
  validateProjectType,
  validateString,
} from '@/lib/validation/inputValidator';

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
    const result = await validateRequestBody(request, {
      required: [
        { field: 'projectId', validator: validateProjectId },
        { field: 'projectPath', validator: validateProjectPath },
        { field: 'projectType', validator: validateProjectType },
      ],
      optional: [
        { field: 'projectName', validator: validateString('projectName', { required: false, maxLength: 255 }) },
      ],
    });
    if (!result.success) return result.error;

    const { projectId, projectPath, projectType, projectName } = result.data;

    // Analyze structure
    const analysisResult = await analyzeStructure(projectPath as string, projectType as 'nextjs' | 'fastapi');

    if (!analysisResult.success) {
      return NextResponse.json(analysisResult, { status: 500 });
    }

    // Return violations for client to show in decision queue
    return NextResponse.json({
      success: true,
      violations: analysisResult.violations,
      violationCount: analysisResult.violationCount,
      message: analysisResult.message,
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
