/**
 * Express.js Contexts Adapter
 *
 * Groups Express.js code into logical contexts based on routers, features, and domains.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ProposedContext {
  name: string;
  description: string;
  files: string[];
  type: 'router' | 'middleware' | 'service' | 'model' | 'util';
  routes?: string[];
  dependencies?: string[];
}

interface ExpressContextsData {
  proposedContexts: ProposedContext[];
  unmappedFiles: string[];
  totalFiles: number;
  coverage: number; // Percentage of files covered by contexts
  structure: {
    hasRoutersFolder: boolean;
    hasControllersFolder: boolean;
    hasServicesFolder: boolean;
    hasModelsFolder: boolean;
    hasMiddlewareFolder: boolean;
  };
}

export class ExpressContextsAdapter extends BaseAdapter<ExpressContextsData> {
  public readonly id = 'express-contexts';
  public readonly name = 'Express Context Generator';
  public readonly description = 'Groups Express.js code into logical contexts by router/feature';
  public readonly supportedTypes = ['express'];
  public readonly category = 'contexts';
  public readonly priority = 90; // Run after structure scan

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000;

  public async execute(context: ScanContext): Promise<ScanResult<ExpressContextsData>> {
    const { project } = context;

    this.log('Generating Express.js contexts...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/contexts/generate/express',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              projectId: project.id,
            }),
          },
          { serviceName: 'Express Context Generator API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: ExpressContextsData = {
          proposedContexts: result.proposedContexts || [],
          unmappedFiles: result.unmappedFiles || [],
          totalFiles: result.totalFiles || 0,
          coverage: result.coverage || 0,
          structure: {
            hasRoutersFolder: result.structure?.hasRoutersFolder ?? false,
            hasControllersFolder: result.structure?.hasControllersFolder ?? false,
            hasServicesFolder: result.structure?.hasServicesFolder ?? false,
            hasModelsFolder: result.structure?.hasModelsFolder ?? false,
            hasMiddlewareFolder: result.structure?.hasMiddlewareFolder ?? false,
          },
        };

        this.log(
          `✅ Generated ${data.proposedContexts.length} contexts covering ${data.coverage}% of files`
        );

        return this.createResult(true, data);
      },
      { operation: 'express-contexts-generation' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<ExpressContextsData>> {
    // Return empty result if API doesn't exist
    return this.createResult(
      true,
      {
        proposedContexts: [],
        unmappedFiles: [],
        totalFiles: 0,
        coverage: 0,
        structure: {
          hasRoutersFolder: false,
          hasControllersFolder: false,
          hasServicesFolder: false,
          hasModelsFolder: false,
          hasMiddlewareFolder: false,
        },
      },
      undefined,
      ['Express contexts API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<ExpressContextsData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { proposedContexts, coverage, unmappedFiles, structure } = result.data;

    if (proposedContexts.length === 0) {
      return this.createDecision(
        {
          type: 'express-contexts-empty',
          title: 'No Contexts Detected',
          description:
            'Could not auto-detect contexts from your Express project structure. Would you like to manually organize your code?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Opening context editor for Express project...');
            // This would typically trigger a UI action
          },

          onReject: async () => {
            this.log('User skipped Express context creation');
          },
        },
        project
      );
    }

    // Build context summary
    const contextsByType: Record<string, ProposedContext[]> = {};
    proposedContexts.forEach((ctx) => {
      if (!contextsByType[ctx.type]) {
        contextsByType[ctx.type] = [];
      }
      contextsByType[ctx.type].push(ctx);
    });

    const typeSummary = Object.entries(contextsByType)
      .map(([type, ctxs]) => `  - ${type}: ${ctxs.length} (${ctxs.map((c) => c.name).join(', ')})`)
      .join('\n');

    const structureNotes = [];
    if (structure.hasRoutersFolder) structureNotes.push('routes/');
    if (structure.hasControllersFolder) structureNotes.push('controllers/');
    if (structure.hasServicesFolder) structureNotes.push('services/');
    if (structure.hasModelsFolder) structureNotes.push('models/');
    if (structure.hasMiddlewareFolder) structureNotes.push('middleware/');

    const description = `Found ${proposedContexts.length} logical contexts covering ${coverage.toFixed(0)}% of your codebase.

**Detected structure**: ${structureNotes.join(', ') || 'Flat structure'}

**Proposed contexts**:
${typeSummary}

${unmappedFiles.length > 0 ? `\n**${unmappedFiles.length} files** remain unmapped.` : ''}`;

    return this.createDecision(
      {
        type: 'express-contexts-proposal',
        title: 'Express.js Contexts',
        description,
        count: proposedContexts.length,
        severity: 'info',
        data: result.data,

        onAccept: async () => {
          this.log('Creating Express contexts...');

          const response = await fetch('/api/contexts/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              contexts: proposedContexts.map((ctx) => ({
                name: ctx.name,
                description: ctx.description,
                files: ctx.files,
                metadata: {
                  type: ctx.type,
                  routes: ctx.routes,
                  dependencies: ctx.dependencies,
                },
              })),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create Express contexts');
          }

          this.log(`✅ Created ${proposedContexts.length} Express contexts`);
        },

        onReject: async () => {
          this.log('User rejected Express context proposal');
        },
      },
      project
    );
  }
}
