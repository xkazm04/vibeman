/**
 * TEMPLATE: Scan Adapter
 *
 * Copy this template to create a new scan adapter for your framework.
 *
 * Steps:
 * 1. Copy this file to: adapters/{framework}/{Framework}{ScanType}Adapter.ts
 * 2. Replace all TEMPLATE placeholders with your values
 * 3. Implement execute() and buildDecision() methods
 * 4. Add to index.ts in your framework directory
 * 5. Register in initialize.ts
 *
 * Example:
 * - File: adapters/express/ExpressBuildAdapter.ts
 * - TEMPLATE_ID -> express-build
 * - TEMPLATE_NAME -> Express Build Scanner
 * - TEMPLATE_TYPE -> express
 * - TEMPLATE_CATEGORY -> build
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

/**
 * Define the data structure returned by your scan
 */
interface TEMPLATE_Data {
  // Add your scan result fields here
  // Examples:
  // totalIssues: number;
  // errors: Array<{ file: string; message: string }>;
  // warnings: string[];
}

/**
 * TEMPLATE Adapter
 *
 * TODO: Add description of what this adapter does
 */
export class TEMPLATE_Adapter extends BaseAdapter<TEMPLATE_Data> {
  // ========================================
  // Adapter Metadata (REQUIRED)
  // ========================================

  /**
   * Unique identifier for this adapter
   * Format: {framework}-{scan-type}
   * Examples: 'nextjs-build', 'fastapi-structure', 'express-contexts'
   */
  public readonly id = 'TEMPLATE_ID';

  /**
   * Human-readable name shown in UI
   */
  public readonly name = 'TEMPLATE_NAME';

  /**
   * Description of what this adapter scans/analyzes
   */
  public readonly description = 'TEMPLATE_DESCRIPTION';

  /**
   * Supported project types
   * Examples: ['nextjs'], ['fastapi'], ['express', 'node'], ['*']
   */
  public readonly supportedTypes = ['TEMPLATE_TYPE'];

  /**
   * Scan category
   * Options: 'build', 'structure', 'contexts', 'dependencies', 'vision',
   *          'photo', 'ideas', 'prototype', 'contribute', 'fix', 'custom'
   */
  public readonly category = 'TEMPLATE_CATEGORY';

  /**
   * Priority (higher = preferred when multiple adapters match)
   * Guidelines:
   * - 100: Framework-specific adapters
   * - 50: Generic adapters (default)
   * - 10: Fallback adapters
   */
  public readonly priority = 100;

  // ========================================
  // Core Methods (REQUIRED)
  // ========================================

  /**
   * Execute the scan and return results
   *
   * @param context - Execution context with project and options
   * @returns ScanResult with success status and data
   */
  public async execute(context: ScanContext): Promise<ScanResult<TEMPLATE_Data>> {
    const { project, options } = context;

    this.log('Starting TEMPLATE scan...', project.path);

    try {
      // TODO: Implement your scan logic here

      // Example: Make API request
      const response = await this.fetchApi('/api/TEMPLATE/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.path,
          ...options,
        }),
      });

      if (!response.success) {
        return this.createResult(false, undefined, response.error);
      }

      // Example: Parse response data
      const data: TEMPLATE_Data = {
        // Map response to your data structure
        // totalIssues: response.data.totalIssues || 0,
      };

      this.log(`✅ Scan completed with ${data.totalIssues} issues`);

      return this.createResult(true, data);
    } catch (error) {
      this.error('Scan failed:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build decision data from scan results
   *
   * Return null if no user decision is needed (e.g., no issues found)
   * Return DecisionData to show in decision queue
   *
   * @param result - Scan execution result
   * @param project - Project being scanned
   * @returns DecisionData or null
   */
  public buildDecision(
    result: ScanResult<TEMPLATE_Data>,
    project: Project
  ): DecisionData | null {
    // Check if scan was successful and has data
    if (!result.success || !result.data) {
      return null;
    }

    const { data } = result;

    // TODO: Implement your decision logic

    // Example: No issues = no decision needed
    if (data.totalIssues === 0) {
      this.log('No issues found, no decision needed');
      return null;
    }

    // Example: Build description
    const description = `
Found ${data.totalIssues} issue${data.totalIssues > 1 ? 's' : ''} in TEMPLATE scan:

${data.errors.map((e) => `- ${e.message} (${e.file})`).join('\n')}

Would you like to create requirement files to address these issues?
    `.trim();

    // Create decision data
    return this.createDecision(
      {
        type: 'TEMPLATE-scan',
        title: 'TEMPLATE Scan Issues',
        description,
        count: data.totalIssues,
        severity: data.totalIssues > 10 ? 'error' : 'warning',
        data: result.data,

        // User accepts - take action (create requirements, fix issues, etc.)
        onAccept: async () => {
          this.log('User accepted, creating requirement files...');

          try {
            // TODO: Implement accept action
            // Example: Create requirement files
            const response = await fetch('/api/TEMPLATE/create-requirements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: project.id,
                projectPath: project.path,
                issues: data.errors,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to create requirement files');
            }

            const result = await response.json();
            this.log(`✅ Created ${result.count} requirement files`);
          } catch (error) {
            this.error('Failed to handle acceptance:', error);
            throw error;
          }
        },

        // User rejects - just log it
        onReject: async () => {
          this.log('User rejected TEMPLATE scan decision');
          // Optional: Save rejection to analytics, etc.
        },
      },
      project
    );
  }

  // ========================================
  // Optional Methods
  // ========================================

  /**
   * Optional: Custom project matching logic
   *
   * Override this if you need more complex logic than just checking project.type
   * Default implementation checks if project.type is in supportedTypes
   */
  // public canHandle(project: Project): boolean {
  //   // Example: Check for specific files
  //   const hasConfigFile = fs.existsSync(path.join(project.path, 'config.json'));
  //   return super.canHandle(project) && hasConfigFile;
  // }

  /**
   * Optional: Validate adapter configuration
   *
   * Check if required tools are installed, API is accessible, etc.
   */
  // public async validate(): Promise<{ valid: boolean; errors?: string[] }> {
  //   const errors: string[] = [];
  //
  //   // Example: Check if tool is installed
  //   try {
  //     await this.checkToolInstalled('TEMPLATE-cli');
  //   } catch (error) {
  //     errors.push('TEMPLATE-cli is not installed');
  //   }
  //
  //   return {
  //     valid: errors.length === 0,
  //     errors: errors.length > 0 ? errors : undefined,
  //   };
  // }

  // ========================================
  // Helper Methods (Private)
  // ========================================

  /**
   * Example private helper method
   */
  // private async checkToolInstalled(tool: string): Promise<boolean> {
  //   // Implementation
  //   return true;
  // }
}

// ========================================
// Usage Example
// ========================================

/**
 * How to use this adapter:
 *
 * 1. Register in initialize.ts:
 *
 *    import { TEMPLATE_Adapter } from './TEMPLATE/TEMPLATE_Adapter';
 *
 *    export function initializeAdapters() {
 *      const registry = getScanRegistry();
 *      registry.register(new TEMPLATE_Adapter());
 *    }
 *
 * 2. Execute scan:
 *
 *    const registry = getInitializedRegistry();
 *    const result = await registry.executeScan(project, 'TEMPLATE_CATEGORY');
 *
 * 3. Build decision:
 *
 *    if (result.success) {
 *      const adapter = registry.getBestAdapter(project, 'TEMPLATE_CATEGORY');
 *      const decision = adapter?.buildDecision(result, project);
 *      if (decision) {
 *        decisionQueueStore.getState().addDecision(decision);
 *      }
 *    }
 */

// ========================================
// Testing Example
// ========================================

/**
 * Unit test example:
 *
 * import { TEMPLATE_Adapter } from './TEMPLATE_Adapter';
 *
 * describe('TEMPLATE_Adapter', () => {
 *   let adapter: TEMPLATE_Adapter;
 *
 *   beforeEach(() => {
 *     adapter = new TEMPLATE_Adapter();
 *   });
 *
 *   it('should handle TEMPLATE projects', () => {
 *     const project = { id: '1', type: 'TEMPLATE_TYPE', path: '/test' };
 *     expect(adapter.canHandle(project)).toBe(true);
 *   });
 *
 *   it('should execute scan successfully', async () => {
 *     const context = {
 *       project: { id: '1', type: 'TEMPLATE_TYPE', path: '/test' },
 *       options: {},
 *     };
 *
 *     const result = await adapter.execute(context);
 *
 *     expect(result.success).toBe(true);
 *     expect(result.data).toBeDefined();
 *   });
 *
 *   it('should return null decision when no issues', () => {
 *     const result = {
 *       success: true,
 *       data: { totalIssues: 0, errors: [] },
 *     };
 *
 *     const project = { id: '1', type: 'TEMPLATE_TYPE', path: '/test' };
 *     const decision = adapter.buildDecision(result, project);
 *
 *     expect(decision).toBeNull();
 *   });
 * });
 */
