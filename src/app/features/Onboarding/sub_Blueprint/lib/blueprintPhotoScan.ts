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
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute photo scan for a specific context
 */
export async function executePhotoScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[PhotoScan] No active project selected');
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    console.error('[PhotoScan] No context ID provided');
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    console.log('[PhotoScan] Checking test scenario for context...');

    // Call screenshot API in scanOnly mode to check scenario
    const response = await fetch('/api/tester/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId,
        scanOnly: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PhotoScan] API request failed:', response.status, errorText);
      return {
        success: false,
        error: `API request failed: ${response.status}`,
      };
    }

    const result = await response.json();

    if (!result.success) {
      console.error('[PhotoScan] Scan failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to check test scenario',
      };
    }

    console.log(`[PhotoScan] Context "${result.contextName}" - Scenario: ${result.hasScenario ? 'Found' : 'Not found'}`);

    return {
      success: true,
      data: {
        contextId: result.contextId,
        contextName: result.contextName,
        hasScenario: result.hasScenario,
        daysAgo: result.daysAgo,
      },
    };
  } catch (error) {
    console.error('[PhotoScan] Unexpected error:', error);
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
        console.log('[PhotoScan] User acknowledged - no scenario available');
      },

      // Reject: Do nothing
      onReject: async () => {
        console.log('[PhotoScan] User cancelled');
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
      console.log('[PhotoScan] User confirmed - executing screenshot...');

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

      console.log(`[PhotoScan] ✅ Screenshot saved: ${executeResult.screenshotPath}`);
    },

    // Reject: Cancel
    onReject: async () => {
      console.log('[PhotoScan] User cancelled screenshot');
    },
  };
}
