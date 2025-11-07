/**
 * Blueprint Vision Scan Library
 * Generates high-level project documentation (AI Docs)
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    filePath: string;
    content: string;
    projectPath: string;
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
  data?: {
    content: string;
    filePath: string;
    projectPath: string;
  };
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Generate AI documentation via API call
 */
async function generateAIDocs(
  projectName: string,
  projectPath: string,
  projectId: string
): Promise<{ success: boolean; review?: string; error?: string }> {
  const response = await fetch('/api/projects/ai-docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName,
      projectPath,
      projectId,
      analysis: {},
      provider: DefaultProviderStorage.getDefaultProvider(),
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: `Failed to generate documentation: ${response.status}`,
    };
  }

  return response.json();
}

/**
 * Execute vision scan (generate high-level AI docs, but don't save yet)
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
    const result = await generateAIDocs(
      activeProject.name,
      activeProject.path,
      activeProject.id
    );

    if (!result.success || !result.review) {
      return {
        success: false,
        error: result.error || 'Failed to generate documentation',
      };
    }

    // Return the generated content without saving yet
    return {
      success: true,
      data: {
        filePath: 'context/high.md',
        content: result.review,
        projectPath: activeProject.path,
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
 * Build decision data for vision scan results
 * User must accept to save the documentation to context/high.md
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  if (!result.success || !result.data) {
    return null;
  }

  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  const { content, filePath, projectPath } = result.data;
  const wordCount = content.split(/\s+/).length;

  return {
    type: 'vision-scan',
    title: 'Project Documentation Generated',
    description: `Generated high-level project documentation (${wordCount} words).\n\nThis will be saved to: ${filePath}\n\nAccept to save the documentation, or Reject to discard.`,
    count: 1,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    data: { content, filePath, projectPath },

    // Accept: Save documentation to context/high.md
    onAccept: async () => {
      const saveResponse = await fetch('/api/disk/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: 'context',
          fileName: 'high.md',
          content: content,
          projectPath: projectPath,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save documentation to context/high.md');
      }

      const saveResult = await saveResponse.json();

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save documentation');
      }
    },

    // Reject: Discard documentation
    onReject: async () => {
      // Documentation discarded - no action needed
    },
  };
}
