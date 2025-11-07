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
  data?: {
    contextId: string;
    contextName: string;
    totalSelectors: number;
    filePaths: string[];
    error?: string;
  };
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute selectors scan for a specific context
 */
export async function executeSelectorsScan(contextId: string): Promise<ScanResult> {
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
      return {
        success: false,
        error: result.error || `API error: ${response.status}`,
      };
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Selectors scan failed',
      };
    }

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
    const errorMsg = error instanceof Error ? error.message : 'Selectors scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build error decision data
 */
function buildErrorDecision(
  error: string | undefined,
  activeProject: { id: string; path: string }
): DecisionData {
  return {
    type: 'selectors-scan-error',
    title: 'Selectors Scan Failed',
    description: `An error occurred while scanning for test selectors:\n\n${error || 'Unknown error'}\n\nPlease check the console for more details.`,
    count: 0,
    severity: 'error',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    data: { error, contextId: '', contextName: '', totalSelectors: 0, filePaths: [] },
    onAccept: async () => {
      // Error acknowledged
    },
    onReject: async () => {
      // Error dismissed
    },
  };
}

/**
 * Build description and metadata for selector scan results
 */
function buildScanResultMetadata(
  contextName: string,
  totalSelectors: number,
  dbCount: number,
  isDbOutdated: boolean,
  fileCount: number
): { title: string; description: string; severity: 'info' | 'warning' | 'error' } {
  if (totalSelectors === 0 && dbCount === 0) {
    return {
      title: 'No Test Selectors Found',
      description: `No data-testid attributes found in context "${contextName}".\n\n**Files scanned:** ${fileCount}\n\nCreate a requirement file to add test selectors for better automation coverage.`,
      severity: 'warning',
    };
  }

  if (isDbOutdated) {
    return {
      title: 'Database Outdated',
      description: `Context "${contextName}" has mismatched selector data:\n\n**In Code:** ${totalSelectors} selector${totalSelectors > 1 ? 's' : ''}\n**In Database:** ${dbCount} selector${dbCount > 1 ? 's' : ''}\n**Files:** ${fileCount}\n\n⚠️ The database is outdated. Create a requirement file to sync and improve coverage.`,
      severity: 'warning',
    };
  }

  return {
    title: 'Test Selectors Discovered',
    description: `Found ${totalSelectors} data-testid attribute${totalSelectors > 1 ? 's' : ''} in context "${contextName}".\n\n**Database Status:** ✅ Up to date (${dbCount} selectors)\n**Files:** ${fileCount}\n\nCreate a requirement file to improve test selector coverage?`,
    severity: 'info',
  };
}

/**
 * Create requirement file via API
 */
async function createRequirementFile(contextId: string, projectId: string): Promise<void> {
  const response = await fetch('/api/tester/selectors/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contextId,
      projectId,
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
    return buildErrorDecision(result.error, activeProject);
  }

  if (!result.data) {
    return null;
  }

  const { contextId, contextName, totalSelectors, dbCount, isDbOutdated, filePaths } = result.data;

  const metadata = buildScanResultMetadata(
    contextName,
    totalSelectors,
    dbCount,
    isDbOutdated,
    filePaths.length
  );

  return {
    type: 'selectors-scan',
    title: metadata.title,
    description: metadata.description,
    count: totalSelectors,
    severity: metadata.severity,
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId,
    data: { contextId, contextName, totalSelectors, filePaths },

    // Accept: Create requirement file
    onAccept: async () => {
      await createRequirementFile(contextId, activeProject.id);
    },

    // Reject: Do nothing
    onReject: async () => {
      // No requirement file created
    },
  };
}
