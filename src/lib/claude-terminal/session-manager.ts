/**
 * Claude Terminal Session Manager
 * Manages terminal session lifecycle and coordinates with SDK service.
 *
 * Storage and cleanup are delegated to the unified session-lifecycle module.
 * All public function signatures are unchanged for backward compatibility.
 */

import { v4 as uuidv4 } from 'uuid';
import * as sdkService from './sdk-service';
import { createTerminalLifecycle } from '@/lib/session-lifecycle';
import type { InMemoryPersistence } from '@/lib/session-lifecycle';
import type { TerminalSessionEntry } from '@/lib/session-lifecycle';
import type {
  TerminalSession,
  TerminalQueryOptions,
  SSEEvent,
  ApprovalDecision,
  PendingApproval,
  SessionStatus,
} from './types';

// Singleton lifecycle manager (pre-configured with InMemoryPersistence + maxAge rule)
const lifecycle = createTerminalLifecycle({
  beforeCleanup: (session) => {
    // Abort any running query before cleaning up
    sdkService.abortQuery(session.id);
    return true;
  },
});

// Direct reference to the underlying persistence store for synchronous access
const persistence = lifecycle.persistence as InMemoryPersistence<TerminalSessionEntry>;

/**
 * Expose the lifecycle manager for advanced usage (e.g. staleness detection, recovery).
 */
export { lifecycle as terminalLifecycle };

/**
 * Create a new terminal session
 */
export function createSession(projectPath: string): TerminalSession {
  const id = uuidv4();
  const now = Date.now();

  const session: TerminalSession = {
    id,
    projectPath,
    status: 'idle',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalCostUsd: 0,
  };

  persistence.save(session as TerminalSessionEntry);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): TerminalSession | null {
  return (persistence.getById(sessionId) as TerminalSession | null) ?? null;
}

/**
 * Get all sessions for a project
 */
export function getSessionsByProject(projectPath: string): TerminalSession[] {
  return (persistence.getAll() as TerminalSession[]).filter(
    (s) => s.projectPath === projectPath
  );
}

/**
 * Update session
 */
export function updateSession(
  sessionId: string,
  updates: Partial<Omit<TerminalSession, 'id' | 'createdAt'>>
): TerminalSession | null {
  const session = persistence.getById(sessionId);
  if (!session) {
    return null;
  }

  const updated = {
    ...session,
    ...updates,
    updatedAt: Date.now(),
  } as TerminalSessionEntry;

  persistence.save(updated);
  return updated as TerminalSession;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  // Abort any running query first
  sdkService.abortQuery(sessionId);
  return persistence.delete(sessionId);
}

/**
 * Start a query for a session
 */
export async function startSessionQuery(
  sessionId: string,
  prompt: string,
  options: TerminalQueryOptions,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const session = persistence.getById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Update session status
  updateSession(sessionId, {
    status: 'running',
    lastPrompt: prompt,
  });

  // Wrap onEvent to update session on result
  const wrappedOnEvent = (event: SSEEvent) => {
    // Update session based on event type
    if (event.type === 'result') {
      const resultData = event.data as {
        usage: { inputTokens: number; outputTokens: number };
        totalCostUsd: number;
        isError: boolean;
      };
      updateSession(sessionId, {
        status: resultData.isError ? 'error' : 'completed',
        totalTokensIn: (session.totalTokensIn || 0) + resultData.usage.inputTokens,
        totalTokensOut: (session.totalTokensOut || 0) + resultData.usage.outputTokens,
        totalCostUsd: (session.totalCostUsd || 0) + resultData.totalCostUsd,
      });
    } else if (event.type === 'approval_request') {
      updateSession(sessionId, { status: 'waiting_approval' });
    } else if (event.type === 'error') {
      updateSession(sessionId, { status: 'error' });
    }

    // Increment message count for relevant events
    if (['message', 'tool_use', 'tool_result'].includes(event.type)) {
      updateSession(sessionId, {
        messageCount: (session.messageCount || 0) + 1,
      });
    }

    onEvent(event);
  };

  try {
    await sdkService.startQuery(sessionId, prompt, session.projectPath, options, wrappedOnEvent);
  } catch (error) {
    updateSession(sessionId, { status: 'error' });
    throw error;
  }
}

/**
 * Process tool approval for a session
 */
export function processSessionApproval(
  sessionId: string,
  approvalId: string,
  decision: ApprovalDecision,
  reason?: string
): boolean {
  const result = sdkService.processApproval(sessionId, approvalId, decision, reason);

  if (result) {
    // Update session status back to running if no more pending approvals
    const pendingApprovals = sdkService.getPendingApprovals(sessionId);
    if (pendingApprovals.length === 0) {
      updateSession(sessionId, { status: 'running' });
    }
  }

  return result;
}

/**
 * Get pending approvals for a session
 */
export function getSessionPendingApprovals(sessionId: string): PendingApproval[] {
  return sdkService.getPendingApprovals(sessionId);
}

/**
 * Abort a session's query
 */
export function abortSessionQuery(sessionId: string): boolean {
  const result = sdkService.abortQuery(sessionId);
  if (result) {
    updateSession(sessionId, { status: 'idle' });
  }
  return result;
}

/**
 * Check if session has active query
 */
export function sessionHasActiveQuery(sessionId: string): boolean {
  return sdkService.hasActiveQuery(sessionId);
}

/**
 * Get session status
 */
export function getSessionStatus(sessionId: string): SessionStatus | null {
  const session = persistence.getById(sessionId);
  if (!session) {
    return null;
  }

  // Check if there's an active query
  const queryStatus = sdkService.getQueryStatus(sessionId);
  if (queryStatus) {
    return queryStatus === 'waiting_approval' ? 'waiting_approval' : 'running';
  }

  return session.status;
}

/**
 * List all sessions
 */
export function listSessions(): TerminalSession[] {
  return (persistence.getAll() as TerminalSession[]).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}

/**
 * Clean up old sessions.
 * Delegates to the lifecycle manager's cleanupOld() which respects activeStatuses
 * (running, waiting_approval) and the configured maxSessionAgeMs (1 day).
 *
 * The maxAgeMs parameter is accepted for backward compatibility but ignored --
 * the lifecycle manager uses its pre-configured DAYS(1) threshold.
 */
export async function cleanupOldSessions(
  _maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  return lifecycle.cleanupOld();
}
