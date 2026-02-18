/**
 * Context Generation Store
 *
 * Manages state for context generation scans.
 * Tracks active scans, their progress, and results.
 * Uses Claude CLI to analyze codebase and create contexts.
 */

import { create } from 'zustand';
import { useClientProjectStore } from './clientProjectStore';

/**
 * Terminal message from CLI output
 */
export interface TerminalMessage {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: number;
}

/**
 * Scan summary after completion
 */
export interface ContextGenerationSummary {
  groupsCreated: number;
  contextsCreated: number;
  relationshipsCreated: number;
  filesAnalyzed: number;
}

/**
 * Active scan state
 */
/**
 * IDs of existing data snapshotted before generation.
 * Used for deferred cleanup after successful completion.
 */
export interface PreviousDataIds {
  contextIds: string[];
  groupIds: string[];
  relationshipIds: string[];
}

export interface ActiveContextGeneration {
  scanId: string;
  executionId: string | null;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  messages: TerminalMessage[];
  summary: ContextGenerationSummary | null;
  streamUrl: string | null;
  error: string | null;
  previousDataIds: PreviousDataIds | null;
}

interface ContextGenerationStore {
  // Active scan (only one at a time per project)
  activeScan: ActiveContextGeneration | null;

  // Actions
  startGeneration: (projectId: string) => Promise<{ success: boolean; error?: string }>;
  cancelGeneration: (force?: boolean) => Promise<void>;
  appendMessage: (message: TerminalMessage) => void;
  setStatus: (status: ActiveContextGeneration['status']) => void;
  setSummary: (summary: ContextGenerationSummary) => void;
  setError: (error: string) => void;
  clearScan: () => void;

  // Getters
  isGenerating: () => boolean;
}

/**
 * Context generation store
 */
export const useContextGenerationStore = create<ContextGenerationStore>()((set, get) => ({
  activeScan: null,

  startGeneration: async (projectId: string) => {
    try {
      // Check if scan already running
      if (get().isGenerating()) {
        return { success: false, error: 'Context generation already running' };
      }

      // Get project path from active project store
      const activeProject = useClientProjectStore.getState().activeProject;
      if (!activeProject?.path) {
        return { success: false, error: 'No active project path available' };
      }
      const projectPath = activeProject.path;

      // Generate a unique scan ID
      const scanId = `ctx-gen-${Date.now()}`;

      // Initialize active scan state
      const activeScan: ActiveContextGeneration = {
        scanId,
        executionId: null,
        projectId,
        status: 'pending',
        messages: [{
          id: `msg-${Date.now()}`,
          type: 'system',
          content: 'Initializing context generation scan...',
          timestamp: Date.now(),
        }],
        summary: null,
        streamUrl: null,
        error: null,
        previousDataIds: null,
      };

      set({ activeScan });

      // Execute the scan via Claude CLI API
      const executeResponse = await fetch('/api/context-generation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath }),
      });

      if (!executeResponse.ok) {
        const err = await executeResponse.json();
        get().setError(err.error || 'Failed to execute context generation');
        return { success: false, error: err.error || 'Failed to execute context generation' };
      }

      const { executionId, streamUrl, previousDataIds } = await executeResponse.json();

      // Update scan state with execution info
      set((state) => {
        if (!state.activeScan) return state;

        return {
          activeScan: {
            ...state.activeScan,
            executionId,
            streamUrl,
            previousDataIds: previousDataIds || null,
            status: 'running',
            messages: [
              ...state.activeScan.messages,
              {
                id: `msg-${Date.now()}`,
                type: 'system',
                content: 'Claude Code CLI started. Analyzing codebase structure...',
                timestamp: Date.now(),
              },
            ],
          },
        };
      });

      return { success: true, scanId, executionId, streamUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  cancelGeneration: async (force = false) => {
    const scan = get().activeScan;

    // If force mode, clear local state immediately before server call
    if (force) {
      set({ activeScan: null });
    }

    // Try to cancel on server if execution exists
    if (scan?.executionId) {
      try {
        await fetch('/api/context-generation/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executionId: scan.executionId }),
        });
      } catch (error) {
        console.error('[ContextGeneration] Failed to cancel scan:', error);
      }
    }

    // If not force mode, clear state after server call completes
    if (!force) {
      set({ activeScan: null });
    }
  },

  appendMessage: (message: TerminalMessage) => {
    set((state) => {
      if (!state.activeScan) return state;

      return {
        activeScan: {
          ...state.activeScan,
          messages: [...state.activeScan.messages, message],
        },
      };
    });
  },

  setStatus: (status: ActiveContextGeneration['status']) => {
    set((state) => {
      if (!state.activeScan) return state;

      return {
        activeScan: {
          ...state.activeScan,
          status,
        },
      };
    });
  },

  setSummary: (summary: ContextGenerationSummary) => {
    set((state) => {
      if (!state.activeScan) return state;

      return {
        activeScan: {
          ...state.activeScan,
          summary,
          status: 'completed',
        },
      };
    });
  },

  setError: (error: string) => {
    set((state) => {
      if (!state.activeScan) return state;

      return {
        activeScan: {
          ...state.activeScan,
          error,
          status: 'failed',
        },
      };
    });
  },

  clearScan: () => {
    set({ activeScan: null });
  },

  isGenerating: () => {
    const scan = get().activeScan;
    return scan?.status === 'running' || scan?.status === 'pending';
  },
}));
