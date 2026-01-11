/**
 * Claude Terminal Store (CLI-based)
 *
 * State management for the CLI-like UI component using Claude Code CLI.
 * Uses web subscription authentication instead of API key.
 * No tool approval workflow (CLI uses --dangerously-skip-permissions).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileChange } from '@/lib/claude-terminal/types';

// Simplified message type for CLI output
export interface TerminalMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system' | 'error';
  content: string;
  timestamp: number;
  executionId?: string;
  // Tool-specific fields
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolUseId?: string;
  // Model info
  model?: string;
}

// Execution info from CLI
export interface ExecutionInfo {
  executionId: string;
  sessionId?: string;
  model?: string;
  tools?: string[];
  version?: string;
}

// Result data from CLI
export interface ExecutionResult {
  sessionId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  durationMs?: number;
  totalCostUsd?: number;
  isError?: boolean;
}

// SSE Event from stream
export interface CLISSEEvent {
  type: 'connected' | 'message' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'heartbeat' | 'stdout';
  data: Record<string, unknown>;
  timestamp: number;
}

interface TerminalStore {
  // State
  currentExecutionId: string | null;
  lastSessionId: string | null; // For session resume
  messages: TerminalMessage[];
  fileChanges: FileChange[];
  isStreaming: boolean;
  executionInfo: ExecutionInfo | null;
  lastResult: ExecutionResult | null;
  error: string | null;
  projectPath: string;

  // UI State
  showFilesPanel: boolean;

  // Input history
  inputHistory: string[];
  historyIndex: number;

  // Actions - Execution
  setProjectPath: (projectPath: string) => void;
  setCurrentExecution: (executionId: string | null) => void;
  setLastSessionId: (sessionId: string | null) => void;

  // Actions - Messages
  addMessage: (message: TerminalMessage) => void;
  clearMessages: () => void;

  // Actions - Streaming
  setIsStreaming: (isStreaming: boolean) => void;

  // Actions - File Changes
  addFileChange: (change: FileChange) => void;
  clearFileChanges: () => void;

  // Actions - UI State
  toggleFilesPanel: () => void;
  setShowFilesPanel: (show: boolean) => void;

  // Actions - Execution Info
  setExecutionInfo: (info: ExecutionInfo | null) => void;
  setLastResult: (result: ExecutionResult | null) => void;
  setError: (error: string | null) => void;

  // Actions - Input History
  addToHistory: (input: string) => void;
  navigateHistory: (direction: 'up' | 'down') => string | null;
  resetHistoryIndex: () => void;

  // Actions - SSE Event Handler
  handleSSEEvent: (event: CLISSEEvent) => void;

  // Actions - API Calls
  startExecution: (prompt: string, resumeSession?: boolean) => Promise<string | null>;
  abortExecution: () => Promise<boolean>;
}

/**
 * Claude Terminal Store with persistence for input history
 */
export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentExecutionId: null,
      lastSessionId: null,
      messages: [],
      fileChanges: [],
      isStreaming: false,
      executionInfo: null,
      lastResult: null,
      error: null,
      projectPath: '',
      showFilesPanel: true,
      inputHistory: [],
      historyIndex: -1,

      // Execution actions
      setProjectPath: (projectPath) => set({ projectPath }),
      setCurrentExecution: (executionId) => set({ currentExecutionId: executionId }),
      setLastSessionId: (sessionId) => set({ lastSessionId: sessionId }),

      // Message actions
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      clearMessages: () => set({ messages: [], fileChanges: [] }),

      // Streaming actions
      setIsStreaming: (isStreaming) => set({ isStreaming }),

      // File change actions
      addFileChange: (change) =>
        set((state) => {
          // Avoid duplicates
          const exists = state.fileChanges.some(
            (c) => c.filePath === change.filePath && c.toolUseId === change.toolUseId
          );
          if (exists) return state;
          return { fileChanges: [...state.fileChanges, change] };
        }),

      clearFileChanges: () => set({ fileChanges: [] }),

      // UI State actions
      toggleFilesPanel: () => set((state) => ({ showFilesPanel: !state.showFilesPanel })),
      setShowFilesPanel: (show) => set({ showFilesPanel: show }),

      // Execution info actions
      setExecutionInfo: (info) => set({ executionInfo: info }),
      setLastResult: (result) => set({ lastResult: result }),
      setError: (error) => set({ error }),

      // Input history actions
      addToHistory: (input) =>
        set((state) => {
          if (state.inputHistory[state.inputHistory.length - 1] === input) {
            return { historyIndex: -1 };
          }
          return {
            inputHistory: [...state.inputHistory, input].slice(-100),
            historyIndex: -1,
          };
        }),

      navigateHistory: (direction) => {
        const { inputHistory, historyIndex } = get();
        let newIndex = historyIndex;

        if (direction === 'up') {
          newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        } else {
          newIndex = historyIndex === -1 ? -1 : Math.min(inputHistory.length - 1, historyIndex + 1);
          if (newIndex === inputHistory.length) newIndex = -1;
        }

        set({ historyIndex: newIndex });
        return newIndex >= 0 ? inputHistory[newIndex] : null;
      },

      resetHistoryIndex: () => set({ historyIndex: -1 }),

      // SSE Event Handler (CLI format)
      handleSSEEvent: (event) => {
        const { currentExecutionId } = get();

        switch (event.type) {
          case 'connected': {
            const data = event.data as {
              executionId?: string;
              sessionId?: string;
              model?: string;
              tools?: string[];
              version?: string;
            };

            // Update session ID if provided
            if (data.sessionId) {
              set({ lastSessionId: data.sessionId });
            }

            set({
              executionInfo: {
                executionId: data.executionId || currentExecutionId || '',
                sessionId: data.sessionId,
                model: data.model,
                tools: data.tools,
                version: data.version,
              },
              error: null,
            });
            break;
          }

          case 'message': {
            const data = event.data as { type: string; content: string; model?: string };

            if (data.type === 'assistant' && data.content) {
              get().addMessage({
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                type: 'assistant',
                content: data.content,
                timestamp: event.timestamp,
                executionId: currentExecutionId || undefined,
                model: data.model,
              });
            }
            break;
          }

          case 'tool_use': {
            const data = event.data as {
              toolUseId: string;
              toolName: string;
              toolInput: Record<string, unknown>;
            };

            get().addMessage({
              id: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'tool_use',
              content: `Using ${data.toolName}`,
              timestamp: event.timestamp,
              executionId: currentExecutionId || undefined,
              toolName: data.toolName,
              toolInput: data.toolInput,
              toolUseId: data.toolUseId,
            });

            // Track file changes
            const fileTools = ['Edit', 'Write', 'Read'];
            if (fileTools.includes(data.toolName)) {
              const filePath = data.toolInput.file_path as string;
              if (filePath) {
                const changeType: FileChange['changeType'] =
                  data.toolName === 'Edit' ? 'edit' :
                  data.toolName === 'Write' ? 'write' :
                  'read';

                get().addFileChange({
                  id: `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  sessionId: currentExecutionId || '',
                  filePath,
                  changeType,
                  timestamp: event.timestamp,
                  toolUseId: data.toolUseId,
                  preview: changeType === 'edit'
                    ? String(data.toolInput.new_string || '').slice(0, 100)
                    : changeType === 'write'
                    ? String(data.toolInput.content || '').slice(0, 100)
                    : undefined,
                });
              }
            }
            break;
          }

          case 'tool_result': {
            const data = event.data as { toolUseId: string; content: string };

            get().addMessage({
              id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'tool_result',
              content: typeof data.content === 'string'
                ? data.content.slice(0, 500)
                : JSON.stringify(data.content).slice(0, 500),
              timestamp: event.timestamp,
              executionId: currentExecutionId || undefined,
              toolUseId: data.toolUseId,
            });
            break;
          }

          case 'result': {
            const data = event.data as ExecutionResult;

            // Save session ID for resume
            if (data.sessionId) {
              set({ lastSessionId: data.sessionId });
            }

            set({
              lastResult: data,
              isStreaming: false,
            });
            break;
          }

          case 'error': {
            const data = event.data as { error: string; exitCode?: number };

            set({
              error: data.error,
              isStreaming: false,
            });

            get().addMessage({
              id: `error-${Date.now()}`,
              type: 'error',
              content: data.error,
              timestamp: event.timestamp,
              executionId: currentExecutionId || undefined,
            });
            break;
          }

          case 'heartbeat':
            // Just keep connection alive
            break;
        }
      },

      // API Actions
      startExecution: async (prompt: string, resumeSession = false) => {
        const { projectPath, lastSessionId } = get();

        if (!projectPath) {
          set({ error: 'Project path not set' });
          return null;
        }

        try {
          set({ isStreaming: true, error: null });

          // Add user message
          get().addMessage({
            id: `user-${Date.now()}`,
            type: 'user',
            content: prompt,
            timestamp: Date.now(),
          });
          get().addToHistory(prompt);

          const response = await fetch('/api/claude-terminal/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath,
              prompt,
              resumeSessionId: resumeSession ? lastSessionId : undefined,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            set({ error: error.error, isStreaming: false });
            return null;
          }

          const { executionId, streamUrl } = await response.json();
          set({ currentExecutionId: executionId });

          return streamUrl;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start execution',
            isStreaming: false,
          });
          return null;
        }
      },

      abortExecution: async () => {
        const { currentExecutionId } = get();
        if (!currentExecutionId) return false;

        try {
          const response = await fetch(
            `/api/claude-terminal/query?executionId=${currentExecutionId}`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            set({ isStreaming: false, currentExecutionId: null });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'claude-terminal-storage',
      partialize: (state: TerminalStore) => ({
        inputHistory: state.inputHistory,
        lastSessionId: state.lastSessionId,
        projectPath: state.projectPath,
      }),
    }
  )
);
