/**
 * Next.js Unused Code Scan Adapter
 * Handles detection of unused components in Next.js projects
 *
 * Note: This adapter uses 'custom' category as 'unused' is not a standard category
 * It will be manually added to the backlog column in blueprintConfig
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface UnusedFile {
  filePath: string;
  relativePath: string;
  exports: string[];
  reason: string;
}

interface UnusedScanData {
  unusedFiles: UnusedFile[];
  stats: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
  };
}

export class NextJSUnusedAdapter extends BaseAdapter<UnusedScanData> {
  public readonly id = 'nextjs-unused';
  public readonly name = 'Next.js Unused Code Scan';
  public readonly description = 'Detects unused components in Next.js projects';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'custom'; // Using 'custom' since 'unused' is not a standard category
  public readonly priority = 50; // Lower priority than selectors

  /**
   * Execute unused code scan with streaming progress updates
   */
  public async execute(context: ScanContext): Promise<ScanResult<UnusedScanData>> {
    const { project } = context;

    try {
      this.log('Analyzing project for unused code...');

      const response = await fetch('/api/unused-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.path,
          projectType: project.type,
          stream: true, // Enable streaming
        }),
      });

      if (!response.body) {
        return this.createResult<UnusedScanData>(false, undefined, 'No response body received');
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: any = null;

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
              const { useBlueprintStore } = await import('../../../store/blueprintStore');
              useBlueprintStore.getState().updateScanProgress(message.progress);

              this.log(
                `Progress: ${message.current}/${message.total} - ${message.currentFile}`
              );
            } else if (message.type === 'complete') {
              finalResult = message.result;
            } else if (message.type === 'error') {
              return this.createResult<UnusedScanData>(false, undefined, message.error);
            }
          } catch (parseError) {
            this.error('Failed to parse message:', line);
          }
        }
      }

      if (!finalResult) {
        return this.createResult<UnusedScanData>(false, undefined, 'No result received from scan');
      }

      if (!finalResult.success) {
        return this.createResult<UnusedScanData>(
          false,
          undefined,
          finalResult.error || 'Unused code scan failed'
        );
      }

      const unusedFiles = finalResult.unusedFiles || [];

      if (unusedFiles.length === 0) {
        this.log('No unused code found - project is clean');
        return this.createResult(true, {
          unusedFiles: [],
          stats: finalResult.stats,
        });
      }

      this.log(`Found ${unusedFiles.length} unused files`);

      return this.createResult(true, {
        unusedFiles,
        stats: finalResult.stats,
      });
    } catch (error) {
      this.error('Error executing unused scan:', error);
      return this.createResult<UnusedScanData>(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data for unused code scan results
   * Shows only stats, creates Claude Code requirement on accept
   */
  public buildDecision(
    result: ScanResult<UnusedScanData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { unusedFiles, stats } = result.data;

    // Build concise description with stats only (no file list)
    let description = '';

    if (unusedFiles.length === 0) {
      description = `✅ **Great news!** No unused code detected in ${project.name}.\n\nAll components and modules are being used.`;
    } else {
      description = `Found **${unusedFiles.length} unused file${unusedFiles.length > 1 ? 's' : ''}** in ${project.name}.\n\n`;

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

    return this.createDecision(
      {
        type: 'unused-scan',
        title: unusedFiles.length === 0 ? 'No Unused Code Found' : 'Unused Code Detected',
        description,
        count: unusedFiles.length,
        severity: unusedFiles.length === 0 ? 'info' : unusedFiles.length > 20 ? 'warning' : 'info',
        data: {
          unusedFiles,
          stats,
        },

        // Create Claude Code requirement for cleanup
        onAccept: async () => {
          if (unusedFiles.length === 0) {
            this.log('No unused files to clean up');
            return; // Nothing to clean up
          }

          this.log('Creating Claude Code requirement for unused code cleanup...');

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

          try {
            // Create requirement via API
            const response = await fetch('/api/claude-code/requirement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                requirementName: 'unused-code-cleanup',
                content: requirementContent,
                overwrite: true,
              }),
            });

            const saveResult = await response.json();

            if (saveResult.success) {
              this.log(`✅ Claude Code requirement created: ${saveResult.fileName}`);
            } else {
              this.error('Failed to create requirement:', saveResult.error);
              throw new Error(saveResult.error || 'Failed to create Claude Code requirement');
            }
          } catch (error) {
            this.error('Error creating Claude Code requirement:', error);
            throw error;
          }
        },

        // Reject handler - user dismissed the report
        onReject: async () => {
          this.log('User dismissed unused code report');
        },
      },
      project
    );
  }
}
