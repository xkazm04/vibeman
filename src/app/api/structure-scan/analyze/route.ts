import { NextRequest } from 'next/server';
import { analyzeStructure } from '../lib/scanOrchestrator';
import { successResponse, errorResponse } from '@/lib/api/responseFormatter';
import { handleApiError, ValidationError } from '@/lib/api/errorHandler';

/**
 * POST /api/structure-scan/analyze
 *
 * Step 1 of structure scan workflow:
 * Analyzes project structure and returns violations for user decision
 *
 * Request body:
 * {
 *   projectPath: string;
 *   projectType: 'nextjs' | 'fastapi';
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectPath, projectType } = await request.json();

    if (!projectPath || !projectType) {
      throw new ValidationError('projectPath and projectType are required');
    }

    const result = await analyzeStructure(projectPath, projectType);

    if (!result.success) {
      return errorResponse(result.error || 'Analysis failed', 500);
    }

    return successResponse({
      violations: result.violations,
      violationCount: result.violationCount,
      message: result.message,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/structure-scan/analyze');
  }
}
