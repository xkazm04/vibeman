// src/hooks/use-claude-session.ts

'use client';

import { useState, useCallback, useRef } from 'react';
import type { TaskResult, ContextInfo, ClaudeSession } from '@/lib/claude/types';

interface UseClaudeSessionOptions {
  projectId: string;
  userId: string;
  autoCompact?: boolean;
  compactThreshold?: number;
  onContextWarning?: (info: ContextInfo) => void;
}

interface UseClaudeSessionReturn {
  // State
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  contextInfo: ContextInfo | null;
  lastResult: TaskResult | null;
  
  // Actions
  executeTask: (prompt: string, options?: TaskExecuteOptions) => Promise<TaskResult>;
  compactSession: (summaryInstructions?: string) => Promise<void>;
  startFreshSession: () => Promise<void>;
  loadExistingSession: () => Promise<ClaudeSession | null>;
  getContextInfo: () => Promise<ContextInfo | null>;
}

interface TaskExecuteOptions {
  model?: 'sonnet' | 'opus' | 'haiku';
  maxTurns?: number;
  allowedTools?: string[];
  forkSession?: boolean;
  workingDirectory?: string;
  systemPromptAppend?: string;
}

export function useClaudeSession(options: UseClaudeSessionOptions): UseClaudeSessionReturn {
  const { projectId, userId, autoCompact = true, compactThreshold = 80, onContextWarning } = options;
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [lastResult, setLastResult] = useState<TaskResult | null>(null);
  
  const warningShownRef = useRef(false);

  const executeTask = useCallback(async (
    prompt: string, 
    taskOptions?: TaskExecuteOptions
  ): Promise<TaskResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sessionId,
          projectId,
          userId,
          autoCompact,
          compactThreshold,
          ...taskOptions,
        }),
      });

      const result: TaskResult = await response.json();

      if (result.success) {
        setSessionId(result.sessionId);
        setContextInfo(result.contextInfo);
        
        // Check for context warnings
        if (result.contextInfo.usagePercentage >= 70 && !warningShownRef.current) {
          warningShownRef.current = true;
          onContextWarning?.(result.contextInfo);
        }
        
        // Reset warning flag if context was reduced (e.g., after compaction)
        if (result.contextInfo.usagePercentage < 50) {
          warningShownRef.current = false;
        }
      } else {
        setError(result.error ?? 'Task execution failed');
      }

      setLastResult(result);
      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, projectId, userId, autoCompact, compactThreshold, onContextWarning]);

  const compactSession = useCallback(async (summaryInstructions?: string): Promise<void> => {
    if (!sessionId) {
      throw new Error('No active session to compact');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          summaryInstructions,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error ?? 'Compaction failed');
      }

      // Refresh context info
      await getContextInfo();
      warningShownRef.current = false;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const startFreshSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await fetch('/api/claude/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'startFresh',
          projectId,
          userId,
          sessionId,
        }),
      });

      setSessionId(null);
      setContextInfo(null);
      setLastResult(null);
      warningShownRef.current = false;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, userId, sessionId]);

  const loadExistingSession = useCallback(async (): Promise<ClaudeSession | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getOrCreate',
          projectId,
          userId,
          preferActive: true,
        }),
      });

      const { session } = await response.json();

      if (session) {
        setSessionId(session.sessionId);
        // Load context info for the session
        const ctxResponse = await fetch(`/api/claude/task?sessionId=${session.sessionId}`);
        const ctxInfo = await ctxResponse.json();
        setContextInfo(ctxInfo);
      }

      return session;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, userId]);

  const getContextInfo = useCallback(async (): Promise<ContextInfo | null> => {
    if (!sessionId) return null;

    try {
      const response = await fetch(`/api/claude/task?sessionId=${sessionId}`);
      const info = await response.json();
      setContextInfo(info);
      return info;
    } catch (err) {
      console.error('Failed to get context info:', err);
      return null;
    }
  }, [sessionId]);

  return {
    sessionId,
    isLoading,
    error,
    contextInfo,
    lastResult,
    executeTask,
    compactSession,
    startFreshSession,
    loadExistingSession,
    getContextInfo,
  };
}
