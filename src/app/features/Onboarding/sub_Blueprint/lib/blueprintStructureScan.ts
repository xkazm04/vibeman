/**
 * Blueprint Structure Scan Library
 * Handles project structure analysis and violation detection
 *
 * NOW USES ADAPTER SYSTEM for multi-framework support
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { getInitializedRegistry } from './adapters';
import type { ScanResult as AdapterScanResult } from './adapters';

export interface ScanResult {
  success: boolean;
  error?: string;
  violations?: any[];
  data?: any;
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
 * Execute structure scan using the adapter system
 */
export async function executeStructureScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[StructureScan] No active project selected');
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    console.log('[StructureScan] Analyzing project structure...');

    // Use the adapter framework
    const registry = getInitializedRegistry();
    const result = await registry.executeScan(activeProject, 'structure');

    // Convert adapter result to legacy format
    if (!result.success) {
      console.error('[StructureScan] Scan failed:', result.error);
    }

    return {
      success: result.success,
      error: result.error,
      violations: result.data?.violations || [],
      data: result.data,
    };
  } catch (error) {
    console.error('[StructureScan] Unexpected error:', error);
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
      console.error('[StructureScan] No adapter found for project type:', activeProject.type);
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
    console.error('[StructureScan] Error building decision:', error);
    return null;
  }
}
