/**
 * Python Unused Imports Analyzer
 * Detects potentially unused imports in Python files
 */

import { BaseAnalyzer, AnalyzerConfig } from '../../base/BaseAnalyzer';
import { UnusedImportIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../../types';

interface PythonUnusedImportsAnalyzerConfig extends AnalyzerConfig {
  skipInitFiles: boolean;
}

export class PythonUnusedImportsAnalyzer extends BaseAnalyzer<PythonUnusedImportsAnalyzerConfig, UnusedImportIssue[]> {
  readonly id = 'analyzer.python-unused-imports';
  readonly name = 'Python Unused Imports';
  readonly description = 'Detect potentially unused imports in Python files';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['fastapi'],
    category: 'technical',
    filePatterns: ['**/*.py'],
    tags: ['code-quality', 'cleanup', 'python'],
  };

  async execute(_: void, context: ExecutionContext): Promise<UnusedImportIssue[]> {
    this.context = context;
    const issues: UnusedImportIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.py'], 'fastapi');
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];

      // Skip __init__.py files if configured (often used for re-exports)
      if (this.config.skipInitFiles && file.includes('__init__.py')) {
        continue;
      }

      this.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectUnusedImports(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} unused imports`);
    return issues;
  }

  private detectUnusedImports(content: string, filePath: string, projectPath: string): UnusedImportIssue[] {
    const issues: UnusedImportIssue[] = [];
    const lines = content.split('\n');
    const relativePath = this.getRelativePath(filePath, projectPath);
    const imports = new Map<string, { line: number; source: string }>();

    // First pass: collect all imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match: from module import name1, name2
      const fromImportMatch = line.match(/^from\s+([^\s]+)\s+import\s+(.+)/);
      if (fromImportMatch) {
        const source = fromImportMatch[1];
        const importedNames = fromImportMatch[2].split(',').map(n => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts.length > 1 ? parts[1] : parts[0];
        });
        importedNames.forEach(name => {
          if (name && !name.startsWith('(')) {
            imports.set(name.trim(), { line: i + 1, source });
          }
        });
        continue;
      }

      // Match: import module or import module as alias
      const importMatch = line.match(/^import\s+(.+)/);
      if (importMatch) {
        const importedNames = importMatch[1].split(',').map(n => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts.length > 1 ? parts[1] : parts[0].split('.')[0];
        });
        importedNames.forEach(name => {
          if (name) {
            imports.set(name.trim(), { line: i + 1, source: name.trim() });
          }
        });
      }
    }

    // Second pass: check if imports are used (skip first 10 lines to avoid matching import statements)
    const restOfFile = lines.slice(10).join('\n');

    for (const [name, { line, source }] of Array.from(imports.entries())) {
      // Create pattern to find usage (not just import)
      const usagePattern = new RegExp(`\\b${this.escapeRegex(name)}\\b`);

      if (!usagePattern.test(restOfFile)) {
        issues.push({
          id: this.generateIssueId(relativePath, line, `unused-import-${name}`),
          file: relativePath,
          line,
          severity: 'low',
          category: 'unused-import',
          title: `Unused import: ${name}`,
          description: `Import "${name}" from "${source}" appears to be unused`,
          code: lines[line - 1].trim(),
          importName: name,
          importSource: source,
          autoFixAvailable: true,
          suggestedFix: `Remove unused import "${name}"`
        });
      }
    }

    return issues;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  validateConfig(config: PythonUnusedImportsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        skipInitFiles: {
          type: 'boolean',
          default: true,
          description: 'Skip __init__.py files (often used for re-exports)'
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'Additional patterns to exclude'
        }
      }
    };
  }

  getDefaultConfig(): PythonUnusedImportsAnalyzerConfig {
    return {
      skipInitFiles: true,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['UnusedImportIssue[]'];
  }
}
