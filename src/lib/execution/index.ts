/**
 * Unified Execution System
 *
 * Consolidates execution logic across CLI, Conductor, Claude Code, Scan Queue, and Remote Mesh.
 */

export * from './types';
export * from './executor';
export { ConductorBackendProvider, createConductorBackend } from './backends/conductor';
export { performTaskCleanup, deleteRequirementFile, updateIdeaImplementationStatus } from './taskCleanup';
export type { TaskCleanupOptions } from './taskCleanup';
