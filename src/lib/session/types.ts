/**
 * Application Session Types
 *
 * Defines the session state and coordination state for managing
 * multi-store cascading state changes when projects/contexts change.
 */

import type { Project } from '@/types';
import type { Context } from '@/lib/queries/contextQueries';

/**
 * Session phase indicates readiness state
 */
export type SessionPhase = 'idle' | 'loading' | 'ready' | 'error' | 'switching';

/**
 * Abort signal tracker for coordinating in-flight requests
 */
export interface AbortSignalTracker {
  context: AbortController;
  brain: AbortController;
  brain_dashboard: AbortController;
  file_structure: AbortController;
  general: AbortController;
}

/**
 * Application session state
 * Represents the coordinated state across all projects and contexts
 */
export interface ApplicationSessionState {
  // === Project State ===
  activeProject: Project | null;
  activeContext: Context | null;
  /**
   * Currently active workflow ID (could be a phase or task ID)
   */
  activeWorkflow: string | null;

  // === Session Phase ===
  phase: SessionPhase;
  error: string | null;

  // === Coordination Metadata ===
  lastSwitchAt: number; // timestamp of last project/context switch
  switchInProgress: boolean;
}

/**
 * Cascade configuration - defines what gets triggered when switching
 */
export interface CascadeConfig {
  loadContext: boolean; // triggers contextStore.loadProjectData()
  loadBrainDashboard: boolean; // triggers brainStore.fetchDashboard()
  loadFileStructure: boolean; // triggers clientProjectStore.loadProjectFileStructure()
  cancelPrevious: boolean; // cancels previous in-flight requests
}

/**
 * Default cascade config - all enabled for normal switching
 */
export const DEFAULT_CASCADE_CONFIG: CascadeConfig = {
  loadContext: true,
  loadBrainDashboard: true,
  loadFileStructure: true,
  cancelPrevious: true,
};

/**
 * Minimal cascade config - only updates stores without side effects
 */
export const MINIMAL_CASCADE_CONFIG: CascadeConfig = {
  loadContext: false,
  loadBrainDashboard: false,
  loadFileStructure: false,
  cancelPrevious: true,
};

/**
 * Application session coordinator store interface
 */
export interface ApplicationSessionStore extends ApplicationSessionState {
  // === Initialization ===
  initialize: () => Promise<void>;
  restore: () => void;

  // === Session Actions ===
  /**
   * Switch to a different project
   * Cascades all dependent state changes (context, brain, CLI, file structure)
   * Cancels previous in-flight requests to prevent stale data
   */
  switchProject: (project: Project, config?: Partial<CascadeConfig>) => Promise<void>;

  /**
   * Switch to a different context within the current project
   */
  setContext: (context: Context | null) => Promise<void>;

  /**
   * Set active workflow
   */
  setWorkflow: (workflowId: string | null) => void;

  // === Request Coordination ===
  /**
   * Get abort signal for specific request type
   * Used by data fetching code to enable cancellation
   */
  getAbortSignal: (type: keyof AbortSignalTracker) => AbortSignal;

  /**
   * Cancel all in-flight requests
   * Called automatically on project switch
   */
  cancelAllRequests: () => void;

  /**
   * Cancel specific request type
   */
  cancelRequest: (type: keyof AbortSignalTracker) => void;

  // === Error Handling ===
  setError: (error: string | null) => void;
  clearError: () => void;

  // === Cleanup ===
  cleanup: () => void;
}
