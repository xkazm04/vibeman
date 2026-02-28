/**
 * CLI Components
 *
 * Reusable CLI terminal components for Claude Code execution.
 */

export { CompactTerminal } from './CompactTerminal';
export { CLIBatchPanel } from './CLIBatchPanel';
export * from './types';

// Store exports
export {
  useCLISessionStore,
  useSession,
  useAllSessions,
  getActiveSessions,
  getSessionsNeedingRecovery,
  type CLISessionId,
  type CLISessionState,
} from './store';

// Client-only hooks (not in store index to avoid SSR issues)
export { useCLIRecovery, useCLIRecoveryStatus } from './store/useCLIRecovery';
