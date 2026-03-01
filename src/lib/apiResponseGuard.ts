/**
 * API Response Guard Utilities
 *
 * Runtime validation for API response shapes to prevent
 * "Cannot read property X of undefined" crashes when
 * backend responses change or return error structures.
 *
 * This module re-exports from domain-specific schema files
 * under src/lib/api/schemas/ for backward compatibility.
 * Prefer importing directly from '@/lib/api/schemas' or
 * the specific domain file for new code.
 */

// Common utilities & shared schemas
export {
  safeResponseJson,
  safeGet,
  fetchApi,
  parseApiResponse,
  parseApiResponseSafe,
  SuccessResponseSchema,
} from './api/schemas/common';

// Brain API schemas
export {
  BrainDecayResponseSchema,
  BrainContextResponseSchema,
  BrainOutcomesResponseSchema,
  BrainReflectionStatusSchema,
  BrainReflectionTriggerSchema,
  BrainSignalsResponseSchema,
} from './api/schemas/brain';

// Goals API schemas
export {
  GoalsListResponseSchema,
  GoalResponseSchema,
  GoalMutationResponseSchema,
} from './api/schemas/goals';

// Questions API schemas
export {
  QuestionsResponseSchema,
  QuestionMutationSchema,
} from './api/schemas/questions';

// Directions API schemas
export {
  DirectionsResponseSchema,
  DirectionMutationSchema,
  AcceptDirectionResponseSchema,
} from './api/schemas/directions';
