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
        return this.createResult(false, undefined, 'No response body received');
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
              return this.createResult(false, undefined, message.error);
            }
          } catch (parseError) {
            this.error('Failed to parse message:', line);
          }
        }
      }

      if (!finalResult) {
        return this.createResult(false, undefined, 'No result received from scan');
      }

      if (!finalResult.success) {
        return this.createResult(
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
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data for unused code scan results
   * Returns acknowledgment-only decision (no accept/reject)
   */
  public buildDecision(
    result: ScanResult<UnusedScanData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { unusedFiles, stats } = result.data;

    // Build detailed description with file list
    let description = '';

    if (unusedFiles.length === 0) {
      description = `✅ **Great news!** No unused code detected in ${project.name}.\n\nAll components and modules are being used.\n\n📄 Click **Accept** to generate a summary report in \`<projectRoot>/docs/unused/\``;
    } else {
      description = `Found **${unusedFiles.length} unused file${unusedFiles.length > 1 ? 's' : ''}** in ${project.name}.\n\n`;

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

        // Save report to markdown file
        onAccept: async () => {
          this.log('User accepted - generating markdown report...');

          try {
            const response = await fetch('/api/unused-code/save-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                projectName: project.name,
                unusedFiles,
                stats,
              }),
            });

            const saveResult = await response.json();

            if (saveResult.success) {
              this.log(`✅ Report saved to: ${saveResult.relativePath}`);
            } else {
              this.error('Failed to save report:', saveResult.error);
            }
          } catch (error) {
            this.error('Error saving report:', error);
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
