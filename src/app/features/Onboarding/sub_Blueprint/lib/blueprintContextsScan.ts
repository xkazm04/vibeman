/**
 * Blueprint Contexts Scan Library
 * Scans and generates contexts for the project
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contexts: any[];
    stats: {
      scanned: number;
      saved: number;
      failed: number;
      skippedDuplicates: number;
    };
    savedContexts: Array<{
      id: string;
      name: string;
      filePaths: string[];
      groupId: string | null;
      groupName: string | null;
    }>;
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
  projectType?: string;
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute contexts scan (scan only, don't save yet)
 */
export async function executeContextsScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    console.log('[ContextsScan] Scanning for contexts...');

    // Use the full scripted-scan-and-save endpoint for now
    // It handles scanning, metadata generation, and saving
    const response = await fetch('/api/contexts/scripted-scan-and-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectPath: activeProject.path,
        projectType: activeProject.type || 'nextjs',
        provider: DefaultProviderStorage.getDefaultProvider(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Context scan failed',
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Context scan failed',
      };
    }

    console.log(`[ContextsScan] ✅ Scanned and saved ${result.stats.saved} contexts`);

    return {
      success: true,
      data: {
        contexts: [],
        stats: result.stats,
        savedContexts: result.savedContexts || [],
      },
    };
  } catch (error) {
    console.error('[ContextsScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build decision data for contexts scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const { stats, savedContexts } = result.data;

  // If no contexts were saved, no decision needed
  if (stats.saved === 0) {
    console.log('[ContextsScan] No contexts saved - skipping decision');
    return null;
  }

  // Build description from saved contexts
  const contextNames = savedContexts.map((c: any) => c.name).join(', ');
  const description = `Successfully processed ${stats.scanned} contexts:\n- Saved: ${stats.saved}\n- Failed: ${stats.failed}\n- Skipped (duplicates): ${stats.skippedDuplicates}\n\nContext names: ${contextNames}`;

  return {
    type: 'contexts-scan',
    title: 'Contexts Updated',
    description,
    count: stats.scanned + stats.saved,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type || 'nextjs',
    data: { stats, savedContexts },

    // Accept: Contexts already saved, just log
    onAccept: async () => {
      console.log('[ContextsScan] User acknowledged context updates');
    },

    // Reject: No action needed
    onReject: async () => {
      console.log('[ContextsScan] User dismissed context updates');
    },
  };
}
