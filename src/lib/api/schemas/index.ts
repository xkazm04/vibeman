/**
 * API Schemas — Barrel Export
 *
 * Re-exports all domain-specific schemas and common utilities
 * from a single entry point for convenient imports.
 */

// Common utilities & shared schemas
export {
  safeResponseJson,
  safeGet,
  fetchApi,
  parseApiResponse,
  parseApiResponseSafe,
  SuccessResponseSchema,
  dbObject,
} from './common';

// Brain API schemas
export {
  BrainDecayResponseSchema,
  BrainContextResponseSchema,
  BrainOutcomesResponseSchema,
  BrainReflectionStatusSchema,
  BrainReflectionTriggerSchema,
  BrainSignalsResponseSchema,
} from './brain';

// Goals API schemas
export {
  GoalsListResponseSchema,
  GoalResponseSchema,
  GoalMutationResponseSchema,
  GoalCreateBodySchema,
  GoalUpdateBodySchema,
} from './goals';

// Standup API schemas
export {
  StandupBlockerSchema,
  StandupHighlightSchema,
  StandupFocusAreaSchema,
  parseStandupJsonArray,
} from './standup';

// Questions API schemas
export {
  QuestionsResponseSchema,
  QuestionMutationSchema,
} from './questions';

// Directions API schemas
export {
  DirectionsResponseSchema,
  DirectionMutationSchema,
  AcceptDirectionResponseSchema,
} from './directions';
