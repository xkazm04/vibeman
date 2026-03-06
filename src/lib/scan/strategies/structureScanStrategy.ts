/**
 * Structure Scan Strategy
 *
 * Validates project structure against framework templates.
 * Detects missing/invalid files and folders.
 */

import type { ScanConfig, ScanFinding, CodebaseFile, ScanRepository } from '../types';
import { BaseScanStrategy } from './baseScanStrategy';
import type { FileGatherer } from '../types';

export interface StructureTemplate {
  framework: string;
  rules: Array<{
    type: 'required_file' | 'required_folder' | 'forbidden_file' | 'required_config';
    path: string;
    description: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Structure Scan Strategy for template validation.
 * Compares actual project structure against expected templates.
 */
export class StructureScanStrategy extends BaseScanStrategy {
  constructor(fileGatherer?: FileGatherer, repository?: ScanRepository) {
    super(fileGatherer, repository);
  }

  /**
   * Validate structure scan configuration.
   */
  protected validateConfig(config: ScanConfig): void {
    if (!config.projectType) {
      throw new Error('Structure scan requires projectType (nextjs, fastapi, django, etc)');
    }
  }

  /**
   * Analyze project structure.
   * Compares actual files against template expectations.
   */
  protected async analyze(
    config: ScanConfig,
    files: CodebaseFile[]
  ): Promise<ScanFinding[]> {
    try {
      // Get template for this project type
      const template = this.getTemplate(config.projectType!);
      const filePaths = new Set(files.map(f => f.path));

      const findings: ScanFinding[] = [];

      // Check each rule in the template
      for (const rule of template.rules) {
        const finding = this.checkRule(rule, filePaths, config.projectPath);
        if (finding) {
          findings.push(finding);
        }
      }

      // Delegate to existing endpoint for extra validation
      try {
        const response = await fetch('/api/structure-scan/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: config.projectPath,
            projectType: config.projectType,
            projectId: config.projectId,
            files: files.map(f => ({ path: f.path })),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.violations && Array.isArray(result.violations)) {
            for (const violation of result.violations) {
              findings.push({
                title: `Structure issue: ${violation.ruleName}`,
                description: violation.message,
                severity: violation.severity || 'warning',
                filePath: violation.path,
                suggestion: violation.suggestion,
              });
            }
          }
        }
      } catch {
        // Non-critical — continue with template-based findings only
      }

      return findings;
    } catch (error) {
      throw new Error(
        `Structure scan analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check a single template rule against actual files.
   */
  private checkRule(
    rule: StructureTemplate['rules'][0],
    filePaths: Set<string>,
    projectPath: string
  ): ScanFinding | null {
    switch (rule.type) {
      case 'required_file':
      case 'required_config': {
        if (!filePaths.has(rule.path)) {
          return {
            title: `Missing ${rule.type === 'required_config' ? 'config' : 'file'}: ${rule.path}`,
            description: rule.description,
            severity: rule.severity,
            filePath: rule.path,
            suggestion: `Create file: ${projectPath}/${rule.path}`,
          };
        }
        break;
      }
      case 'required_folder': {
        const hasFolder = Array.from(filePaths).some(p => p.startsWith(rule.path + '/'));
        if (!hasFolder) {
          return {
            title: `Missing directory: ${rule.path}`,
            description: rule.description,
            severity: rule.severity,
            filePath: rule.path,
            suggestion: `Create directory: ${projectPath}/${rule.path}`,
          };
        }
        break;
      }
      case 'forbidden_file': {
        if (filePaths.has(rule.path)) {
          return {
            title: `Forbidden file found: ${rule.path}`,
            description: rule.description,
            severity: rule.severity,
            filePath: rule.path,
            suggestion: `Remove: ${rule.path}`,
          };
        }
        break;
      }
    }

    return null;
  }

  /**
   * Get template for project type.
   */
  private getTemplate(projectType: string): StructureTemplate {
    const templates: Record<string, StructureTemplate> = {
      nextjs: {
        framework: 'Next.js',
        rules: [
          {
            type: 'required_file',
            path: 'package.json',
            description: 'Node.js project manifest',
            severity: 'error',
          },
          {
            type: 'required_file',
            path: 'tsconfig.json',
            description: 'TypeScript configuration',
            severity: 'warning',
          },
          {
            type: 'required_folder',
            path: 'src/app',
            description: 'App Router directory (Next.js 13+)',
            severity: 'warning',
          },
          {
            type: 'required_file',
            path: '.gitignore',
            description: 'Git ignore file',
            severity: 'warning',
          },
        ],
      },
      fastapi: {
        framework: 'FastAPI',
        rules: [
          {
            type: 'required_file',
            path: 'requirements.txt',
            description: 'Python dependencies',
            severity: 'error',
          },
          {
            type: 'required_file',
            path: 'main.py',
            description: 'FastAPI application entry point',
            severity: 'error',
          },
        ],
      },
      django: {
        framework: 'Django',
        rules: [
          {
            type: 'required_file',
            path: 'manage.py',
            description: 'Django management script',
            severity: 'error',
          },
          {
            type: 'required_file',
            path: 'requirements.txt',
            description: 'Python dependencies',
            severity: 'error',
          },
        ],
      },
      generic: {
        framework: 'Generic',
        rules: [
          {
            type: 'required_file',
            path: '.gitignore',
            description: 'Git ignore file',
            severity: 'warning',
          },
        ],
      },
    };

    return templates[projectType] || templates.generic;
  }

  /**
   * Scan only essential structure files (not source code).
   */
  protected getDefaultFileExtensions(): string[] {
    return [
      '.json', '.yaml', '.yml',    // Config
      '.md', '.txt',               // Documentation
      '.lock', '.env',             // Dependencies & secrets
      '.gitignore', '.dockerignore' // VCS
    ];
  }
}
