/**
 * Django Structure Scan Adapter
 *
 * Analyzes Django project structure including apps, models, views, and URL patterns.
 */

import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface DjangoAppInfo {
  name: string;
  path: string;
  hasModels: boolean;
  hasViews: boolean;
  hasAdmin: boolean;
  hasUrls: boolean;
  hasForms: boolean;
  hasSerializers: boolean;
  hasTests: boolean;
  modelCount: number;
  viewCount: number;
}

interface DjangoUrlPattern {
  path: string;
  name: string | null;
  viewName: string;
  app: string;
  methods?: string[];
}

interface DjangoStructureData {
  apps: DjangoAppInfo[];
  urlPatterns: DjangoUrlPattern[];
  settings: {
    file: string;
    installedApps: string[];
    middleware: string[];
    databases: string[];
    hasDebugTrue: boolean;
    hasSecretKeyExposed: boolean;
  };
  projectStructure: {
    hasManagePy: boolean;
    hasRequirements: boolean;
    hasPyproject: boolean;
    hasDockerfile: boolean;
    settingsModule: string | null;
  };
  issues: Array<{
    type: 'warning' | 'suggestion' | 'security';
    message: string;
    file?: string;
    app?: string;
  }>;
}

export class DjangoStructureAdapter extends BaseAdapter<DjangoStructureData> {
  public readonly id = 'django-structure';
  public readonly name = 'Django Structure Analyzer';
  public readonly description = 'Analyzes apps, models, views, and URL patterns in Django projects';
  public readonly supportedTypes = ['django'];
  public readonly category = 'structure';
  public readonly priority = 100;

  protected override readonly retryConfig = {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
  };

  protected override readonly defaultTimeoutMs = 120000;

  public async execute(context: ScanContext): Promise<ScanResult<DjangoStructureData>> {
    const { project } = context;

    this.log('Running Django structure analysis...', project.path);

    return this.executeWithErrorHandling(
      async () => {
        const response = await this.fetchApi<any>(
          '/api/structure-scan/django',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: project.path,
            }),
          },
          { serviceName: 'Django Structure Analyzer API' }
        );

        if (!response.success || !response.data) {
          return this.runFallbackScan(project);
        }

        const result = response.data;

        const data: DjangoStructureData = {
          apps: result.apps || [],
          urlPatterns: result.urlPatterns || [],
          settings: {
            file: result.settings?.file || 'settings.py',
            installedApps: result.settings?.installedApps || [],
            middleware: result.settings?.middleware || [],
            databases: result.settings?.databases || ['default'],
            hasDebugTrue: result.settings?.hasDebugTrue ?? false,
            hasSecretKeyExposed: result.settings?.hasSecretKeyExposed ?? false,
          },
          projectStructure: {
            hasManagePy: result.projectStructure?.hasManagePy ?? false,
            hasRequirements: result.projectStructure?.hasRequirements ?? false,
            hasPyproject: result.projectStructure?.hasPyproject ?? false,
            hasDockerfile: result.projectStructure?.hasDockerfile ?? false,
            settingsModule: result.projectStructure?.settingsModule || null,
          },
          issues: result.issues || [],
        };

        // Add security issues
        if (data.settings.hasDebugTrue) {
          data.issues.push({
            type: 'security',
            message: 'DEBUG=True detected. Ensure this is disabled in production.',
            file: data.settings.file,
          });
        }

        if (data.settings.hasSecretKeyExposed) {
          data.issues.push({
            type: 'security',
            message: 'SECRET_KEY appears to be hardcoded. Use environment variables.',
            file: data.settings.file,
          });
        }

        // Add suggestions for apps without tests
        data.apps
          .filter((app) => !app.hasTests && app.modelCount > 0)
          .forEach((app) => {
            data.issues.push({
              type: 'suggestion',
              message: `App "${app.name}" has ${app.modelCount} models but no tests.`,
              app: app.name,
            });
          });

        this.log(
          `✅ Found ${data.apps.length} apps, ${data.urlPatterns.length} URL patterns`
        );

        return this.createResult(true, data);
      },
      { operation: 'django-structure-scan' }
    );
  }

  private async runFallbackScan(project: Project): Promise<ScanResult<DjangoStructureData>> {
    return this.createResult(
      true,
      {
        apps: [],
        urlPatterns: [],
        settings: {
          file: 'settings.py',
          installedApps: [],
          middleware: [],
          databases: ['default'],
          hasDebugTrue: false,
          hasSecretKeyExposed: false,
        },
        projectStructure: {
          hasManagePy: false,
          hasRequirements: false,
          hasPyproject: false,
          hasDockerfile: false,
          settingsModule: null,
        },
        issues: [],
      },
      undefined,
      ['Django structure API not configured - using defaults']
    );
  }

  public buildDecision(
    result: ScanResult<DjangoStructureData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { apps, urlPatterns, settings, issues } = result.data;

    if (apps.length === 0) {
      return this.createDecision(
        {
          type: 'django-structure-empty',
          title: 'No Django Apps Found',
          description:
            'No Django apps were detected. Would you like to create a starter app structure?',
          severity: 'info',
          data: result.data,

          onAccept: async () => {
            this.log('Creating starter Django app...');
            await fetch('/api/structure-scan/django/scaffold', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectPath: project.path }),
            });
          },

          onReject: async () => {
            this.log('User skipped Django app scaffolding');
          },
        },
        project
      );
    }

    // Group issues by severity
    const securityIssues = issues.filter((i) => i.type === 'security');
    const warnings = issues.filter((i) => i.type === 'warning');
    const suggestions = issues.filter((i) => i.type === 'suggestion');

    if (securityIssues.length > 0 || warnings.length > 0) {
      const appSummary = apps
        .map(
          (app) =>
            `  - **${app.name}**: ${app.modelCount} models, ${app.viewCount} views${app.hasTests ? '' : ' (no tests)'}`
        )
        .join('\n');

      const issuesList = [...securityIssues, ...warnings]
        .map((i) => `  - [${i.type.toUpperCase()}] ${i.message}`)
        .join('\n');

      const description = `Found ${apps.length} apps with ${urlPatterns.length} URL patterns.\n\n**Apps**:\n${appSummary}\n\n**Issues**:\n${issuesList}`;

      return this.createDecision(
        {
          type: 'django-structure-issues',
          title: 'Django Structure Analysis',
          description,
          count: securityIssues.length + warnings.length,
          severity: securityIssues.length > 0 ? 'error' : 'warning',
          data: result.data,

          onAccept: async () => {
            this.log('Creating requirements to fix Django structure issues...');
            await fetch('/api/structure-scan/django/fix', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectPath: project.path,
                issues: [...securityIssues, ...warnings],
              }),
            });
          },

          onReject: async () => {
            this.log('User dismissed Django structure issues');
          },
        },
        project
      );
    }

    return null;
  }
}
