import { NextRequest } from 'next/server';
import { analyzeStructure } from '../lib/scanOrchestrator';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import { validateProjectPath, validateProjectType } from '@/lib/validation/inputValidator';
import { sanitizePath } from '@/lib/validation/sanitizers';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  ApiErrorCode,
  handleApiError,
} from '@/lib/api-errors';

/**
 * POST /api/structure-scan/analyze
 *
 * Step 1 of structure scan workflow:
 * Analyzes project structure and returns violations for user decision.
 *
 * Validation must happen before any processing.
 *
 * Request body:
 * ```json
 * {
 *   "projectPath": string,   // Absolute path to project directory
 *   "projectType": "nextjs" | "fastapi"
 * }
 * ```
 *
 * Success response:
 * ```json
 * {
 *   "success": true,
 *   "data": { "violations": [...], "violationCount": number, "message": string }
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
        { field: 'projectType', validator: validateProjectType },
      ],
    });
    if (!validation.success) return validation.error;

    const { projectPath, projectType } = validation.data;
    const safePath = sanitizePath(projectPath as string);
    const result = await analyzeStructure(safePath, projectType as 'nextjs' | 'fastapi');

    if (!result.success) {
      return createApiErrorResponse(
        ApiErrorCode.OPERATION_FAILED,
        result.error || 'Analysis failed',
      );
    }

    return createApiSuccessResponse({
      violations: result.violations,
      violationCount: result.violationCount,
      message: result.message,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/structure-scan/analyze');
  }
}
