/**
 * Claude Terminal Session Manager
 * Manages terminal session lifecycle and coordinates with SDK service
 */

import { v4 as uuidv4 } from 'uuid';
import * as sdkService from './sdk-service';
import type {
  TerminalSession,
  TerminalQueryOptions,
  SSEEvent,
  ApprovalDecision,
  PendingApproval,
  SessionStatus,
} from './types';

// In-memory session store (will be replaced with database in production)
const sessions = new Map<string, TerminalSession>();

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

  sessions.set(id, session);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): TerminalSession | null {
  return sessions.get(sessionId) || null;
}

/**
 * Get all sessions for a project
 */
export function getSessionsByProject(projectPath: string): TerminalSession[] {
  return Array.from(sessions.values()).filter((s) => s.projectPath === projectPath);
}

/**
 * Update session
 */
export function updateSession(
  sessionId: string,
  updates: Partial<Omit<TerminalSession, 'id' | 'createdAt'>>
): TerminalSession | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const updated = {
    ...session,
    ...updates,
    updatedAt: Date.now(),
  };

  sessions.set(sessionId, updated);
  return updated;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  // Abort any running query first
  sdkService.abortQuery(sessionId);
  return sessions.delete(sessionId);
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
  const session = sessions.get(sessionId);
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
  const session = sessions.get(sessionId);
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
  return Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Clean up old sessions
 */
export function cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let deleted = 0;

  for (const [id, session] of sessions) {
    if (session.updatedAt < cutoff && session.status !== 'running') {
      deleteSession(id);
      deleted++;
    }
  }

  return deleted;
}
