/**
 * CLI Store Exports
 *
 * Centralized exports for CLI session management.
 *
 * NOTE: Client-only hooks (useCLIRecovery, useCLIRecoveryStatus) are NOT exported here
 * to prevent circular imports when server code imports from this module.
 * Import them directly from './useCLIRecovery' in client components.
 */

// Store and types
export {
  useCLISessionStore,
  useSession,
  useAllSessions,
  getActiveSessions,
  getSessionsNeedingRecovery,
  type CLISessionId,
  type CLISessionState,
  type CLIGitConfig,
} from './cliSessionStore';

// Execution manager
export {
  startCLIExecution,
  executeNextTask,
  recoverCLISessions,
  stopSessionPolling,
  cleanupAllCLISessions,
  getSessionExecutionStatus,
  getActiveStreamCount,
  abortSessionExecution,
  clearSessionStrategy,
  // Shared task completion utilities
  deleteRequirementFile,
  updateIdeaImplementationStatus,
  performTaskCleanup,
} from './cliExecutionManager';

// NOTE: Recovery hooks are NOT exported from barrel to avoid pulling React hooks into server context.
// Import directly: import { useCLIRecovery, useCLIRecoveryStatus } from './useCLIRecovery';
