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
 * Shows only stats before decision, creates Claude Code requirement on accept
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

  // Build concise description with stats only (no file list)
  let description = '';

  if (unusedFiles.length === 0) {
    description = `✅ **Great news!** No unused code detected in ${activeProject.name}.\n\nAll components and modules are being used.`;
  } else {
    description = `Found **${unusedFiles.length} unused file${unusedFiles.length > 1 ? 's' : ''}** in ${activeProject.name}.\n\n`;

    if (stats) {
      description += `📊 **Statistics:**\n`;
      description += `- Total files analyzed: ${stats.totalFiles}\n`;
      description += `- Total exports: ${stats.totalExports}\n`;
      description += `- Unused exports: ${stats.unusedExports}\n\n`;
    }

    description += `💡 **Next Step:**\n`;
    description += `Click **Accept** to create a Claude Code requirement that will:\n`;
    description += `1. Review each file to verify it's truly unused\n`;
    description += `2. Check for dynamic references and edge cases\n`;
    description += `3. Safely remove confirmed unused files\n`;
    description += `4. Generate a cleanup report\n\n`;
    description += `⚠️ **Detection Method:**\n`;
    description += `This scan uses static analysis (JSX tags and imports). Claude Code will perform deeper verification before removal.`;
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

    // Create Claude Code requirement for cleanup
    onAccept: async () => {
      if (unusedFiles.length === 0) {
        return; // Nothing to clean up
      }

      // Build requirement content
      const fileList = unusedFiles.map((file, index) =>
        `${index + 1}. \`${file.relativePath}\`\n   - Exports: ${file.exports.join(', ')}\n   - Reason: ${file.reason}`
      ).join('\n\n');

      const requirementContent = `# Unused Code Cleanup

## Objective
Verify and remove unused code files detected by static analysis.

## Files to Review (${unusedFiles.length} total)

${fileList}

## Task Instructions

1. **Verification Phase**
   - For each file listed above, perform thorough analysis:
     - Search for dynamic imports (e.g., \`import()\`, \`require()\`)
     - Check for string-based references
     - Look for configuration-based usage
     - Verify no test files depend on these components

2. **Cleanup Phase**
   - Only delete files that are confirmed unused after verification
   - Create a backup/report of deleted files
   - Update any related documentation or comments

3. **Report Generation**
   - Create a markdown report in \`docs/unused/cleanup-report.md\` containing:
     - List of deleted files
     - List of files kept (with justification)
     - Total cleanup impact (files/lines removed)

## Statistics

- Total files analyzed: ${stats?.totalFiles || 'N/A'}
- Total exports: ${stats?.totalExports || 'N/A'}
- Unused exports: ${stats?.unusedExports || 'N/A'}

## Safety Guidelines

- **DO NOT** delete files that have ANY uncertainty
- **DO** create a git commit with all deletions for easy rollback
- **DO** run the build and tests after cleanup
- **DO** verify the application still functions correctly

🤖 Generated by Blueprint Unused Code Scan
`;

      // Create requirement via API
      const response = await fetch('/api/claude-code/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
          requirementName: 'unused-code-cleanup',
          content: requirementContent,
          overwrite: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create Claude Code requirement');
      }
    },

    // Reject handler - user dismissed the report
    onReject: async () => {
      // Report dismissed - no action needed
    },
  };
}
