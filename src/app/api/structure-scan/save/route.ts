import { NextRequest } from 'next/server';
import { saveRequirements } from '../lib/scanOrchestrator';
import type { StructureViolation } from '../violationRequirementTemplate';
import { successResponse, errorResponse } from '@/lib/api/responseFormatter';
import { handleApiError, ValidationError } from '@/lib/api/errorHandler';
import { validate, validateProjectPath, validateProjectId } from '@/lib/validation/inputValidator';
import { sanitizePath } from '@/lib/validation/sanitizers';

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

    if (!Array.isArray(violations) || violations.length === 0) {
      throw new ValidationError('violations must be a non-empty array');
    }

    validate([
      { field: 'projectPath', value: projectPath, validator: validateProjectPath },
      { field: 'projectId', value: projectId, validator: validateProjectId },
    ]);

    const safePath = sanitizePath(projectPath as string);
    const result = await saveRequirements(violations as StructureViolation[], safePath, projectId);

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
