'use client';

/**
 * Annette Session Hook
 * Manages conversation sessions with integrated memory recall and learning
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { annetteDb } from '@/app/db';
import type { DbAnnetteSession, DbAnnetteMessage } from '@/app/db/models/annette.types';
import type { RecalledContext } from '../lib/contextualRecaller';

export interface AnnetteMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  toolCalls?: string;
  toolName?: string;
  tokensInput: number;
  tokensOutput: number;
  createdAt: string;
}

export interface AnnetteSession {
  id: string;
  projectId: string;
  title: string | null;
  status: 'active' | 'archived';
  messageCount: number;
  totalTokensUsed: number;
  summary: string | null;
  lastActivityAt: string;
  createdAt: string;
}

interface UseAnnetteSessionOptions {
  projectId: string;
  autoRecall?: boolean;
  autoLearn?: boolean;
  maxContextTokens?: number;
}

interface UseAnnetteSessionReturn {
  session: AnnetteSession | null;
  messages: AnnetteMessage[];
  recalledContext: RecalledContext | null;
  isLoading: boolean;
  error: string | null;
  createSession: (title?: string) => Promise<AnnetteSession>;
  loadSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addAssistantMessage: (content: string, tokensInput?: number, tokensOutput?: number) => Promise<void>;
  recallContext: (message?: string) => Promise<RecalledContext>;
  learnFromConversation: () => Promise<void>;
  archiveSession: () => Promise<void>;
  clearSession: () => void;
  refreshMessages: () => Promise<void>;
}

function dbSessionToSession(db: DbAnnetteSession): AnnetteSession {
  return {
    id: db.id,
    projectId: db.project_id,
    title: db.title,
    status: db.status,
    messageCount: db.message_count,
    totalTokensUsed: db.total_tokens_used,
    summary: db.summary,
    lastActivityAt: db.last_activity_at,
    createdAt: db.created_at,
  };
}

function dbMessageToMessage(db: DbAnnetteMessage): AnnetteMessage {
  return {
    id: db.id,
    role: db.role,
    content: db.content,
    toolCalls: db.tool_calls || undefined,
    toolName: db.tool_name || undefined,
    tokensInput: db.tokens_input,
    tokensOutput: db.tokens_output,
    createdAt: db.created_at,
  };
}

export function useAnnetteSession(options: UseAnnetteSessionOptions): UseAnnetteSessionReturn {
  const { projectId, autoRecall = true, autoLearn = true } = options;

  const [session, setSession] = useState<AnnetteSession | null>(null);
  const [messages, setMessages] = useState<AnnetteMessage[]>([]);
  const [recalledContext, setRecalledContext] = useState<RecalledContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageCountRef = useRef(0);

  // Create a new session
  const createSession = useCallback(async (title?: string): Promise<AnnetteSession> => {
    setIsLoading(true);
    setError(null);

    try {
      const dbSession = annetteDb.sessions.create(projectId, title);
      const newSession = dbSessionToSession(dbSession);
      setSession(newSession);
      setMessages([]);
      setRecalledContext(null);
      messageCountRef.current = 0;
      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load an existing session
  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const dbSession = annetteDb.sessions.getById(sessionId);
      if (!dbSession) {
        throw new Error('Session not found');
      }

      const dbMessages = annetteDb.messages.getBySession(sessionId, 100);

      setSession(dbSessionToSession(dbSession));
      setMessages(dbMessages.map(dbMessageToMessage));
      messageCountRef.current = dbMessages.length;

      // Auto-recall context if enabled and there are messages
      if (autoRecall && dbMessages.length > 0) {
        const lastUserMessage = dbMessages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
          await recallContext(lastUserMessage.content);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [autoRecall]);

  // Recall relevant context
  const recallContext = useCallback(async (message?: string): Promise<RecalledContext> => {
    try {
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/annette/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recall',
          projectId,
          sessionId: session?.id,
          currentMessage: message,
          recentMessages,
          maxMemories: 5,
          maxNodes: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to recall context');
      }

      const recalled = await response.json() as RecalledContext;
      setRecalledContext(recalled);
      return recalled;
    } catch (err) {
      console.error('Error recalling context:', err);
      const emptyContext: RecalledContext = {
        memories: [],
        knowledgeNodes: [],
        knowledgeEdges: [],
        summary: '',
        tokenEstimate: 0,
      };
      setRecalledContext(emptyContext);
      return emptyContext;
    }
  }, [projectId, session?.id, messages]);

  // Send a user message
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!session) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Store the user message
      const dbMessage = annetteDb.messages.create({
        sessionId: session.id,
        role: 'user',
        content,
        tokensInput: Math.round(content.length / 4),
        tokensOutput: 0,
      });

      const newMessage = dbMessageToMessage(dbMessage);
      setMessages(prev => [...prev, newMessage]);
      messageCountRef.current++;

      // Update session activity
      annetteDb.sessions.updateActivity(session.id, newMessage.tokensInput);

      // Auto-recall context for the new message
      if (autoRecall) {
        await recallContext(content);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [session, autoRecall, recallContext]);

  // Add an assistant message (response from LLM)
  const addAssistantMessage = useCallback(async (
    content: string,
    tokensInput = 0,
    tokensOutput = 0
  ): Promise<void> => {
    if (!session) {
      throw new Error('No active session');
    }

    try {
      const dbMessage = annetteDb.messages.create({
        sessionId: session.id,
        role: 'assistant',
        content,
        tokensInput,
        tokensOutput,
      });

      const newMessage = dbMessageToMessage(dbMessage);
      setMessages(prev => [...prev, newMessage]);
      messageCountRef.current++;

      // Update session activity
      annetteDb.sessions.updateActivity(session.id, tokensInput + tokensOutput);

      // Auto-learn after every few messages
      if (autoLearn && messageCountRef.current % 4 === 0) {
        learnFromConversation();
      }
    } catch (err) {
      console.error('Error adding assistant message:', err);
    }
  }, [session, autoLearn]);

  // Learn from the current conversation
  const learnFromConversation = useCallback(async (): Promise<void> => {
    if (!session || messages.length < 2) return;

    try {
      const recentMessages = messages.slice(-10).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));

      await fetch('/api/annette/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'learn',
          projectId,
          sessionId: session.id,
          messages: recentMessages,
        }),
      });
    } catch (err) {
      console.error('Error learning from conversation:', err);
    }
  }, [projectId, session, messages]);

  // Archive the session
  const archiveSession = useCallback(async (): Promise<void> => {
    if (!session) return;

    try {
      // Learn from the full conversation before archiving
      if (autoLearn) {
        await learnFromConversation();
      }

      annetteDb.sessions.archive(session.id);
      setSession(prev => prev ? { ...prev, status: 'archived' } : null);
    } catch (err) {
      console.error('Error archiving session:', err);
    }
  }, [session, autoLearn, learnFromConversation]);

  // Clear the current session state
  const clearSession = useCallback((): void => {
    setSession(null);
    setMessages([]);
    setRecalledContext(null);
    setError(null);
    messageCountRef.current = 0;
  }, []);

  // Refresh messages from database
  const refreshMessages = useCallback(async (): Promise<void> => {
    if (!session) return;

    try {
      const dbMessages = annetteDb.messages.getBySession(session.id, 100);
      setMessages(dbMessages.map(dbMessageToMessage));
      messageCountRef.current = dbMessages.length;
    } catch (err) {
      console.error('Error refreshing messages:', err);
    }
  }, [session]);

  // Auto-load or create session on mount
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        // Try to get existing active session
        const activeSession = annetteDb.sessions.getActiveSession(projectId);
        if (activeSession) {
          await loadSession(activeSession.id);
        } else {
          // Create a new session
          await createSession();
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [projectId]);

  return {
    session,
    messages,
    recalledContext,
    isLoading,
    error,
    createSession,
    loadSession,
    sendMessage,
    addAssistantMessage,
    recallContext,
    learnFromConversation,
    archiveSession,
    clearSession,
    refreshMessages,
  };
}
