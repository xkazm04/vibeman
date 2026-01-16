/**
 * CLI Store Exports
 *
 * Centralized exports for CLI session management.
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
  setCachedRequirements,
  getCachedRequirements,
  abortSessionExecution,
} from './cliExecutionManager';

// Recovery hooks
export { useCLIRecovery, useCLIRecoveryStatus } from './useCLIRecovery';
