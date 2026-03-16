/**
 * Standard API request body validation helper.
 *
 * Provides a single entry point for route handlers to parse, validate, and
 * sanitize incoming request bodies. Validation MUST happen before any
 * processing — call `validateRequestBody()` as the first step in every
 * POST/PUT/PATCH handler.
 *
 * @example
 * ```ts
 * const result = await validateRequestBody(request, {
 *   required: [
 *     { field: 'projectPath', validator: validateProjectPath },
 *     { field: 'projectType', validator: validateProjectType },
 *   ],
 *   optional: [
 *     { field: 'projectId', validator: validateProjectId },
 *   ],
 * });
 * if (!result.success) return result.error;
 * const { projectPath, projectType, projectId } = result.data;
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createApiErrorResponse,
  ApiErrorCode,
  type ApiErrorResponse,
} from '@/lib/api-errors';

// ── Types ────────────────────────────────────────────────────────────

/** A single field validation rule. */
export interface FieldRule {
  /** The key to extract from the parsed body. */
  field: string;
  /** Validator function — returns `null` on success or an error message. */
  validator: (value: unknown) => string | null;
}

/** Schema passed to `validateRequestBody`. */
export interface RequestBodySchema {
  /** Fields that must be present and pass validation. */
  required?: FieldRule[];
  /** Fields that are validated only when present. */
  optional?: FieldRule[];
  /**
   * Custom validators that run after field-level checks.
   * Each returns `null` on success or an error message string.
   */
  custom?: Array<(body: Record<string, unknown>) => string | null>;
}

/** Successful validation result. */
export interface ValidationSuccess {
  success: true;
  data: Record<string, unknown>;
}

/** Failed validation result — `.error` is a ready-to-return NextResponse. */
export interface ValidationFailure {
  success: false;
  error: NextResponse<ApiErrorResponse>;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Core helper ──────────────────────────────────────────────────────

/**
 * Parse and validate an incoming request body against a schema.
 *
 * Returns either `{ success: true, data }` with the parsed body, or
 * `{ success: false, error }` with a standardised `ApiErrorResponse`
 * that the caller can return directly.
 *
 * **Validation order:**
 * 1. JSON parsing
 * 2. Required field presence check
 * 3. Required field validators
 * 4. Optional field validators (skipped when field is absent)
 * 5. Custom cross-field validators
 *
 * @param request - The incoming Next.js request.
 * @param schema  - Validation schema describing expected fields.
 */
export async function validateRequestBody(
  request: NextRequest,
  schema: RequestBodySchema,
): Promise<ValidationResult> {
  // 1. Parse JSON
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      error: createApiErrorResponse(
        ApiErrorCode.INVALID_FORMAT,
        'Request body must be valid JSON',
        { logError: false },
      ),
    };
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      success: false,
      error: createApiErrorResponse(
        ApiErrorCode.INVALID_FORMAT,
        'Request body must be a JSON object',
        { logError: false },
      ),
    };
  }

  const fieldErrors: Record<string, string> = {};

  // 2–3. Required fields: presence + validation
  if (schema.required) {
    for (const rule of schema.required) {
      const value = body[rule.field];
      if (value === undefined || value === null || value === '') {
        fieldErrors[rule.field] = `${rule.field} is required`;
        continue;
      }
      const msg = rule.validator(value);
      if (msg) {
        fieldErrors[rule.field] = msg;
      }
    }
  }

  // 4. Optional fields: validate only when present
  if (schema.optional) {
    for (const rule of schema.optional) {
      const value = body[rule.field];
      if (value === undefined || value === null) continue;
      const msg = rule.validator(value);
      if (msg) {
        fieldErrors[rule.field] = msg;
      }
    }
  }

  // Return field-level errors before running custom validators
  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return {
      success: false,
      error: createApiErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        firstError,
        { fieldErrors, logError: false },
      ),
    };
  }

  // 5. Custom cross-field validators
  if (schema.custom) {
    for (const customValidator of schema.custom) {
      const msg = customValidator(body);
      if (msg) {
        return {
          success: false,
          error: createApiErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            msg,
            { logError: false },
          ),
        };
      }
    }
  }

  return { success: true, data: body };
}

/**
 * Validate a pre-parsed body (for handlers that receive body from a
 * parent route or that need to validate non-request data).
 *
 * Same validation logic as `validateRequestBody` but skips JSON parsing.
 */
export function validateBody(
  body: Record<string, unknown>,
  schema: RequestBodySchema,
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (schema.required) {
    for (const rule of schema.required) {
      const value = body[rule.field];
      if (value === undefined || value === null || value === '') {
        fieldErrors[rule.field] = `${rule.field} is required`;
        continue;
      }
      const msg = rule.validator(value);
      if (msg) {
        fieldErrors[rule.field] = msg;
      }
    }
  }

  if (schema.optional) {
    for (const rule of schema.optional) {
      const value = body[rule.field];
      if (value === undefined || value === null) continue;
      const msg = rule.validator(value);
      if (msg) {
        fieldErrors[rule.field] = msg;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = Object.values(fieldErrors)[0];
    return {
      success: false,
      error: createApiErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        firstError,
        { fieldErrors, logError: false },
      ),
    };
  }

  if (schema.custom) {
    for (const customValidator of schema.custom) {
      const msg = customValidator(body);
      if (msg) {
        return {
          success: false,
          error: createApiErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            msg,
            { logError: false },
          ),
        };
      }
    }
  }

  return { success: true, data: body };
}
