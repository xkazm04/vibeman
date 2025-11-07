/**
 * Blueprint Photo Scan Library
 * Takes screenshots based on context test scenarios
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contextId: string;
    contextName: string;
    hasScenario: boolean;
    daysAgo: number | null;
  };
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: Record<string, unknown>;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Check if context has a test scenario
 */
async function checkTestScenario(contextId: string): Promise<{
  success: boolean;
  contextId?: string;
  contextName?: string;
  hasScenario?: boolean;
  daysAgo?: number;
  error?: string;
}> {
  const response = await fetch('/api/tester/screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contextId,
      scanOnly: true,
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `API request failed: ${response.status}`,
    };
  }

  return response.json();
}

/**
 * Execute photo scan for a specific context
 */
export async function executePhotoScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    const result = await checkTestScenario(contextId);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to check test scenario',
      };
    }

    return {
      success: true,
      data: {
        contextId: result.contextId!,
        contextName: result.contextName!,
        hasScenario: result.hasScenario!,
        daysAgo: result.daysAgo ?? null,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Photo scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for photo scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const { contextId, contextName, hasScenario, daysAgo } = result.data;

  // If no scenario, abort with message
  if (!hasScenario) {
    return {
      type: 'photo-scan-abort',
      title: 'No Test Scenario Found',
      description: `Context "${contextName}" does not have a test scenario.\n\nPlease create a test scenario first using the Context Preview Manager.`,
      severity: 'warning',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      contextId,
      data: result.data,

      // Accept: Do nothing (abort)
      onAccept: async () => {
        // User acknowledged - no scenario available
      },

      // Reject: Do nothing
      onReject: async () => {
        // User cancelled
      },
    };
  }

  // Build description with last updated info
  let description = `Context: "${contextName}"\n\nTest scenario found`;
  if (daysAgo !== null) {
    description += `\nLast screenshot: ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
  } else {
    description += '\nNo previous screenshot found';
  }
  description += '\n\nExecute screenshot now?';

  return {
    type: 'photo-scan',
    title: 'Execute Screenshot',
    description,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: result.data,

    // Accept: Execute screenshot
    onAccept: async () => {
      const response = await fetch('/api/tester/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          scanOnly: false,
        }),
      });

      const executeResult = await response.json();

      if (!response.ok || !executeResult.success) {
        throw new Error(executeResult.error || 'Failed to execute screenshot');
      }
    },

    // Reject: Cancel
    onReject: async () => {
      // User cancelled screenshot
    },
  };
}
