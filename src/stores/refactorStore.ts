/**
 * Refactor Store - Re-export for backward compatibility
 *
 * The actual implementation is split into slices in /slices/refactor/
 * This file re-exports types for backward compatibility
 */

export type {
  RefactorOpportunity,
  AnalysisStatus,
  WizardStep,
  PackageGenerationStatus,
  DSLExecutionStatus,
  AnalysisSlice,
  OpportunitiesSlice,
  WizardSlice,
  PackagesSlice,
  DSLSlice,
  RefactorState,
} from './slices/refactor/types';

export {
  createAnalysisSlice,
  createOpportunitiesSlice,
  createWizardSlice,
  createPackagesSlice,
  createDSLSlice,
} from './slices/refactor';
