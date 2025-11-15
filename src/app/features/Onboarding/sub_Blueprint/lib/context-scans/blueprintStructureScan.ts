/**
 * Blueprint Structure Scan Library
 * Handles project structure analysis and violation detection
 *
 * NOW USES ADAPTER SYSTEM for multi-framework support
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { getInitializedRegistry } from '../adapters';
import type { ScanResult as AdapterScanResult } from '../adapters';

export interface StructureViolation {
  file: string;
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ScanResult {
  success: boolean;
  error?: string;
  violations?: StructureViolation[];
  data?: {
    violations: StructureViolation[];
    summary?: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
    };
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
 * Execute structure scan using Web Worker (offloads to background thread)
 */
export async function executeStructureScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    // Dynamically import worker utilities to avoid bundling issues
    const { executeStructureScanWithWorker } = await import('../blueprintScansWithWorkers');

    // Execute scan in Web Worker
    return await executeStructureScanWithWorker();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Structure scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for structure scan results using the adapter system
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.violations || result.violations.length === 0) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  try {
    // Use the adapter framework
    const registry = getInitializedRegistry();
    const adapter = registry.getBestAdapter(activeProject, 'structure');

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
  } catch {
    return null;
  }
}
