/**
 * Next.js Selectors Scan Adapter
 * Scans context files for data-testid attributes and creates requirement files for coverage
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface SelectorsScanData {
  contextId: string;
  contextName: string;
  totalSelectors: number;
  dbCount: number;
  isDbOutdated: boolean;
  filePaths: string[];
}

export class NextJSSelectorsAdapter extends BaseAdapter<SelectorsScanData> {
  public readonly id = 'nextjs-selectors';
  public readonly name = 'Next.js Selectors Scan';
  public readonly description = 'Scans context files for data-testid attributes';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'custom'; // Uses 'custom' category as per ScanBuilder
  public readonly priority = 100;

  /**
   * Execute selectors scan for a specific context
   */
  public async execute(context: ScanContext): Promise<ScanResult<SelectorsScanData>> {
    const { project, options } = context;
    const contextId = options?.contextId;

    if (!contextId) {
      return this.createResult(false, undefined, 'No context ID provided');
    }

    try {
      this.log('Scanning context for data-testid attributes...');

      const apiResult = await this.fetchApi('/api/tester/selectors/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          projectId: project.id,
          scanOnly: true,
        }),
      });

      if (!apiResult.success) {
        this.error('API returned error:', apiResult.error);
        return this.createResult(
          false,
          undefined,
          apiResult.error || 'API request failed'
        );
      }

      if (!apiResult.data?.success) {
        this.error('Scan failed:', apiResult.data);
        return this.createResult(
          false,
          undefined,
          apiResult.data?.error || 'Selectors scan failed'
        );
      }

      const data = apiResult.data;

      this.log(`Found ${data.totalSelectors} in code vs ${data.dbCount} in DB`);

      return this.createResult(true, {
        contextId: data.contextId,
        contextName: data.contextName,
        totalSelectors: data.totalSelectors,
        dbCount: data.dbCount,
        isDbOutdated: data.isDbOutdated,
        filePaths: data.filePaths,
      });
    } catch (error) {
      this.error('Error executing selectors scan:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data for selectors scan results
   */
  public buildDecision(
    result: ScanResult<SelectorsScanData>,
    project: Project
  ): DecisionData | null {
    // Handle error cases
    if (!result.success) {
      return this.createDecision(
        {
          type: 'selectors-scan-error',
          title: 'Selectors Scan Failed',
          description: `An error occurred while scanning for test selectors:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
          count: 0,
          severity: 'error',
          data: { error: result.error },
          onAccept: async () => {
            this.log('Error acknowledged');
          },
          onReject: async () => {
            this.log('Error dismissed');
          },
        },
        project
      );
    }

    if (!result.data) {
      return null;
    }

    const { contextId, contextName, totalSelectors, dbCount, isDbOutdated, filePaths } =
      result.data;

    // Build description based on code vs DB comparison
    let description = '';
    let title = '';
    let severity: 'info' | 'warning' | 'error' = 'info';

    if (totalSelectors === 0 && dbCount === 0) {
      title = 'No Test Selectors Found';
      description = `No data-testid attributes found in context "${contextName}".\n\n**Files scanned:** ${filePaths.length}\n\nCreate a requirement file to add test selectors for better automation coverage.`;
      severity = 'warning';
    } else if (isDbOutdated) {
      title = 'Database Outdated';
      description = `Context "${contextName}" has mismatched selector data:\n\n**In Code:** ${totalSelectors} selector${totalSelectors > 1 ? 's' : ''}\n**In Database:** ${dbCount} selector${dbCount > 1 ? 's' : ''}\n**Files:** ${filePaths.length}\n\n⚠️ The database is outdated. Create a requirement file to sync and improve coverage.`;
      severity = 'warning';
    } else {
      title = 'Test Selectors Discovered';
      description = `Found ${totalSelectors} data-testid attribute${totalSelectors > 1 ? 's' : ''} in context "${contextName}".\n\n**Database Status:** ✅ Up to date (${dbCount} selectors)\n**Files:** ${filePaths.length}\n\nCreate a requirement file to improve test selector coverage?`;
      severity = 'info';
    }

    return this.createDecision(
      {
        type: 'selectors-scan',
        title,
        description,
        count: totalSelectors,
        severity,
        data: { contextId, contextName, totalSelectors, filePaths },

        // Accept: Create requirement file
        onAccept: async () => {
          this.log('User accepted - creating requirement file...');

          // Call API without scanOnly to create requirement file
          const response = await fetch('/api/tester/selectors/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contextId,
              projectId: project.id,
              scanOnly: false,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create requirement file');
          }

          const executeResult = await response.json();

          if (!executeResult.success) {
            throw new Error(executeResult.error || 'Failed to create requirement file');
          }

          this.log(`✅ Created requirement file: ${executeResult.requirementFile}`);
        },

        // Reject: Do nothing
        onReject: async () => {
          this.log('User rejected - no requirement file created');
        },
      },
      project
    );
  }
}
