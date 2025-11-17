/**
 * Blueprint Unused Code Scan Library
 * Handles detection of unused components in Next.js projects
 */

import React from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { generateCleanupPrompt } from './prompts/unusedCleanup';
import { generateIntegrationPrompt } from './prompts/unusedIntegration';
import UnusedFileDecision from '../components/UnusedFileDecision';

export interface ScanResult {
  success: boolean;
  error?: string;
  unusedFiles?: Array<{
    filePath: string;
    relativePath: string;
    exports: string[];
    reason: string;
  }>;
  stats?: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
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
  customContent?: React.ReactNode;
  titleActions?: Array<{
    label: string;
    icon: any;
    onClick: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    disabled?: boolean;
    testId?: string;
  }>;
  data?: {
    unusedFiles: Array<{
      filePath: string;
      relativePath: string;
      exports: string[];
      reason: string;
    }>;
    stats?: {
      totalFiles: number;
      totalExports: number;
      unusedExports: number;
    };
    fileSelections?: Record<string, string>;
  };
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
}

/**
 * Process a streaming message from the unused code scan
 */
async function processStreamMessage(line: string): Promise<{
  type: 'progress' | 'complete' | 'error' | 'skip';
  result?: ScanResult;
  error?: string;
  progress?: number;
}> {
  if (!line.trim()) {
    return { type: 'skip' };
  }

  try {
    const message = JSON.parse(line);

    if (message.type === 'progress') {
      // Update progress in store
      const { useBlueprintStore } = await import('../store/blueprintStore');
      useBlueprintStore.getState().updateScanProgress(message.progress);
      return { type: 'progress', progress: message.progress };
    }

    if (message.type === 'complete') {
      return { type: 'complete', result: message.result };
    }

    if (message.type === 'error') {
      return { type: 'error', error: message.error };
    }
  } catch {
    // Ignore parse errors for malformed messages
  }

  return { type: 'skip' };
}

/**
 * Read and process streaming response from unused code scan
 */
async function processStreamingResponse(body: ReadableStream<Uint8Array>): Promise<ScanResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: ScanResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode chunk and add to buffer
    buffer += decoder.decode(value, { stream: true });

    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const processed = await processStreamMessage(line);

      if (processed.type === 'complete' && processed.result) {
        finalResult = processed.result;
      } else if (processed.type === 'error') {
        return {
          success: false,
          error: processed.error || 'Scan error',
        };
      }
    }
  }

  if (!finalResult) {
    return {
      success: false,
      error: 'No result received from scan',
    };
  }

  return finalResult;
}

/**
 * Execute unused code scan with streaming progress updates
 */
export async function executeUnusedScan(): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  // Only support Next.js projects
  if (activeProject.type !== 'nextjs') {
    return {
      success: false,
      error: 'Unused code scan only supports Next.js projects',
    };
  }

  try {
    const response = await fetch('/api/unused-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: activeProject.path,
        projectType: activeProject.type,
        stream: true,
      }),
    });

    if (!response.body) {
      return {
        success: false,
        error: 'No response body received',
      };
    }

    const result = await processStreamingResponse(response.body);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      unusedFiles: result.unusedFiles || [],
      stats: result.stats,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unused scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for unused code scan results
 * Shows file selection UI with title-level actions
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const unusedFiles = result.unusedFiles || [];
  const stats = result.stats;

  // Handle case where no unused files found
  if (unusedFiles.length === 0) {
    return {
      type: 'unused-scan-result',
      title: 'No Unused Code Found',
      description: `✅ All components and modules are being used.`,
      count: 0,
      severity: 'info' as const,
      projectId: activeProject.id,
      projectPath: activeProject.path,
      projectType: activeProject.type,
      data: { unusedFiles: [], stats },
      onAccept: async () => { },
      onReject: async () => { },
    };
  }

  // Track file selections via closure
  let fileSelections: Record<string, string> = {};

  // Handler for creating Claude Code requirements based on selections
  const handleAccept = async () => {
    const cleanFiles = unusedFiles.filter((_, index) => fileSelections[`file-${index}`] === 'clean');
    const integrateFiles = unusedFiles.filter((_, index) => fileSelections[`file-${index}`] === 'integrate');

    if (cleanFiles.length === 0 && integrateFiles.length === 0) {
      console.warn('[UnusedScan] No files selected for action');
      alert('Please select at least one action (Delete or Integrate) for the files before proceeding.');
      throw new Error('No files selected'); // Prevent decision from closing
    }

    try {
      // Create cleanup requirement if any files selected for deletion
      if (cleanFiles.length > 0) {
        const cleanupPrompt = generateCleanupPrompt({
          unusedFiles: cleanFiles,
          stats,
        });

        const cleanupResponse = await fetch('/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: activeProject.path,
            requirementName: `unused-cleanup-${Date.now()}`,
            content: cleanupPrompt,
            overwrite: false,
          }),
        });

        if (!cleanupResponse.ok) {
          throw new Error('Failed to create cleanup requirement');
        }

        const cleanupResult = await cleanupResponse.json();
        console.log('[UnusedScan] Cleanup requirement created:', cleanupResult);
      }

      // Create integration requirement if any files selected for integration
      if (integrateFiles.length > 0) {
        const integrationPrompt = generateIntegrationPrompt({
          unusedFiles: integrateFiles,
          stats,
        });

        const integrationResponse = await fetch('/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: activeProject.path,
            requirementName: `unused-integration-${Date.now()}`,
            content: integrationPrompt,
            overwrite: false,
          }),
        });

        if (!integrationResponse.ok) {
          throw new Error('Failed to create integration requirement');
        }

        const integrationResult = await integrationResponse.json();
        console.log('[UnusedScan] Integration requirement created:', integrationResult);
      }

      console.log(`[UnusedScan] ✅ Successfully created ${cleanFiles.length} cleanup, ${integrateFiles.length} integration requirements`);
    } catch (error) {
      console.error('[UnusedScan] ❌ Error creating requirements:', error);
      alert(`Failed to create requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to prevent decision from closing
    }
  };

  // Simplified description - UI elements replace verbose instructions
  const description = `Select actions for each file. **${stats?.totalFiles || unusedFiles.length}** files analyzed, **${stats?.unusedExports || unusedFiles.length}** unused exports detected.`;

  // Custom content with file selection grid
  const customContent = React.createElement(UnusedFileDecision, {
    unusedFiles,
    onSelectionChange: (selections) => {
      fileSelections = selections;
    },
  });

  // Build title actions (top-right buttons)
  const { Check, X } = require('lucide-react');
  const titleActions = [
    {
      label: 'Cancel',
      icon: X,
      onClick: async () => {
        // DecisionPanel will handle calling rejectDecision
        console.log('[UnusedScan] Cancelled by user');
      },
      variant: 'secondary' as const,
      testId: 'unused-scan-cancel-btn',
    },
    {
      label: 'Create Requirements',
      icon: Check,
      onClick: handleAccept,
      variant: 'primary' as const,
      testId: 'unused-scan-accept-btn',
    },
  ];

  return {
    type: 'unused-scan-selection',
    title: 'Select Actions for Unused Files',
    description,
    count: unusedFiles.length,
    severity: unusedFiles.length > 20 ? 'warning' : 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type,
    customContent,
    titleActions,
    data: {
      unusedFiles,
      stats,
    },

    // Handlers handled by titleActions
    onAccept: handleAccept,
    onReject: async () => {
      console.log('[UnusedScan] Rejected');
    },
  };
}
