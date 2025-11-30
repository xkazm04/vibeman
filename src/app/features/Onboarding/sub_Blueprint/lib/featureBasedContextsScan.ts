/**
 * Feature-Based Contexts Scan Library
 * Creates one Claude Code requirement per feature folder for focused analysis
 */

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { singleFeatureContextsScanPrompt } from './prompts/singleFeatureContextsScanPrompt';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import type { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { isBatchRunning } from '@/app/features/TaskRunner/lib/types';
import { toast } from 'sonner';
import path from 'path';
import fs from 'fs/promises';
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
      featureFoldersPath = path.join(projectPath, 'src', 'app', 'features');
    } else if (projectType === 'fastapi') {
      featureFoldersPath = path.join(projectPath, 'routes');
    } else {
      throw new Error(`Unsupported project type: ${projectType}`);
    }

    // Check if folder exists
    try {
      await fs.access(featureFoldersPath);
    } catch {
      return []; // Folder doesn't exist
    }

    // Read all entries in the folder
    const entries = await fs.readdir(featureFoldersPath, { withFileTypes: true });

    // Filter to only directories
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(featureFoldersPath, entry.name),
        relativePath: projectType === 'nextjs'
          ? `src/app/features/${entry.name}`
          : `routes/${entry.name}`
      }));

    return folders.map(f => f.name);
  } catch (error) {
    console.error('[Feature Discovery] Error:', error);
    return [];
  }
}

/**
 * Execute feature-based contexts scan - Pre-scan phase
 */
export async function executeFeatureBasedContextsScan(): Promise<ScanResult> {
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

    // Pre-scan does nothing - just returns success with feature info
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
    const errorMsg = error instanceof Error ? error.message : 'Failed to prepare feature-based scan';
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
  batchId: BatchId
): Promise<void> {
  try {
    const taskRunnerStore = useTaskRunnerStore.getState();
    const taskIds: string[] = [];

    // Ensure batch exists
    let batch = taskRunnerStore.batches[batchId];
    if (!batch) {
      taskRunnerStore.createBatch(batchId, 'Feature Context Scans', []);
      // Re-fetch batch after creation
      batch = useTaskRunnerStore.getState().batches[batchId];
    }

    // Create requirement for each feature
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

        // Build task ID
        const taskId = `${projectId}:${requirementName}`;
        taskIds.push(taskId);

        // Add task to batch
        taskRunnerStore.addTaskToBatch(batchId, taskId);
        console.log(`[Feature Scan] Added task for ${featureName} to ${batchId}:`, taskId);
      } catch (error) {
        console.error(`[Feature Scan] Failed to create requirement for ${featureName}:`, error);
        // Continue with other features
      }
    }

    // Re-fetch current batch state before starting
    batch = useTaskRunnerStore.getState().batches[batchId];
    if (batch && !isBatchRunning(batch.status) && taskIds.length > 0) {
      taskRunnerStore.startBatch(batchId);
      console.log('[Feature Scan] Started batch:', batchId);
    }

    // Create event
    await createFeatureScanEvent(projectId, featureCount, taskIds);

    console.log('[Feature Scan] All requirements created:', {
      featureCount,
      batchId,
      taskIds,
    });

    // Show success toast
    toast.success(`${featureCount} feature scans queued in ${batchId}`, {
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
 * Build decision data for feature-based contexts scan
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    console.error('[Feature-Based Scan] No active project');
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'feature-scan-error',
      title: 'Feature Scan Failed',
      description: `An error occurred while preparing the feature-based scan:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
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
    console.error('[Feature-Based Scan] result.data is missing');
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
    onStart: async (batchId: BatchId) => {
      await executeFeatureScan(
        featureFolders,
        activeProject.id,
        activeProject.name,
        activeProject.path,
        activeProject.port,
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
