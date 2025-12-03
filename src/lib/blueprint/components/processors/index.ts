/**
 * Processor Components Index
 * Exports all processor components and registry
 */

export * from './FilterProcessor';
export * from './GroupProcessor';
export * from './PriorityProcessor';
export * from './BatchProcessor';
export * from './MergeProcessor';
export * from './FilepathSelectorProcessor';
export * from './DecisionGateProcessor';

// Component registry
import { FilterProcessor } from './FilterProcessor';
import { GroupProcessor } from './GroupProcessor';
import { PriorityProcessor } from './PriorityProcessor';
import { BatchProcessor } from './BatchProcessor';
import { MergeProcessor } from './MergeProcessor';
import { FilepathSelectorProcessor } from './FilepathSelectorProcessor';
import { DecisionGateProcessor } from './DecisionGateProcessor';

export const PROCESSOR_REGISTRY = {
  'processor.filter': FilterProcessor,
  'processor.group': GroupProcessor,
  'processor.priority': PriorityProcessor,
  'processor.batch': BatchProcessor,
  'processor.merge': MergeProcessor,
  'processor.filepath-selector': FilepathSelectorProcessor,
  'processor.decision-gate': DecisionGateProcessor,
} as const;

export type ProcessorId = keyof typeof PROCESSOR_REGISTRY;

/**
 * Create a processor instance by ID
 */
export function createProcessor(id: ProcessorId): InstanceType<typeof PROCESSOR_REGISTRY[ProcessorId]> {
  const ProcessorClass = PROCESSOR_REGISTRY[id];
  if (!ProcessorClass) {
    throw new Error(`Unknown processor: ${id}`);
  }
  return new ProcessorClass();
}

/**
 * Get all available processor IDs
 */
export function getProcessorIds(): ProcessorId[] {
  return Object.keys(PROCESSOR_REGISTRY) as ProcessorId[];
}
