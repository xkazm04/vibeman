/**
 * Express.js Structure Scan Adapter
 *
 * Analyzes Express.js project structure including routes, middleware, and patterns.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface RouteInfo {
  method: string;
  path: string;
  file: string;
  line: number;
  middleware: string[];
}

interface MiddlewareInfo {
  name: string;
  file: string;
  type: 'global' | 'router' | 'route';
}

interface ExpressStructureData {
  routes: RouteInfo[];
  middleware: MiddlewareInfo[];
  routers: Array<{
    name: string;
    mountPath: string;
    file: string;
    routeCount: number;
  }>;
  entryPoint: string | null;
  hasTypeScript: boolean;
  patterns: {
    hasErrorHandler: boolean;
    has404Handler: boolean;
    usesHelmet: boolean;
    usesCors: boolean;
    usesRateLimit: boolean;
    usesCompression: boolean;
  };
  issues: Array<{
    type: 'warning' | 'suggestion';
    message: string;
    file?: string;
  }>;
}

export class ExpressStructureAdapter extends BaseAdapter<ExpressStructureData> {
  public readonly id = 'express-structure';
  public readonly name = 'Express Structure Analyzer';
  public readonly description = 'Analyzes routes, middleware, and patterns in Express.js projects';
  public readonly supportedTypes = ['express'];
  public readonly category = 'structure';
  public readonly priority = 100;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000; // 2 minute timeout

  public async execute(context: ScanContext): Promise<ScanResult<ExpressStructureData>> {
    const { project } = context;

    this.log('Running Express.js structure analysis...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/structure-scan/express',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
            }),
          },
          { serviceName: 'Express Structure Analyzer API' }
        );

        if (!response.success || !response.data) {
          // Fallback: Return basic structure
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: ExpressStructureData = {
          routes: result.routes || [],
          middleware: result.middleware || [],
          routers: result.routers || [],
          entryPoint: result.entryPoint || null,
          hasTypeScript: result.hasTypeScript || false,
          patterns: {
            hasErrorHandler: result.patterns?.hasErrorHandler ?? false,
            has404Handler: result.patterns?.has404Handler ?? false,
            usesHelmet: result.patterns?.usesHelmet ?? false,
            usesCors: result.patterns?.usesCors ?? false,
            usesRateLimit: result.patterns?.usesRateLimit ?? false,
            usesCompression: result.patterns?.usesCompression ?? false,
          },
          issues: result.issues || [],
        };

        // Add issues based on missing patterns
        if (!data.patterns.hasErrorHandler) {
          data.issues.push({
            type: 'warning',
            message: 'No global error handler found. Unhandled errors may crash the server.',
          });
        }

        if (!data.patterns.has404Handler) {
          data.issues.push({
            type: 'suggestion',
            message: 'Consider adding a 404 handler for unknown routes.',
          });
        }

        if (!data.patterns.usesHelmet) {
          data.issues.push({
            type: 'suggestion',
            message: 'Consider using Helmet for security headers.',
          });
        }

        this.log(
          `✅ Found ${data.routes.length} routes, ${data.middleware.length} middleware, ${data.routers.length} routers`
        );

        return this.createResult(true, data);
      },
      { operation: 'express-structure-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<ExpressStructureData>> {
    // Return a basic result if the API doesn't exist yet
    return this.createResult(
      true,
      {
        routes: [],
        middleware: [],
        routers: [],
        entryPoint: null,
        hasTypeScript: false,
        patterns: {
          hasErrorHandler: false,
          has404Handler: false,
          usesHelmet: false,
          usesCors: false,
          usesRateLimit: false,
          usesCompression: false,
        },
        issues: [],
      },
      undefined,
      ['Express structure API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<ExpressStructureData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { routes, middleware, routers, issues, patterns } = result.data;

    // If no routes found, offer to help structure the project
    if (routes.length === 0) {
      return this.createDecision(
        {
          type: 'express-structure-empty',
          title: 'No Routes Found',
          description:
            'No Express routes were detected. Would you like to create a starter route structure?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Creating starter route structure...');
            // API call to create starter structure
            await fetch('/api/structure-scan/express/scaffold', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectPath: project.path }),
            });
          },

          onReject: async () => {
            this.log('User skipped route scaffolding');
          },
        },
        project
      );
    }

    // If there are issues, present them
    const warnings = issues.filter((i) => i.type === 'warning');
    const suggestions = issues.filter((i) => i.type === 'suggestion');

    if (warnings.length > 0) {
      const issueList = warnings
        .map((i) => `  - ${i.message}${i.file ? ` (${i.file})` : ''}`)
        .join('\n');

      const patternsUsed = Object.entries(patterns)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/^(has|uses)/, '').replace(/([A-Z])/g, ' $1').trim())
        .join(', ');

      return this.createDecision(
        {
          type: 'express-structure-issues',
          title: 'Express.js Structure Issues',
          description: `Found ${routes.length} routes across ${routers.length} routers.\n\n**Active patterns**: ${patternsUsed || 'None'}\n\n**Issues**:\n${issueList}`,
          count: warnings.length,
          severity: 'warning',
          data: result.data,

          onAccept: async () => {
            this.log('Creating requirements to fix Express structure issues...');
            await fetch('/api/structure-scan/express/fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                issues: warnings,
              }),
            });
          },

          onReject: async () => {
            this.log('User dismissed Express structure issues');
          },
        },
        project
      );
    }

    // No decision needed if everything looks good
    return null;
  }
}
