/**
 * Blueprint Selectors Scan Library
 * Scans context files for data-testid attributes and creates requirement files for coverage
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contextId: string;
    contextName: string;
    totalSelectors: number;
    dbCount: number;
    isDbOutdated: boolean;
    filePaths: string[];
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
 * Execute selectors scan for a specific context
 */
export async function executeSelectorsScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[SelectorsScan] No active project selected');
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    console.error('[SelectorsScan] No context ID provided');
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    console.log('[SelectorsScan] Scanning context for data-testid attributes...');

    const response = await fetch('/api/tester/selectors/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId,
        projectId: activeProject.id,
        scanOnly: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[SelectorsScan] API returned error:', result);
      return {
        success: false,
        error: result.error || `API error: ${response.status}`,
      };
    }

    if (!result.success) {
      console.error('[SelectorsScan] Scan failed:', result);
      return {
        success: false,
        error: result.error || 'Selectors scan failed',
      };
    }

    console.log(`[SelectorsScan] Found ${result.totalSelectors} in code vs ${result.dbCount} in DB`);

    return {
      success: true,
      data: {
        contextId: result.contextId,
        contextName: result.contextName,
        totalSelectors: result.totalSelectors,
        dbCount: result.dbCount,
        isDbOutdated: result.isDbOutdated,
        filePaths: result.filePaths,
      },
    };
  } catch (error) {
    console.error('[SelectorsScan] Unexpected error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Selectors scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for selectors scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'selectors-scan-error',
      title: 'Selectors Scan Failed',
      description: `An error occurred while scanning for test selectors:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
      count: 0,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => {
        console.log('[SelectorsScan] Error acknowledged');
      },
      onReject: async () => {
        console.log('[SelectorsScan] Error dismissed');
      },
    };
  }

  if (!result.data) {
    return null;
  }

  const { contextId, contextName, totalSelectors, dbCount, isDbOutdated, filePaths } = result.data;

  // Build description based on code vs DB comparison
  let description = '';
  let title = '';
  let severity: 'info' | 'warning' | 'error' = 'info';

  if (totalSelectors === 0 && dbCount === 0) {
    title = 'No Test Selectors Found';
    description = `No data-testid attributes found in context "${contextName}".\n\n**Files scanned:** ${filePaths.length}\n\nCreate a requirement file to add test selectors for better automation coverage.`;
    severity = 'warning';
  } else if (isDbOutdated) {
    title = 'Database Outdated';
    description = `Context "${contextName}" has mismatched selector data:\n\n**In Code:** ${totalSelectors} selector${totalSelectors > 1 ? 's' : ''}\n**In Database:** ${dbCount} selector${dbCount > 1 ? 's' : ''}\n**Files:** ${filePaths.length}\n\n⚠️ The database is outdated. Create a requirement file to sync and improve coverage.`;
    severity = 'warning';
  } else {
    title = 'Test Selectors Discovered';
    description = `Found ${totalSelectors} data-testid attribute${totalSelectors > 1 ? 's' : ''} in context "${contextName}".\n\n**Database Status:** ✅ Up to date (${dbCount} selectors)\n**Files:** ${filePaths.length}\n\nCreate a requirement file to improve test selector coverage?`;
    severity = 'info';
  }

  return {
    type: 'selectors-scan',
    title,
    description,
    count: totalSelectors,
    severity,
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: { contextId, contextName, totalSelectors, filePaths },

    // Accept: Create requirement file
    onAccept: async () => {
      console.log('[SelectorsScan] User accepted - creating requirement file...');

      // Call API without scanOnly to create requirement file
      const response = await fetch('/api/tester/selectors/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          projectId: activeProject.id,
          scanOnly: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create requirement file');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create requirement file');
      }

      console.log(`[SelectorsScan] ✅ Created requirement file: ${result.requirementFile}`);
    },

    // Reject: Do nothing
    onReject: async () => {
      console.log('[SelectorsScan] User rejected - no requirement file created');
    },
  };
}
