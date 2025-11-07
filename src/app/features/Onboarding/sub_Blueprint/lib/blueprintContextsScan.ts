/**
 * Blueprint Contexts Scan Library
 * Scans and generates contexts for the project
 *
 * NOW USES ADAPTER SYSTEM for multi-framework support
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';
import { getInitializedRegistry } from './adapters';
import type { ScanResult as AdapterScanResult } from './adapters';

interface ContextData {
  id: string;
  name: string;
  description?: string;
  filePaths: string[];
  groupId?: string | null;
  groupName?: string | null;
}

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    contexts: ContextData[];
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
  data?: Record<string, unknown>;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute contexts scan using the adapter system
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
    // Use the adapter framework
    const registry = getInitializedRegistry();
    const provider = DefaultProviderStorage.getDefaultProvider();
    const result = await registry.executeScan(activeProject, 'contexts', { provider });

    // Convert adapter result to legacy format
    return {
      success: result.success,
      error: result.error,
      data: result.data as any,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Context scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for contexts scan results using the adapter system
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  try {
    // Use the adapter framework
    const registry = getInitializedRegistry();
    const adapter = registry.getBestAdapter(activeProject, 'contexts');

    if (!adapter) {
      return null;
    }

    // Convert legacy result to adapter format
    const adapterResult: AdapterScanResult = {
      success: result.success,
      error: result.error,
      data: result.data,
    };

    return adapter.buildDecision(adapterResult, activeProject);
  } catch (error) {
    return null;
  }
}
