/**
 * Context Module Library - Barrel Exports
 * Centralized exports for all lib utilities and constants
 */

// API Operations
export * from './contextApi';

// Utility Functions
export * from './contextUtils';

// Constants and Configurations
export * from './constants';

// Re-export useContextDetail hook
export { useContextDetail } from './useContextDetail';

// Domain Entity (preferred for new code)
export { ContextEntity } from '@/stores/context/ContextEntity';
export type { HealthLevel, ContextHealth, NameValidationResult, ContextValidationResult } from '@/stores/context/ContextEntity';
