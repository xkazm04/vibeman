/**
 * Blueprint Build Scan Library
 * Scans project for build errors and creates requirement files
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    totalErrors: number;
    totalWarnings: number;
    errorGroups: any[];
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
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute build scan (scan only, don't create requirements yet)
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
    console.log('[BuildScan] Scanning for build errors...');

    const response = await fetch('/api/build-fixer?scanOnly=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: activeProject.path,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Build scan request failed',
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Build scan failed',
      };
    }

    console.log(`[BuildScan] Found ${result.totalErrors} errors, ${result.totalWarnings} warnings`);

    return {
      success: true,
      data: {
        totalErrors: result.totalErrors,
        totalWarnings: result.totalWarnings,
        errorGroups: result.errorGroups || [],
        buildCommand: result.buildCommand,
      },
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
 * Build decision data for build scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const { totalErrors, totalWarnings, errorGroups, buildCommand } = result.data;

  // If no errors, no decision needed
  if (totalErrors === 0) {
    console.log('[BuildScan] No build errors found');
    return null;
  }

  const potentialFiles = errorGroups.length;
  const description = `Found ${totalErrors} build error${totalErrors > 1 ? 's' : ''} and ${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}.\n\nBuild command: ${buildCommand}\n\nThis will create ${potentialFiles} Claude Code requirement file${potentialFiles > 1 ? 's' : ''} for fixing.`;

  return {
    type: 'build-scan',
    title: 'Build Errors Detected',
    description,
    count: potentialFiles,
    severity: totalErrors > 10 ? 'error' : totalErrors > 5 ? 'warning' : 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    data: { totalErrors, totalWarnings, errorGroups, buildCommand },

    // Accept: Create requirement files
    onAccept: async () => {
      console.log('[BuildScan] User accepted - creating requirement files...');

      // Call API without scanOnly to create requirement files
      const response = await fetch('/api/build-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create requirement files');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create requirement files');
      }

      console.log(`[BuildScan] ✅ Created ${result.requirementFiles.length} requirement files`);
    },

    // Reject: Log rejection
    onReject: async () => {
      console.log('[BuildScan] User rejected build error fixing');
    },
  };
}
