/**
 * Next.js Vision Scan Adapter
 * Generates high-level project documentation (AI Docs)
 *
 * Note: While placed in nextjs folder, this adapter works with any project type
 * It's framework-agnostic and could be moved to a generic adapter folder in the future
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';
import { DefaultProviderStorage } from '@/lib/llm';

interface VisionScanData {
  filePath: string;
  content: string;
  projectPath: string;
}

export class NextJSVisionAdapter extends BaseAdapter<VisionScanData> {
  public readonly id = 'nextjs-vision';
  public readonly name = 'Next.js Vision Scan';
  public readonly description = 'Generates high-level project documentation using AI';
  public readonly supportedTypes = ['*']; // Framework-agnostic
  public readonly category = 'vision';
  public readonly priority = 100;

  /**
   * Execute vision scan (generate high-level AI docs, but don't save yet)
   */
  public async execute(context: ScanContext): Promise<ScanResult<VisionScanData>> {
    const { project } = context;

    try {
      this.log('Generating high-level documentation...');

      const apiResult = await this.fetchApi('/api/projects/ai-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          projectPath: project.path,
          projectId: project.id,
          analysis: {},
          provider: DefaultProviderStorage.getDefaultProvider(),
        }),
      });

      if (!apiResult.success || !apiResult.data?.success || !apiResult.data?.review) {
        return this.createResult(
          false,
          undefined,
          apiResult.data?.error || apiResult.error || 'Failed to generate documentation'
        );
      }

      this.log('Documentation generated successfully');

      // Return the generated content without saving yet
      return this.createResult(true, {
        filePath: 'context/high.md',
        content: apiResult.data.review,
        projectPath: project.path,
      });
    } catch (error) {
      this.error('Error executing vision scan:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data for vision scan results
   * User must accept to save the documentation to context/high.md
   */
  public buildDecision(result: ScanResult<VisionScanData>, project: Project): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { content, filePath, projectPath } = result.data;
    const wordCount = content.split(/\s+/).length;

    return this.createDecision(
      {
        type: 'vision-scan',
        title: 'Project Documentation Generated',
        description: `Generated high-level project documentation (${wordCount} words).\n\nThis will be saved to: ${filePath}\n\nAccept to save the documentation, or Reject to discard.`,
        count: 1,
        severity: 'info',
        data: { content, filePath, projectPath },

        // Accept: Save documentation to context/high.md
        onAccept: async () => {
          this.log('User accepted - saving documentation...');

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

          this.log('✅ Saved to context/high.md');
        },

        // Reject: Discard documentation
        onReject: async () => {
          this.log('User rejected - documentation discarded');
        },
      },
      project
    );
  }
}
