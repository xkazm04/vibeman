import { NextRequest } from 'next/server';
import { saveRequirements } from '../lib/scanOrchestrator';
import type { StructureViolation } from '../violationRequirementTemplate';
import { successResponse, errorResponse } from '@/lib/api/responseFormatter';
import { handleApiError, ValidationError } from '@/lib/api/errorHandler';

/**
 * POST /api/structure-scan/save
 *
 * Step 2 of structure scan workflow:
 * Saves requirement files after user accepts
 *
 * Request body:
 * {
 *   violations: StructureViolation[];
 *   projectPath: string;
 *   projectId: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { violations, projectPath, projectId } = await request.json();

    if (!violations || !projectPath || !projectId) {
      throw new ValidationError('violations, projectPath, and projectId are required');
    }

    const result = await saveRequirements(violations as StructureViolation[], projectPath, projectId);

    if (!result.success) {
      return errorResponse(result.error || 'Save failed', 500);
    }

    return successResponse({
      requirementFiles: result.requirementFiles,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/structure-scan/save');
  }
}
