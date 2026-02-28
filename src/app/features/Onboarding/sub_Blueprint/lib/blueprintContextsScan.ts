/**
 * Blueprint Contexts Scan Library
 * Feature-based approach: Creates one Claude Code requirement per feature folder
 */

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { singleFeatureContextsScanPrompt } from './prompts/singleFeatureContextsScanPrompt';
import { toast } from 'sonner';
import FeatureScanBatchSelector from '../components/FeatureScanBatchSelector';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
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
  customContent?: React.ReactNode;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Discover feature folders based on project type
 */
async function discoverFeatureFolders(projectPath: string, projectType: string): Promise<string[]> {
  try {
    let featureFoldersPath: string;

    if (projectType === 'nextjs') {
      // Use forward slashes for consistency
      featureFoldersPath = `${projectPath}/src/app/features`.replace(/\\/g, '/');
    } else if (projectType === 'fastapi') {
      featureFoldersPath = `${projectPath}/routes`.replace(/\\/g, '/');
    } else {
      throw new Error(`Unsupported project type: ${projectType}`);
    }

    console.log('[Feature Discovery] Listing directories at:', featureFoldersPath);

    // Use the new list-directories API
    const response = await fetch('/api/disk/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'directories',
        path: featureFoldersPath,
      }),
    });

    if (!response.ok) {
      console.warn('[Feature Discovery] API call failed:', response.status);
      return [];
    }

    const result = await response.json();
    if (!result.success || !Array.isArray(result.directories)) {
      console.warn('[Feature Discovery] Invalid response:', result);
      return [];
    }

    // Extract folder names
    const folders = result.directories.map((item: any) => item.name);

    console.log('[Feature Discovery] Found folders:', folders);
    return folders;
  } catch (error) {
    console.error('[Feature Discovery] Error:', error);
    return [];
  }
}

/**
 * Execute contexts scan - Feature-based Pre-scan phase
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
    // Discover feature folders
    const projectType = activeProject.type || 'nextjs';
    const featureFolders = await discoverFeatureFolders(activeProject.path, projectType);

    if (featureFolders.length === 0) {
      return {
        success: false,
        error: `No feature folders found in project. Expected folders at: ${projectType === 'nextjs' ? 'src/app/features/' : 'routes/'}`,
      };
    }

    // Pre-scan returns success with feature info
    return {
      success: true,
      data: {
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        projectType,
        featureFolders,
        featureCount: featureFolders.length,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to prepare contexts scan';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Create requirement file for a single feature scan
 */
async function createFeatureRequirement(
  featureName: string,
  projectId: string,
  projectName: string,
  projectPath: string,
  projectPort: number,
  projectType: string
): Promise<{ requirementName: string; requirementPath: string }> {
  const featurePath = projectType === 'nextjs'
    ? `src/app/features/${featureName}`
    : `routes/${featureName}`;

  // Build feature scan prompt
  const promptContent = singleFeatureContextsScanPrompt({
    projectId,
    projectName,
    projectPath,
    projectPort,
    projectType,
    featureName,
    featurePath,
  });

  const requirementName = `contexts-scan-${featureName.toLowerCase().replace(/\s+/g, '-')}`;

  // Create requirement file
  const response = await fetch('/api/claude-code/requirement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      content: promptContent,
      overwrite: true,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create requirement file');
  }

  return {
    requirementName,
    requirementPath: result.filePath,
  };
}

/**
 * Create event for feature-based scan queued
 */
async function createFeatureScanEvent(
  projectId: string,
  featureCount: number,
  taskIds: string[]
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      title: 'Feature-Based Contexts Scan Queued',
      description: `${featureCount} feature scans have been queued for background execution. Each feature will be analyzed independently. Check the TaskRunner or bottom task bar for progress.`,
      type: 'info',
      agent: 'blueprint',
      message: `Task IDs: ${taskIds.join(', ')}`,
    }),
  });
}

/**
 * Execute feature scan with selected batch
 */
async function executeFeatureScan(
  featureFolders: string[],
  projectId: string,
  projectName: string,
  projectPath: string,
  projectPort: number,
  projectType: string,
  featureCount: number,
  batchId: string
): Promise<void> {
  try {
    const taskIds: string[] = [];

    for (const featureName of featureFolders) {
      try {
        const { requirementName } = await createFeatureRequirement(
          featureName,
          projectId,
          projectName,
          projectPath,
          projectPort,
          projectType
        );

        const taskId = `${projectId}:${requirementName}`;
        taskIds.push(taskId);
        console.log(`[Feature Scan] Created task for ${featureName}:`, taskId);
      } catch (error) {
        console.error(`[Feature Scan] Failed to create requirement for ${featureName}:`, error);
      }
    }

    await createFeatureScanEvent(projectId, featureCount, taskIds);

    console.log('[Feature Scan] All requirements created:', {
      featureCount,
      batchId,
      taskIds,
    });

    toast.success(`${featureCount} feature scans queued`, {
      description: `All features will be analyzed independently. Check TaskRunner for progress.`,
    });
  } catch (error) {
    console.error('[Feature Scan] Failed to queue tasks:', error);
    toast.error('Failed to queue feature scans', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Build decision data for contexts scan
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[Contexts Scan] No active project');
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'contexts-scan-error',
      title: 'Contexts Scan Failed',
      description: `An error occurred while preparing the contexts scan:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => {
        // Error acknowledged
      },
      onReject: async () => {
        // Error dismissed
      },
    };
  }

  if (!result.data) {
    console.error('[Contexts Scan] result.data is missing');
    return null;
  }

  const featureFolders = (result.data.featureFolders as string[]) || [];
  const featureCount = featureFolders.length;
  const projectType = result.data.projectType as string;

  const description = `🔍 **Project**: ${activeProject.name}
📁 **Path**: ${activeProject.path}
🎯 **Project Type**: ${projectType}
📦 **Features Discovered**: ${featureCount}

**Features to analyze:**
${featureFolders.slice(0, 10).map((f, i) => `${i + 1}. ${f}`).join('\n')}${featureCount > 10 ? `\n... and ${featureCount - 10} more` : ''}

**New Strategy: Feature-by-Feature Analysis**

Instead of analyzing the entire codebase at once, this scan will:
✅ **Create ${featureCount} separate Claude Code requirements** (one per feature)
✅ **Analyze each feature independently** with full context
✅ **Run in parallel** via TaskRunner for faster completion
✅ **Generate 1-3 contexts per feature** based on size and complexity
✅ **Include test scenarios** for UI features

**Why this works better:**
- Smaller, focused analysis = higher success rate
- Claude Code can deeply understand each feature
- Parallel execution = faster overall completion
- Better context quality and organization

**This will create ${featureCount} requirement files** and add them to your selected TaskRunner batch for execution.

Click **Select Batch & Start** to choose a batch and begin the scan.`;

  // Create custom content with batch selection
  const customContent = React.createElement(FeatureScanBatchSelector, {
    description,
    onStart: async (batchId: string) => {
      await executeFeatureScan(
        featureFolders,
        activeProject.id,
        activeProject.name,
        activeProject.path,
        activeProject.port ?? 3000,
        projectType,
        featureCount,
        batchId
      );

      // Accept decision after successful execution
      const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
      useDecisionQueueStore.getState().acceptDecision();
    },
    onCancel: async () => {
      console.log('[Feature Scan] User cancelled scan');
      const { useDecisionQueueStore } = await import('@/stores/decisionQueueStore');
      useDecisionQueueStore.getState().rejectDecision();
    },
  });

  return {
    type: 'feature-scan-confirm',
    title: 'Generate Feature-Based Scan Requirements?',
    description,
    count: featureCount,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType,
    data: result.data,
    customContent,

    // Fallback handlers (not used when customContent is present)
    onAccept: async () => {},
    onReject: async () => {},
  };
}
