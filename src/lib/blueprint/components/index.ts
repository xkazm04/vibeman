/**
 * Blueprint Components Index
 * Central export for all component types
 */

// Base components
export * from './base';

// Component types
export * from './analyzers';
export * from './processors';
export * from './executors';
export * from './scans';

// Unified registry
import { ANALYZER_REGISTRY, AnalyzerId } from './analyzers';
import { PROCESSOR_REGISTRY, ProcessorId } from './processors';
import { EXECUTOR_REGISTRY, ExecutorId } from './executors';

export const COMPONENT_REGISTRY = {
  ...ANALYZER_REGISTRY,
  ...PROCESSOR_REGISTRY,
  ...EXECUTOR_REGISTRY,
} as const;

export type ComponentId = AnalyzerId | ProcessorId | ExecutorId;

/**
 * Create any component by ID
 */
export function createComponent(id: ComponentId) {
  const ComponentClass = COMPONENT_REGISTRY[id as keyof typeof COMPONENT_REGISTRY];
  if (!ComponentClass) {
    throw new Error(`Unknown component: ${id}`);
  }
  return new ComponentClass();
}

/**
 * Get all available component IDs
 */
export function getComponentIds(): ComponentId[] {
  return Object.keys(COMPONENT_REGISTRY) as ComponentId[];
}

/**
 * Get components by type
 */
export function getComponentsByType(type: 'analyzer' | 'processor' | 'executor'): ComponentId[] {
  return getComponentIds().filter(id => id.startsWith(type));
}
