/**
 * Blueprint Build Scan Library
 * Scans project for build errors and creates requirement files
 *
 * NOW USES ADAPTER SYSTEM for multi-framework support
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { getInitializedRegistry } from './adapters';
import type { ScanResult as AdapterScanResult, DecisionData as AdapterDecisionData } from './adapters';

// Re-export types for backward compatibility
export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    totalErrors: number;
    totalWarnings: number;
    errorGroups: unknown[];
    buildCommand: string;
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
  data?: Record<string, unknown>;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute build scan using the adapter system
 */
export async function executeBuildScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    const registry = getInitializedRegistry();
    const result = await registry.executeScan(activeProject, 'build', { scanOnly: true });

    // Convert adapter result to legacy format
    return {
      success: result.success,
      error: result.error,
      data: result.data as any,
    };
  } catch (error) {
    console.error('[BuildScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build decision data for build scan results using the adapter system
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
    const registry = getInitializedRegistry();
    const adapter = registry.getBestAdapter(activeProject, 'build');

    if (!adapter) {
      console.error('[BuildScan] No adapter found for project type:', activeProject.type);
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
    console.error('[BuildScan] Error building decision:', error);
    return null;
  }
}
