/**
 * Blueprint Unused Code Scan Library
 * Handles detection of unused components in Next.js projects
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';

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
  data?: any;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
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
    console.log('[UnusedScan] Analyzing project for unused code...');

    const response = await fetch('/api/unused-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: activeProject.path,
        projectType: activeProject.type,
        stream: true, // Enable streaming
      }),
    });

    if (!response.body) {
      return {
        success: false,
        error: 'No response body received',
      };
    }

    // Read streaming response
    const reader = response.body.getReader();
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
        if (!line.trim()) continue;

        try {
          const message = JSON.parse(line);

          if (message.type === 'progress') {
            // Update progress in store
            const { useBlueprintStore } = await import('../store/blueprintStore');
            useBlueprintStore.getState().updateScanProgress(message.progress);

            console.log(`[UnusedScan] Progress: ${message.current}/${message.total} - ${message.currentFile}`);
          } else if (message.type === 'complete') {
            finalResult = message.result;
          } else if (message.type === 'error') {
            return {
              success: false,
              error: message.error,
            };
          }
        } catch (parseError) {
          console.error('[UnusedScan] Failed to parse message:', line);
        }
      }
    }

    if (!finalResult) {
      return {
        success: false,
        error: 'No result received from scan',
      };
    }

    if (!finalResult.success) {
      return {
        success: false,
        error: finalResult.error || 'Unused code scan failed',
      };
    }

    const unusedFiles = finalResult.unusedFiles || [];

    if (unusedFiles.length === 0) {
      console.log('[UnusedScan] No unused code found - project is clean');
      return {
        success: true,
        unusedFiles: [],
        stats: finalResult.stats,
      };
    }

    console.log(`[UnusedScan] Found ${unusedFiles.length} unused files`);

    return {
      success: true,
      unusedFiles,
      stats: finalResult.stats,
    };
  } catch (error) {
    console.error('[UnusedScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build decision data for unused code scan results
 * Returns acknowledgment-only decision (no accept/reject)
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

  // Build detailed description with file list
  let description = '';

  if (unusedFiles.length === 0) {
    description = `✅ **Great news!** No unused code detected in ${activeProject.name}.\n\nAll components and modules are being used.\n\n📄 Click **Accept** to generate a summary report in \`<projectRoot>/docs/unused/\``;
  } else {
    description = `Found **${unusedFiles.length} unused file${unusedFiles.length > 1 ? 's' : ''}** in ${activeProject.name}.\n\n`;

    if (stats) {
      description += `📊 **Statistics:**\n`;
      description += `- Total files analyzed: ${stats.totalFiles}\n`;
      description += `- Total exports: ${stats.totalExports}\n`;
      description += `- Unused exports: ${stats.unusedExports}\n\n`;
    }

    description += `📁 **Unused Files:**\n\n`;

    // List first 15 files, then summarize the rest
    const displayLimit = 15;
    const filesToShow = unusedFiles.slice(0, displayLimit);

    filesToShow.forEach((file, index) => {
      description += `${index + 1}. \`${file.relativePath}\`\n`;
      description += `   └─ Exports: ${file.exports.join(', ')}\n`;
    });

    if (unusedFiles.length > displayLimit) {
      description += `\n...and ${unusedFiles.length - displayLimit} more file${unusedFiles.length - displayLimit > 1 ? 's' : ''}.\n`;
    }

    description += `\n💡 **Detection Method:**\n`;
    description += `This scan searches for component usage in two ways:\n`;
    description += `1. **JSX Tags**: Searches for \`<ComponentName>\` in all files\n`;
    description += `2. **Imports**: Searches for \`import ComponentName\` or \`import { ComponentName }\`\n\n`;
    description += `⚠️ **Limitations:**\n`;
    description += `- May miss dynamically generated component names\n`;
    description += `- May miss components used via string references\n`;
    description += `- Focuses on .tsx files only (UI components)\n`;
    description += `- Excludes API routes, utilities, types, and services\n\n`;
    description += `📄 **Report Generation:**\n`;
    description += `Click **Accept** to generate a detailed markdown report in \`<projectRoot>/docs/unused/\`\n\n`;
    description += `✅ **Recommendation:** Review manually before removing any files.`;
  }

  return {
    type: 'unused-scan',
    title: unusedFiles.length === 0 ? 'No Unused Code Found' : 'Unused Code Detected',
    description,
    count: unusedFiles.length,
    severity: unusedFiles.length === 0 ? 'info' : unusedFiles.length > 20 ? 'warning' : 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    projectType: activeProject.type,
    data: {
      unusedFiles,
      stats,
    },

    // Save report to markdown file
    onAccept: async () => {
      console.log('[UnusedScan] User accepted - generating markdown report...');

      try {
        const response = await fetch('/api/unused-code/save-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: activeProject.path,
            projectName: activeProject.name,
            unusedFiles,
            stats,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[UnusedScan] ✅ Report saved to: ${result.relativePath}`);
        } else {
          console.error('[UnusedScan] Failed to save report:', result.error);
        }
      } catch (error) {
        console.error('[UnusedScan] Error saving report:', error);
      }
    },

    // Reject handler - user dismissed the report
    onReject: async () => {
      console.log('[UnusedScan] User dismissed unused code report');
    },
  };
}
