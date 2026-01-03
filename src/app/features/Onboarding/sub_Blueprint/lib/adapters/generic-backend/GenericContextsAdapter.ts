/**
 * Generic Backend Contexts Adapter
 *
 * Groups backend code into logical contexts using file clustering and patterns.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ProposedContext {
  name: string;
  description: string;
  files: string[];
  type: 'api' | 'service' | 'model' | 'util' | 'config' | 'test' | 'domain';
  confidence: number; // 0-1 how confident we are in this grouping
}

interface GenericContextsData {
  proposedContexts: ProposedContext[];
  unmappedFiles: string[];
  totalFiles: number;
  coverage: number;
  clusteringMethod: 'directory' | 'naming' | 'import' | 'semantic' | 'mixed';
  language: string;
}

export class GenericContextsAdapter extends BaseAdapter<GenericContextsData> {
  public readonly id = 'generic-backend-contexts';
  public readonly name = 'Generic Backend Context Generator';
  public readonly description = 'Groups backend code into logical contexts using file patterns';
  public readonly supportedTypes = ['generic', 'rails', 'go', 'rust', 'java', 'spring'];
  public readonly category = 'contexts';
  public readonly priority = 40;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000;

  public async execute(context: ScanContext): Promise<ScanResult<GenericContextsData>> {
    const { project } = context;

    this.log('Generating generic backend contexts...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/contexts/generate/generic',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
              projectId: project.id,
            }),
          },
          { serviceName: 'Generic Context Generator API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: GenericContextsData = {
          proposedContexts: result.proposedContexts || [],
          unmappedFiles: result.unmappedFiles || [],
          totalFiles: result.totalFiles || 0,
          coverage: result.coverage || 0,
          clusteringMethod: result.clusteringMethod || 'directory',
          language: result.language || 'unknown',
        };

        this.log(
          `✅ Generated ${data.proposedContexts.length} contexts (${data.clusteringMethod} method)`
        );

        return this.createResult(true, data);
      },
      { operation: 'generic-backend-contexts-generation' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<GenericContextsData>> {
    return this.createResult(
      true,
      {
        proposedContexts: [],
        unmappedFiles: [],
        totalFiles: 0,
        coverage: 0,
        clusteringMethod: 'directory',
        language: 'unknown',
      },
      undefined,
      ['Generic contexts API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<GenericContextsData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { proposedContexts, coverage, unmappedFiles, clusteringMethod, language } = result.data;

    if (proposedContexts.length === 0) {
      return this.createDecision(
        {
          type: 'generic-backend-contexts-empty',
          title: 'No Contexts Generated',
          description:
            'Could not automatically group your code into contexts. Would you like to manually organize your project?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Opening context editor...');
          },

          onReject: async () => {
            this.log('User skipped context creation');
          },
        },
        project
      );
    }

    // Group contexts by type
    const contextsByType: Record<string, ProposedContext[]> = {};
    proposedContexts.forEach((ctx) => {
      if (!contextsByType[ctx.type]) {
        contextsByType[ctx.type] = [];
      }
      contextsByType[ctx.type].push(ctx);
    });

    const typeSummary = Object.entries(contextsByType)
      .map(([type, ctxs]) => {
        const names = ctxs.slice(0, 3).map((c) => c.name);
        const more = ctxs.length > 3 ? `, +${ctxs.length - 3} more` : '';
        return `  - ${type}: ${names.join(', ')}${more}`;
      })
      .join('\n');

    // Show low-confidence contexts as needing review
    const lowConfidenceCount = proposedContexts.filter((c) => c.confidence < 0.7).length;

    const clusteringLabel = {
      directory: 'Directory structure',
      naming: 'File naming patterns',
      import: 'Import relationships',
      semantic: 'Semantic analysis',
      mixed: 'Multiple signals',
    }[clusteringMethod];

    const description = `Generated ${proposedContexts.length} contexts covering ${coverage.toFixed(0)}% of files.

**Language**: ${language}
**Method**: ${clusteringLabel}

**Proposed contexts**:
${typeSummary}

${lowConfidenceCount > 0 ? `⚠️ ${lowConfidenceCount} contexts have low confidence and may need review.\n` : ''}${unmappedFiles.length > 0 ? `📁 ${unmappedFiles.length} files remain unmapped.` : ''}`;

    return this.createDecision(
      {
        type: 'generic-backend-contexts-proposal',
        title: 'Backend Contexts',
        description,
        count: proposedContexts.length,
        severity: lowConfidenceCount > proposedContexts.length / 2 ? 'warning' : 'info',
        data: result.data,

        onAccept: async () => {
          this.log('Creating contexts...');

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
                  confidence: ctx.confidence,
                  autoGenerated: true,
                },
              })),
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create contexts');
          }

          this.log(`✅ Created ${proposedContexts.length} contexts`);
        },

        onReject: async () => {
          this.log('User rejected context proposal');
        },
      },
      project
    );
  }
}
