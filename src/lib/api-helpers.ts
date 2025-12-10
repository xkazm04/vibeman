/**
 * Common API route helpers to reduce code duplication
 *
 * This module re-exports from the centralized api-errors module for backward compatibility.
 * New code should import directly from '@/lib/api-errors'.
 *
 * @deprecated Import from '@/lib/api-errors' instead for new code
 */

// Re-export everything from the centralized error module
export {
  // Error codes and types
  ApiErrorCode,
  ApiError,
  ERROR_CODE_STATUS_MAP,
  type ApiErrorResponse,
  type ApiSuccessResponse,

  // New standardized functions
  createApiErrorResponse,
  createApiSuccessResponse,
  validateRequiredFields,
  handleApiError,
  notFoundError,
  databaseError,
  validationError,
  invalidActionError,
  operationFailedError,
  handleOperationResult,

  // Legacy compatibility exports (deprecated)
  createErrorResponse,
  handleError,
  notFoundResponse,
  validateRequired,
  successResponse,
  errorResponse,
} from '@/lib/api-errors';
