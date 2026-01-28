/**
 * Group Health Store
 *
 * Manages state for context group health scans.
 * Tracks active scans, their progress, and results.
 */

import { create } from 'zustand';
import type { DbGroupHealthScan, HealthScanSummary } from '@/app/db/models/group-health.types';
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
 * Scan type
 */
export type ScanType = 'refactor' | 'beautify' | 'performance' | 'production';

/**
 * Active scan state
 */
export interface ActiveScan {
  scanId: string;
  executionId: string | null;
  groupId: string;
  projectId: string;
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  messages: TerminalMessage[];
  summary: HealthScanSummary | null;
  streamUrl: string | null;
  error: string | null;
}

interface GroupHealthStore {
  // Active scans keyed by groupId
  activeScans: Record<string, ActiveScan>;

  // Actions
  startScan: (groupId: string, projectId: string, scanType?: ScanType) => Promise<{ success: boolean; error?: string }>;
  cancelScan: (groupId: string) => Promise<void>;
  forceClearScan: (groupId: string) => Promise<void>;
  completeScanWithCommit: (
    groupId: string,
    groupName: string,
    summary: HealthScanSummary
  ) => Promise<{ success: boolean; commitHash?: string; error?: string }>;
  updateScanProgress: (groupId: string, progress: number) => void;
  appendMessage: (groupId: string, message: TerminalMessage) => void;
  setScanStatus: (groupId: string, status: ActiveScan['status']) => void;
  setScanSummary: (groupId: string, summary: HealthScanSummary) => void;
  setScanError: (groupId: string, error: string) => void;
  clearScan: (groupId: string) => void;

  // Getters
  getActiveScan: (groupId: string) => ActiveScan | null;
  isScanning: (groupId: string) => boolean;
}

/**
 * Group health store for managing health scans
 */
export const useGroupHealthStore = create<GroupHealthStore>()((set, get) => ({
  activeScans: {},

  startScan: async (groupId: string, projectId: string, scanType: ScanType = 'refactor') => {
    try {
      // Check if scan already running
      if (get().isScanning(groupId)) {
        return { success: false, error: 'Scan already running for this group' };
      }

      // Get project path from active project store
      const activeProject = useClientProjectStore.getState().activeProject;
      if (!activeProject?.path) {
        return { success: false, error: 'No active project path available' };
      }
      const projectPath = activeProject.path;

      // Create scan via API
      const response = await fetch('/api/group-health-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, projectId, scanType }),
      });

      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.error || 'Failed to start scan' };
      }

      const { scan, fileCount } = await response.json();

      // Get scan type label for display
      const scanTypeLabel = scanType === 'production' ? 'production quality' :
                           scanType === 'beautify' ? 'beautify' :
                           scanType === 'performance' ? 'performance' : 'refactor';

      // Initialize active scan state
      const activeScan: ActiveScan = {
        scanId: scan.id,
        executionId: null,
        groupId,
        projectId,
        scanType,
        status: 'pending',
        progress: 0,
        messages: [{
          id: `msg-${Date.now()}`,
          type: 'system',
          content: `Initializing ${scanTypeLabel} scan for ${fileCount} files...`,
          timestamp: Date.now(),
        }],
        summary: null,
        streamUrl: null,
        error: null,
      };

      set((state) => ({
        activeScans: {
          ...state.activeScans,
          [groupId]: activeScan,
        },
      }));

      // Now execute the scan via CLI
      const executeResponse = await fetch(`/api/group-health-scan/${scan.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, scanType }),
      });

      if (!executeResponse.ok) {
        const err = await executeResponse.json();
        get().setScanError(groupId, err.error || 'Failed to execute scan');
        return { success: false, error: err.error || 'Failed to execute scan' };
      }

      const { executionId, streamUrl } = await executeResponse.json();

      // Update scan state with execution info
      set((state) => {
        const currentScan = state.activeScans[groupId];
        if (!currentScan) return state;

        return {
          activeScans: {
            ...state.activeScans,
            [groupId]: {
              ...currentScan,
              executionId,
              streamUrl,
              status: 'running',
              messages: [
                ...currentScan.messages,
                {
                  id: `msg-${Date.now()}`,
                  type: 'system',
                  content: 'Claude Code CLI started. Scanning files...',
                  timestamp: Date.now(),
                },
              ],
            },
          },
        };
      });

      return { success: true, scanId: scan.id, executionId, streamUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  cancelScan: async (groupId: string) => {
    const scan = get().activeScans[groupId];
    if (!scan) return;

    try {
      // Call API to cancel scan
      await fetch(`/api/group-health-scan/${scan.scanId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[GroupHealth] Failed to cancel scan:', error);
    }

    // Clear from state
    set((state) => {
      const { [groupId]: _, ...rest } = state.activeScans;
      return { activeScans: rest };
    });
  },

  forceClearScan: async (groupId: string) => {
    const scan = get().activeScans[groupId];

    // Clear local state first
    set((state) => {
      const { [groupId]: _, ...rest } = state.activeScans;
      return { activeScans: rest };
    });

    // Try to mark as failed on server
    if (scan?.scanId) {
      try {
        await fetch(`/api/group-health-scan/${scan.scanId}/fail`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('[GroupHealth] Failed to mark scan as failed:', error);
      }
    }
  },

  completeScanWithCommit: async (
    groupId: string,
    groupName: string,
    summary: HealthScanSummary
  ) => {
    const scan = get().activeScans[groupId];
    if (!scan) {
      return { success: false, error: 'No active scan found' };
    }

    const { appendMessage, setScanSummary, setScanStatus, setScanError } = get();
    const issuesFixed = summary.filesFixed > 0 ? summary.issues.unusedImports.fixed +
      summary.issues.consoleStatements.fixed +
      summary.issues.anyTypes.fixed : 0;

    try {
      let commitHash: string | undefined;
      let gitPushed = false;

      // Auto-commit if issues were fixed
      if (issuesFixed > 0) {
        appendMessage(groupId, {
          id: `msg-${Date.now()}`,
          type: 'system',
          content: 'Committing changes to git...',
          timestamp: Date.now(),
        });

        // Generate commit message
        const commitMessage = `chore(health): fix ${issuesFixed} issues in ${groupName} (score: ${summary.healthScore}%)`;

        // Call git commit API
        const gitResponse = await fetch('/api/git/commit-and-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: scan.projectId,
            commands: [
              'git add -A',
              'git commit -m "{commitMessage}"',
              'git push origin {branch}',
            ],
            commitMessage,
          }),
        });

        if (gitResponse.ok) {
          const gitResult = await gitResponse.json();

          // Extract commit hash from results
          if (gitResult.results) {
            const commitResult = gitResult.results.find((r: { command: string; output?: string }) =>
              r.command.includes('commit')
            );
            if (commitResult?.output) {
              const hashMatch = commitResult.output.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
              if (hashMatch) {
                commitHash = hashMatch[1];
              }
            }
          }

          gitPushed = true;
          appendMessage(groupId, {
            id: `msg-${Date.now()}`,
            type: 'system',
            content: `Changes committed and pushed${commitHash ? ` (${commitHash.substring(0, 7)})` : ''}`,
            timestamp: Date.now(),
          });
        } else {
          const gitError = await gitResponse.json();
          appendMessage(groupId, {
            id: `msg-${Date.now()}`,
            type: 'error',
            content: `Git operation failed: ${gitError.error || 'Unknown error'}`,
            timestamp: Date.now(),
          });
          // Don't fail the scan completion if git fails
        }
      }

      // Call scan complete API
      const completeResponse = await fetch(`/api/group-health-scan/${scan.scanId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthScore: summary.healthScore,
          issuesFound: Object.values(summary.issues).reduce((a, b) => a + b.found, 0),
          issuesFixed,
          scanSummary: summary,
          gitCommitHash: commitHash,
          gitPushed,
        }),
      });

      if (!completeResponse.ok) {
        const err = await completeResponse.json();
        setScanError(groupId, err.error || 'Failed to complete scan');
        return { success: false, error: err.error || 'Failed to complete scan' };
      }

      // Update local state
      setScanSummary(groupId, summary);

      return { success: true, commitHash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setScanError(groupId, errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  updateScanProgress: (groupId: string, progress: number) => {
    set((state) => {
      const scan = state.activeScans[groupId];
      if (!scan) return state;

      return {
        activeScans: {
          ...state.activeScans,
          [groupId]: {
            ...scan,
            progress: Math.min(100, Math.max(0, progress)),
          },
        },
      };
    });
  },

  appendMessage: (groupId: string, message: TerminalMessage) => {
    set((state) => {
      const scan = state.activeScans[groupId];
      if (!scan) return state;

      return {
        activeScans: {
          ...state.activeScans,
          [groupId]: {
            ...scan,
            messages: [...scan.messages, message],
          },
        },
      };
    });
  },

  setScanStatus: (groupId: string, status: ActiveScan['status']) => {
    set((state) => {
      const scan = state.activeScans[groupId];
      if (!scan) return state;

      return {
        activeScans: {
          ...state.activeScans,
          [groupId]: {
            ...scan,
            status,
            progress: status === 'completed' ? 100 : scan.progress,
          },
        },
      };
    });
  },

  setScanSummary: (groupId: string, summary: HealthScanSummary) => {
    set((state) => {
      const scan = state.activeScans[groupId];
      if (!scan) return state;

      return {
        activeScans: {
          ...state.activeScans,
          [groupId]: {
            ...scan,
            summary,
            status: 'completed',
            progress: 100,
          },
        },
      };
    });
  },

  setScanError: (groupId: string, error: string) => {
    set((state) => {
      const scan = state.activeScans[groupId];
      if (!scan) return state;

      return {
        activeScans: {
          ...state.activeScans,
          [groupId]: {
            ...scan,
            error,
            status: 'failed',
          },
        },
      };
    });
  },

  clearScan: (groupId: string) => {
    set((state) => {
      const { [groupId]: _, ...rest } = state.activeScans;
      return { activeScans: rest };
    });
  },

  getActiveScan: (groupId: string) => {
    return get().activeScans[groupId] || null;
  },

  isScanning: (groupId: string) => {
    const scan = get().activeScans[groupId];
    return scan?.status === 'running' || scan?.status === 'pending';
  },
}));
