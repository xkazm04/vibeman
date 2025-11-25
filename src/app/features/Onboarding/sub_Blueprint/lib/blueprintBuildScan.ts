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
 * Execute build scan using Web Worker (offloads to background thread)
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
    // Dynamically import worker utilities to avoid bundling issues
    const { executeBuildScanWithWorker } = await import('./blueprintScansWithWorkers');

    // Execute scan in Web Worker
    return await executeBuildScanWithWorker();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Build scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
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
      return null;
    }

    // Convert legacy result to adapter format
    const adapterResult: AdapterScanResult = {
      success: result.success,
      error: result.error,
      data: result.data,
    };

    const decision = adapter.buildDecision(adapterResult, activeProject);

    if (!decision) return null;

    return {
      ...decision,
      onReject: decision.onReject || (async () => { }),
    } as DecisionData;
  } catch (error) {
    return null;
  }
}
