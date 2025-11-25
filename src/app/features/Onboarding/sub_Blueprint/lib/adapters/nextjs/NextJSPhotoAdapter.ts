/**
 * Next.js Photo Scan Adapter
 * Takes screenshots based on context test scenarios
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface PhotoScanData {
  contextId: string;
  contextName: string;
  hasScenario: boolean;
  daysAgo: number | null;
}

export class NextJSPhotoAdapter extends BaseAdapter<PhotoScanData> {
  public readonly id = 'nextjs-photo';
  public readonly name = 'Next.js Photo Scan';
  public readonly description = 'Takes screenshots based on context test scenarios';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'photo';
  public readonly priority = 100;

  /**
   * Execute photo scan for a specific context
   */
  public async execute(context: ScanContext): Promise<ScanResult<PhotoScanData>> {
    const { project, options } = context;
    const contextId = options?.contextId;

    if (!contextId) {
      return this.createResult<PhotoScanData>(false, undefined, 'No context ID provided');
    }

    try {
      this.log('Checking test scenario for context...');

      // Call screenshot API in scanOnly mode to check scenario
      const apiResult = await this.fetchApi('/api/tester/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          scanOnly: true,
        }),
      });

      if (!apiResult.success || !apiResult.data?.success) {
        return this.createResult<PhotoScanData>(
          false,
          undefined,
          apiResult.data?.error || apiResult.error || 'Failed to check test scenario'
        );
      }

      const data = apiResult.data;

      this.log(
        `Context "${data.contextName}" - Scenario: ${data.hasScenario ? 'Found' : 'Not found'}`
      );

      return this.createResult(true, {
        contextId: data.contextId,
        contextName: data.contextName,
        hasScenario: data.hasScenario,
        daysAgo: data.daysAgo,
      });
    } catch (error) {
      this.error('Error executing photo scan:', error);
      return this.createResult<PhotoScanData>(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data for photo scan results
   */
  public buildDecision(result: ScanResult<PhotoScanData>, project: Project): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { contextId, contextName, hasScenario, daysAgo } = result.data;

    // If no scenario, abort with message
    if (!hasScenario) {
      return this.createDecision(
        {
          type: 'photo-scan-abort',
          title: 'No Test Scenario Found',
          description: `Context "${contextName}" does not have a test scenario.\n\nPlease create a test scenario first using the Context Preview Manager.`,
          severity: 'warning',
          data: { ...result.data, contextId },

          // Accept: Do nothing (abort)
          onAccept: async () => {
            this.log('User acknowledged - no scenario available');
          },

          // Reject: Do nothing
          onReject: async () => {
            this.log('User cancelled');
          },
        },
        project
      );
    }

    // Build description with last updated info
    let description = `Context: "${contextName}"\n\nTest scenario found`;
    if (daysAgo !== null) {
      description += `\nLast screenshot: ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    } else {
      description += '\nNo previous screenshot found';
    }
    description += '\n\nExecute screenshot now?';

    return this.createDecision(
      {
        type: 'photo-scan',
        title: 'Execute Screenshot',
        description,
        severity: 'info',
        data: { ...result.data, contextId },

        // Accept: Execute screenshot
        onAccept: async () => {
          this.log('User confirmed - executing screenshot...');

          const response = await fetch('/api/tester/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contextId,
              scanOnly: false,
            }),
          });

          const executeResult = await response.json();

          if (!response.ok || !executeResult.success) {
            throw new Error(executeResult.error || 'Failed to execute screenshot');
          }

          this.log(`✅ Screenshot saved: ${executeResult.screenshotPath}`);
        },

        // Reject: Cancel
        onReject: async () => {
          this.log('User cancelled screenshot');
        },
      },
      project
    );
  }
}
