/**
 * Claude Terminal - Main exports
 *
 * Uses CLI-based execution (web subscription) instead of SDK (API key).
 */

// Types
export * from './types';

// CLI Service (primary - uses web subscription)
export {
  startExecution,
  getExecution,
  abortExecution,
  getActiveExecutions,
  cleanupExecutions,
  parseStreamJsonLine,
  extractTextContent,
  extractToolUses,
  type CLIExecution,
  type CLIExecutionEvent,
  type CLIMessage,
  type CLISystemMessage,
  type CLIAssistantMessage,
  type CLIUserMessage,
  type CLIResultMessage,
} from './cli-service';

// Legacy Session Manager (kept for backwards compatibility)
export {
  createSession,
  getSession,
  getSessionsByProject,
  updateSession,
  deleteSession,
  startSessionQuery,
  processSessionApproval,
  getSessionPendingApprovals,
  abortSessionQuery,
  sessionHasActiveQuery,
  getSessionStatus,
  listSessions,
  cleanupOldSessions,
} from './session-manager';

// Legacy SDK Service (kept for backwards compatibility)
export {
  startQuery,
  processApproval,
  getPendingApprovals,
  abortQuery,
  hasActiveQuery,
  getQueryStatus,
} from './sdk-service';
