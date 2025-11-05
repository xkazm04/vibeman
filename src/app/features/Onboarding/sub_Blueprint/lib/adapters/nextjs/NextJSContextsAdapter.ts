/**
 * NextJS Contexts Scan Adapter
 *
 * Scans and generates context documentation for NextJS projects.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';
import { DefaultProviderStorage } from '@/lib/llm';

interface ContextsScanData {
  contexts: any[];
  stats: {
    scanned: number;
    saved: number;
    failed: number;
    skippedDuplicates: number;
  };
  savedContexts: Array<{
    id: string;
    name: string;
    filePaths: string[];
    groupId: string | null;
    groupName: string | null;
  }>;
}

export class NextJSContextsAdapter extends BaseAdapter<ContextsScanData> {
  public readonly id = 'nextjs-contexts';
  public readonly name = 'NextJS Contexts Scanner';
  public readonly description = 'Scans and generates context documentation for NextJS projects';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'contexts';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<ContextsScanData>> {
    const { project, options } = context;

    this.log('Scanning for contexts...', project.path);

    try {
      const provider = options?.provider || DefaultProviderStorage.getDefaultProvider();

      const response = await this.fetchApi('/api/contexts/scripted-scan-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectPath: project.path,
          projectType: project.type || 'nextjs',
          provider,
        }),
      });

      if (!response.success || !response.data) {
        return this.createResult(false, undefined, response.error || 'Context scan failed');
      }

      const result = response.data as any;

      if (!result.success) {
        return this.createResult(false, undefined, result.error || 'Context scan failed');
      }

      const data: ContextsScanData = {
        contexts: [],
        stats: result.stats || {
          scanned: 0,
          saved: 0,
          failed: 0,
          skippedDuplicates: 0,
        },
        savedContexts: result.savedContexts || [],
      };

      this.log(`✅ Scanned and saved ${data.stats.saved} contexts`);

      return this.createResult(true, data);
    } catch (error) {
      this.error('Context scan failed:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  public buildDecision(
    result: ScanResult<ContextsScanData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { stats, savedContexts } = result.data;

    // If no contexts were saved, no decision needed
    if (stats.saved === 0) {
      this.log('No contexts saved - skipping decision');
      return null;
    }

    // Build description from saved contexts
    const contextNames = savedContexts.map((c) => c.name).join(', ');
    const description = `Successfully processed ${stats.scanned} contexts:\n- Saved: ${stats.saved}\n- Failed: ${stats.failed}\n- Skipped (duplicates): ${stats.skippedDuplicates}\n\nContext names: ${contextNames}`;

    return this.createDecision(
      {
        type: 'contexts-scan',
        title: 'Contexts Updated',
        description,
        count: stats.scanned + stats.saved,
        severity: 'info',
        data: { stats, savedContexts },

        // Accept: Contexts already saved, just log
        onAccept: async () => {
          this.log('User acknowledged context updates');
        },

        // Reject: No action needed
        onReject: async () => {
          this.log('User dismissed context updates');
        },
      },
      project
    );
  }
}
