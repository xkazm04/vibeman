/**
 * Generic Backend Structure Adapter
 *
 * Analyzes structure of various backend frameworks using common patterns.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

type BackendLanguage = 'node' | 'python' | 'go' | 'ruby' | 'rust' | 'java' | 'unknown';

interface EndpointInfo {
  method: string;
  path: string;
  file: string;
  line?: number;
  handler?: string;
}

interface ModuleInfo {
  name: string;
  path: string;
  type: 'api' | 'service' | 'model' | 'util' | 'config' | 'middleware' | 'unknown';
  fileCount: number;
  hasTests: boolean;
}

interface GenericStructureData {
  language: BackendLanguage;
  framework: string | null;
  endpoints: EndpointInfo[];
  modules: ModuleInfo[];
  entryPoints: string[];
  architecture: {
    pattern: 'monolith' | 'modular' | 'microservice' | 'unknown';
    hasLayers: boolean;
    hasDI: boolean;
  };
  conventions: {
    followsStandard: boolean;
    issues: string[];
    suggestions: string[];
  };
}

export class GenericStructureAdapter extends BaseAdapter<GenericStructureData> {
  public readonly id = 'generic-backend-structure';
  public readonly name = 'Generic Backend Structure Analyzer';
  public readonly description = 'Analyzes structure and patterns of various backend frameworks';
  public readonly supportedTypes = ['generic', 'rails', 'go', 'rust', 'java', 'spring'];
  public readonly category = 'structure';
  public readonly priority = 50;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000;

  public async execute(context: ScanContext): Promise<ScanResult<GenericStructureData>> {
    const { project } = context;

    this.log('Running generic backend structure analysis...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/structure-scan/generic',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
            }),
          },
          { serviceName: 'Generic Structure Analyzer API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: GenericStructureData = {
          language: result.language || 'unknown',
          framework: result.framework || null,
          endpoints: result.endpoints || [],
          modules: result.modules || [],
          entryPoints: result.entryPoints || [],
          architecture: {
            pattern: result.architecture?.pattern || 'unknown',
            hasLayers: result.architecture?.hasLayers ?? false,
            hasDI: result.architecture?.hasDI ?? false,
          },
          conventions: {
            followsStandard: result.conventions?.followsStandard ?? true,
            issues: result.conventions?.issues || [],
            suggestions: result.conventions?.suggestions || [],
          },
        };

        this.log(
          `✅ Found ${data.endpoints.length} endpoints, ${data.modules.length} modules (${data.architecture.pattern})`
        );

        return this.createResult(true, data);
      },
      { operation: 'generic-backend-structure-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<GenericStructureData>> {
    return this.createResult(
      true,
      {
        language: 'unknown',
        framework: null,
        endpoints: [],
        modules: [],
        entryPoints: [],
        architecture: {
          pattern: 'unknown',
          hasLayers: false,
          hasDI: false,
        },
        conventions: {
          followsStandard: true,
          issues: [],
          suggestions: [],
        },
      },
      undefined,
      ['Generic structure API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<GenericStructureData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { language, framework, endpoints, modules, architecture, conventions } = result.data;

    if (endpoints.length === 0 && modules.length === 0) {
      return this.createDecision(
        {
          type: 'generic-backend-structure-empty',
          title: 'No Structure Detected',
          description:
            'Could not detect any endpoints or modules. Would you like help organizing your project?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Opening structure organization wizard...');
          },

          onReject: async () => {
            this.log('User skipped structure organization');
          },
        },
        project
      );
    }

    if (conventions.issues.length > 0) {
      const languageLabel = {
        node: 'Node.js',
        python: 'Python',
        go: 'Go',
        ruby: 'Ruby',
        rust: 'Rust',
        java: 'Java',
        unknown: 'Backend',
      }[language];

      const frameworkInfo = framework ? ` (${framework})` : '';

      const moduleSummary = modules
        .filter((m) => m.type !== 'unknown')
        .slice(0, 5)
        .map((m) => `  - ${m.name} (${m.type}, ${m.fileCount} files)`)
        .join('\n');

      const issuesList = conventions.issues.map((i) => `  - ${i}`).join('\n');
      const suggestionsList = conventions.suggestions.slice(0, 3).map((s) => `  - ${s}`).join('\n');

      const description = `${languageLabel}${frameworkInfo} project structure analyzed.

**Architecture**: ${architecture.pattern}${architecture.hasLayers ? ', layered' : ''}${architecture.hasDI ? ', DI' : ''}

**Modules** (${modules.length} total):
${moduleSummary || '  No modules detected'}

**Endpoints**: ${endpoints.length} found

**Issues**:
${issuesList}

${suggestionsList ? `**Suggestions**:\n${suggestionsList}` : ''}`;

      return this.createDecision(
        {
          type: 'generic-backend-structure-issues',
          title: `${languageLabel} Structure Issues`,
          description,
          count: conventions.issues.length,
          severity: 'warning',
          data: result.data,

          onAccept: async () => {
            this.log('Creating requirements to fix structure issues...');
            await fetch('/api/structure-scan/generic/fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                issues: conventions.issues,
              }),
            });
          },

          onReject: async () => {
            this.log('User dismissed structure issues');
          },
        },
        project
      );
    }

    return null;
  }
}
