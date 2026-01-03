/**
 * Generic Backend Scan Adapters
 *
 * Provides build, structure, and context scanning capabilities
 * for various backend frameworks (Go, Ruby/Rails, Rust, Java, etc.)
 */

export { GenericBuildAdapter } from './GenericBuildAdapter';
export { GenericStructureAdapter } from './GenericStructureAdapter';
export { GenericContextsAdapter } from './GenericContextsAdapter';

// Re-export types used by these adapters
export type { ScanResult, DecisionData, ScanContext } from '../types';
