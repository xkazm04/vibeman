/**
 * Task Runner Tools - Terminal session and execution management
 *
 * Tools:
 * - list_active_sessions: List active Claude terminal sessions
 * - get_execution_status: Get status of a running execution
 * - create_requirement: Create a new development requirement
 */

import * as sessionManager from '@/lib/claude-terminal/session-manager';

export async function executeTaskRunnerTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'list_active_sessions': {
      const sessions = sessionManager.listSessions();

      const activeSessions = sessions.filter(
        s => s.status === 'running' || s.status === 'waiting_approval'
      );

      return JSON.stringify({
        total: sessions.length,
        active: activeSessions.length,
        sessions: sessions.slice(0, 20).map(s => ({
          id: s.id,
          status: s.status,
          projectPath: s.projectPath,
          messageCount: s.messageCount,
          totalCostUsd: s.totalCostUsd,
          totalTokensIn: s.totalTokensIn,
          totalTokensOut: s.totalTokensOut,
          createdAt: new Date(s.createdAt).toISOString(),
          updatedAt: new Date(s.updatedAt).toISOString(),
          lastPrompt: s.lastPrompt?.substring(0, 100),
        })),
      });
    }

    case 'get_runner_execution_status': {
      const sessionId = input.sessionId as string | undefined;

      if (sessionId) {
        const session = sessionManager.getSession(sessionId);
        if (!session) {
          return JSON.stringify({ error: `Session ${sessionId} not found` });
        }

        const status = sessionManager.getSessionStatus(sessionId);
        const hasActive = sessionManager.sessionHasActiveQuery(sessionId);

        return JSON.stringify({
          sessionId: session.id,
          status,
          hasActiveQuery: hasActive,
          messageCount: session.messageCount,
          totalCostUsd: session.totalCostUsd,
          totalTokensIn: session.totalTokensIn,
          totalTokensOut: session.totalTokensOut,
          lastPrompt: session.lastPrompt?.substring(0, 200),
          createdAt: new Date(session.createdAt).toISOString(),
          updatedAt: new Date(session.updatedAt).toISOString(),
        });
      }

      // No specific session — return overall execution status
      try {
        const response = await fetch(
          `http://localhost:3000/api/claude-code/status?projectId=${projectId}`
        );

        if (!response.ok) {
          return JSON.stringify({ running: false, message: 'No active executions' });
        }

        const data = await response.json();
        return JSON.stringify(data);
      } catch {
        // Fall back to listing active sessions
        const sessions = sessionManager.listSessions();
        const running = sessions.filter(
          s => s.status === 'running' || s.status === 'waiting_approval'
        );

        return JSON.stringify({
          running: running.length > 0,
          activeSessions: running.length,
          sessions: running.map(s => ({
            id: s.id,
            status: s.status,
            lastPrompt: s.lastPrompt?.substring(0, 100),
          })),
        });
      }
    }

    case 'create_requirement': {
      const title = input.title as string;
      const description = input.description as string;
      const contextId = input.contextId as string | undefined;

      if (!title || !description) {
        return JSON.stringify({ error: 'title and description are required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            name: title,
            content: description,
            contextId: contextId || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Requirement "${title}" created successfully.`,
          requirementId: data.id || data.requirementId,
          requirementPath: data.path || null,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to create requirement' });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown task runner tool: ${name}` });
  }
}
