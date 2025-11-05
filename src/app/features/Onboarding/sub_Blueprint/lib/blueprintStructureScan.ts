/**
 * Blueprint Structure Scan Library
 * Handles project structure analysis and violation detection
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';

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
 * Execute structure scan
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
    console.log('[StructureScan] Analyzing project structure...');

    const response = await fetch('/api/structure-scan/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject.id,
        projectPath: activeProject.path,
        projectType: activeProject.type || 'nextjs',
        projectName: activeProject.name,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Structure scan failed',
      };
    }

    const violations = result.violations || [];

    if (violations.length === 0) {
      console.log('[StructureScan] No violations found - project structure is compliant');
      return {
        success: true,
        violations: [],
      };
    }

    console.log(`[StructureScan] Found ${violations.length} violations`);

    return {
      success: true,
      violations,
      data: {
        projectId: activeProject.id,
        projectPath: activeProject.path,
        projectType: activeProject.type || 'nextjs',
      },
    };
  } catch (error) {
    console.error('[StructureScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build decision data for structure scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.violations || result.violations.length === 0) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const violations = result.violations;

  return {
    type: 'structure-scan',
    title: 'Structure Violations Detected',
    description: `Found ${violations.length} structure violation${violations.length > 1 ? 's' : ''} in ${activeProject.name}`,
    count: violations.length,
    severity: violations.length > 10 ? 'error' : violations.length > 5 ? 'warning' : 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type || 'nextjs',
    data: { violations },

    // Accept: Save requirements
    onAccept: async () => {
      console.log('[StructureScan] User accepted - saving requirements...');

      const saveResponse = await fetch('/api/structure-scan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          violations,
          projectPath: activeProject.path,
          projectId: activeProject.id,
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save requirements');
      }

      console.log(`[StructureScan] ✅ Saved ${saveData.requirementFiles.length} requirement files`);
    },

    // Reject: Log rejection
    onReject: async () => {
      console.log('[StructureScan] User rejected structure scan');
      // Rejection is logged by the decision system
    },
  };
}
