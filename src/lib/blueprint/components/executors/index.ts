/**
 * Executor Components Index
 * Exports all executor components and registry
 */

export * from './RequirementExecutor';
export * from './ClaudeCodeExecutor';

// Component registry
import { RequirementExecutor } from './RequirementExecutor';
import { ClaudeCodeExecutor } from './ClaudeCodeExecutor';

export const EXECUTOR_REGISTRY = {
  'executor.requirement': RequirementExecutor,
  'executor.claude-code': ClaudeCodeExecutor,
} as const;

export type ExecutorId = keyof typeof EXECUTOR_REGISTRY;

/**
 * Create an executor instance by ID
 */
export function createExecutor(id: ExecutorId): InstanceType<typeof EXECUTOR_REGISTRY[ExecutorId]> {
  const ExecutorClass = EXECUTOR_REGISTRY[id];
  if (!ExecutorClass) {
    throw new Error(`Unknown executor: ${id}`);
  }
  return new ExecutorClass();
}

/**
 * Get all available executor IDs
 */
export function getExecutorIds(): ExecutorId[] {
  return Object.keys(EXECUTOR_REGISTRY) as ExecutorId[];
}
