/**
 * Django Contexts Adapter
 *
 * Groups Django code into logical contexts based on apps, models, and domains.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ProposedContext {
  name: string;
  description: string;
  files: string[];
  type: 'app' | 'model' | 'view' | 'api' | 'util' | 'config';
  app?: string;
  models?: string[];
  urls?: string[];
}

interface DjangoContextsData {
  proposedContexts: ProposedContext[];
  unmappedFiles: string[];
  totalFiles: number;
  coverage: number;
  appMapping: Record<string, string[]>; // app name -> file paths
  strategy: 'by-app' | 'by-domain' | 'by-layer' | 'mixed';
}

export class DjangoContextsAdapter extends BaseAdapter<DjangoContextsData> {
  public readonly id = 'django-contexts';
  public readonly name = 'Django Context Generator';
  public readonly description = 'Groups Django code into logical contexts by app/domain';
  public readonly supportedTypes = ['django'];
  public readonly category = 'contexts';
  public readonly priority = 90;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000;

  public async execute(context: ScanContext): Promise<ScanResult<DjangoContextsData>> {
    const { project } = context;

    this.log('Generating Django contexts...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/contexts/generate/django',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              projectId: project.id,
            }),
          },
          { serviceName: 'Django Context Generator API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: DjangoContextsData = {
          proposedContexts: result.proposedContexts || [],
          unmappedFiles: result.unmappedFiles || [],
          totalFiles: result.totalFiles || 0,
          coverage: result.coverage || 0,
          appMapping: result.appMapping || {},
          strategy: result.strategy || 'by-app',
        };

        this.log(
          `✅ Generated ${data.proposedContexts.length} contexts using "${data.strategy}" strategy`
        );

        return this.createResult(true, data);
      },
      { operation: 'django-contexts-generation' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<DjangoContextsData>> {
    return this.createResult(
      true,
      {
        proposedContexts: [],
        unmappedFiles: [],
        totalFiles: 0,
        coverage: 0,
        appMapping: {},
        strategy: 'by-app',
      },
      undefined,
      ['Django contexts API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<DjangoContextsData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { proposedContexts, coverage, unmappedFiles, appMapping, strategy } = result.data;

    if (proposedContexts.length === 0) {
      return this.createDecision(
        {
          type: 'django-contexts-empty',
          title: 'No Contexts Detected',
          description:
            'Could not auto-detect contexts from your Django project. Would you like to manually organize your code?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Opening context editor for Django project...');
          },

          onReject: async () => {
            this.log('User skipped Django context creation');
          },
        },
        project
      );
    }

    // Group by type
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

    const strategyLabel = {
      'by-app': 'Django Apps',
      'by-domain': 'Business Domains',
      'by-layer': 'Architecture Layers',
      mixed: 'Mixed Strategy',
    }[strategy];

    const description = `Generated ${proposedContexts.length} contexts covering ${coverage.toFixed(0)}% of files.

**Organization**: ${strategyLabel}

**Proposed contexts**:
${typeSummary}

**Apps detected**: ${Object.keys(appMapping).join(', ') || 'None'}
${unmappedFiles.length > 0 ? `\n**${unmappedFiles.length} files** remain unmapped.` : ''}`;

    return this.createDecision(
      {
        type: 'django-contexts-proposal',
        title: 'Django Contexts',
        description,
        count: proposedContexts.length,
        severity: 'info',
        data: result.data,

        onAccept: async () => {
          this.log('Creating Django contexts...');

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
                  app: ctx.app,
                  models: ctx.models,
                  urls: ctx.urls,
                },
              })),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create Django contexts');
          }

          this.log(`✅ Created ${proposedContexts.length} Django contexts`);
        },

        onReject: async () => {
          this.log('User rejected Django context proposal');
        },
      },
      project
    );
  }
}
