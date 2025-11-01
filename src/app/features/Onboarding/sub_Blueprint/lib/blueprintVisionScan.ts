/**
 * Blueprint Vision Scan Library
 * Generates high-level project documentation (AI Docs)
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { DefaultProviderStorage } from '@/lib/llm';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Execute vision scan (generate high-level AI docs)
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
    console.log('[VisionScan] Generating high-level documentation...');

    const response = await fetch('/api/projects/ai-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: activeProject.name,
        projectPath: activeProject.path,
        projectId: activeProject.id,
        analysis: {},
        provider: DefaultProviderStorage.getDefaultProvider(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to generate documentation',
      };
    }

    const result = await response.json();

    if (!result.success || !result.review) {
      return {
        success: false,
        error: result.error || 'Failed to generate documentation',
      };
    }

    console.log('[VisionScan] Documentation generated successfully');

    // Auto-save to context/high.md
    const saveResponse = await fetch('/api/disk/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderPath: 'context',
        fileName: 'high.md',
        content: result.review,
        projectPath: activeProject.path,
      }),
    });

    if (!saveResponse.ok) {
      return {
        success: false,
        error: 'Generated docs but failed to save to context/high.md',
      };
    }

    const saveResult = await saveResponse.json();

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || 'Failed to save documentation',
      };
    }

    console.log('[VisionScan] ✅ Saved to context/high.md');

    return {
      success: true,
      data: {
        filePath: 'context/high.md',
        content: result.review,
      },
    };
  } catch (error) {
    console.error('[VisionScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Vision scan doesn't need user decision - it runs directly
 * Returns null to indicate no decision panel needed
 */
export function buildDecisionData(): null {
  return null;
}
