/**
 * Application Session Coordinator
 *
 * Centralized state management for coordinating project, context,
 * and workflow changes across multiple independent stores.
 *
 * This solves the "manual wiring" problem where components had to
 * manage 5+ store updates manually when switching projects, causing
 * race conditions and duplicated logic.
 *
 * Usage:
 *   const { switchProject } = useSessionActions();
 *   await switchProject(project); // Cascades all state changes
 *
 * Features:
 * - Automatic cascade of context/brain/CLI updates
 * - AbortSignal coordination for request cancellation
 * - Session persistence (localStorage)
 * - Error handling and recovery
 */

export { useApplicationSessionStore } from './coordinator';
export type {
  ApplicationSessionStore,
  ApplicationSessionState,
  AbortSignalTracker,
  SessionPhase,
  CascadeConfig,
} from './types';
export { DEFAULT_CASCADE_CONFIG, MINIMAL_CASCADE_CONFIG } from './types';

export {
  useApplicationSession,
  useSessionActions,
  useSessionAbortSignals,
  useSwitchProject,
  useSetContext,
  useSessionInitialize,
  useIsProjectActive,
  useIsContextActive,
} from './hooks';
