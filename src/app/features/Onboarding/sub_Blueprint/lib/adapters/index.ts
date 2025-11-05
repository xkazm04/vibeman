/**
 * Modular Scan Adapter Framework - Main Export
 *
 * This module provides the main entry point for the scan adapter framework.
 * It exports all core types, registry, and helper functions.
 */

// Core types
export type {
  ScanAdapter,
  ScanResult,
  DecisionData,
  ScanContext,
  ScanCategory,
  ScanRegistryConfig,
  AdapterMetadata,
  RegistrationResult,
  BaseAdapterConfig,
} from './types';

// Base adapter
export { BaseAdapter } from './BaseAdapter';

// Registry
export { ScanRegistry, getScanRegistry } from './ScanRegistry';

// NextJS adapters
export {
  NextJSBuildAdapter,
  NextJSStructureAdapter,
  NextJSContextsAdapter,
  getAllNextJSAdapters,
} from './nextjs';

// FastAPI adapters
export {
  FastAPIStructureAdapter,
  FastAPIBuildAdapter,
  getAllFastAPIAdapters,
} from './fastapi';

// Initialization
export { initializeAdapters, getInitializedRegistry } from './initialize';
