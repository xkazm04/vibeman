/**
 * Blueprint Vision Scan Library
 * Generates high-level project documentation using Claude Code
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { executePipeline } from './pipeline';
import { useBlueprintStore } from '../store/blueprintStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    taskId: string;
    requirementPath: string;
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
 * Execute vision scan using Claude Code pipeline
 */
export async function executeVisionScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  try {
    // Build requirement content via API (server-side)
    const buildResponse = await fetch('/api/blueprint/vision-requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: activeProject.name,
        projectPath: activeProject.path,
        projectId: activeProject.id,
      }),
    });

    const buildResult = await buildResponse.json();

    if (!buildResult.success || !buildResult.requirementContent) {
      return {
        success: false,
        error: buildResult.error || 'Failed to build requirement content',
      };
    }

    // Execute pipeline with progress tracking
    const result = await executePipeline({
      projectPath: activeProject.path,
      projectId: activeProject.id,
      requirementName: 'vision-scan',
      requirementContent: buildResult.requirementContent,
      onProgress: (progress, message) => {
        // Update Blueprint store with progress
        useBlueprintStore.getState().updateScanProgress(progress);
        console.log(`[Vision Scan] ${progress}%: ${message}`);
      },
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Pipeline execution failed',
      };
    }

    return {
      success: true,
      data: {
        taskId: result.taskId || '',
        requirementPath: result.requirementPath || '',
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Vision scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for vision scan
 * This shows after scan completes successfully
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const { taskId } = result.data;

  return {
    type: 'vision-scan',
    title: 'Vision Scan Completed',
    description: `✅ Claude Code has successfully generated high-level documentation for **${activeProject.name}**.\n\n📄 **Output Location**: \`context/high.md\`\n\n🔍 **Task ID**: ${taskId}\n\nThe documentation includes:\n- Project overview and purpose\n- Architecture and tech stack\n- Key features and capabilities\n- Project structure\n- Development workflow\n- Design patterns\n\nClick **Accept** to acknowledge completion.`,
    count: 1,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    data: { taskId },

    // Accept: Acknowledge completion
    onAccept: async () => {
      // Task already completed, just acknowledge
      console.log('[Vision Scan] User acknowledged completion');
    },

    // Reject: Not applicable for this scan
    onReject: async () => {
      console.log('[Vision Scan] User dismissed notification');
    },
  };
}
