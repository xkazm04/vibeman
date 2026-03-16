import { NextRequest } from 'next/server';
import { saveRequirements } from '../lib/scanOrchestrator';
import type { StructureViolation } from '../violationRequirementTemplate';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import { validateProjectPath, validateProjectId } from '@/lib/validation/inputValidator';
import { sanitizePath } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  ApiErrorCode,
  handleApiError,
  extractRequestContext,
} from '@/lib/api-errors';

/**
 * POST /api/structure-scan/save
 *
 * Step 2 of structure scan workflow:
 * Saves requirement files after user accepts violations.
 *
 * Validation must happen before any processing.
 *
 * Request body:
 * ```json
 * {
 *   "violations": StructureViolation[],  // Non-empty array of violations to save
 *   "projectPath": string,               // Absolute path to project directory
 *   "projectId": string                  // UUID of the project record
 * }
 * ```
 *
 * Success response:
 * ```json
 * {
 *   "success": true,
 *   "data": { "requirementFiles": string[] }
 * }
 * ```
 *
 * Error response:
 * ```json
 * {
 *   "success": false,
 *   "error": string,
 *   "code": string,
 *   "fieldErrors"?: Record<string, string>
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body before any processing
    const validation = await validateRequestBody(request, {
      required: [
        { field: 'projectPath', validator: validateProjectPath },
        { field: 'projectId', validator: validateProjectId },
      ],
      custom: [
        (body) => {
          if (!Array.isArray(body.violations) || body.violations.length === 0) {
            return 'violations must be a non-empty array';
          }
          return null;
        },
      ],
    });
    if (!validation.success) return validation.error;

    const { violations, projectPath, projectId } = validation.data;
    const safePath = sanitizePath(projectPath as string);
    const result = await saveRequirements(
      violations as StructureViolation[],
      safePath,
      projectId as string,
    );

    if (!result.success) {
      return createApiErrorResponse(
        ApiErrorCode.OPERATION_FAILED,
        result.error || 'Save failed',
      );
    }

    return createApiSuccessResponse({
      requirementFiles: result.requirementFiles,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/structure-scan/save', ApiErrorCode.INTERNAL_ERROR, extractRequestContext(request));
  }
}
