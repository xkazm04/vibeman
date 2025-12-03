/**
 * Unused Imports Analyzer
 * Detects potentially unused imports in TypeScript/JavaScript files
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { UnusedImportIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface UnusedImportsAnalyzerConfig extends AnalyzerConfig {
  checkTypeImports: boolean;
}

export class UnusedImportsAnalyzer extends BaseAnalyzer<UnusedImportsAnalyzerConfig, UnusedImportIssue[]> {
  readonly id = 'analyzer.unused-imports';
  readonly name = 'Unused Imports';
  readonly description = 'Detect potentially unused imports in TypeScript/JavaScript files';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    tags: ['code-quality', 'cleanup'],
  };

  async execute(_: void, context: ExecutionContext): Promise<UnusedImportIssue[]> {
    this.context = context;
    const issues: UnusedImportIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath, ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
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

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private detectUnusedImports(content: string, filePath: string, projectPath: string): UnusedImportIssue[] {
    const issues: UnusedImportIssue[] = [];
    const lines = content.split('\n');

    // Skip type-only imports unless configured
    const typeOnlyImportPattern = /^import\s+type\s+/;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();

      // Skip type-only imports if not checking them
      if (!this.config.checkTypeImports && typeOnlyImportPattern.test(trimmedLine)) {
        continue;
      }

      if (/^import\s+.*from/.test(trimmedLine)) {
        // Extract import source
        const sourceMatch = trimmedLine.match(/from\s+['"]([^'"]+)['"]/);
        const importSource = sourceMatch ? sourceMatch[1] : '';

        // Extract imported names (handle default, named, and namespace imports)
        const namedMatch = trimmedLine.match(/import\s+\{([^}]+)\}/);
        const defaultMatch = trimmedLine.match(/^import\s+(\w+)\s+from/);
        const namespaceMatch = trimmedLine.match(/import\s+\*\s+as\s+(\w+)/);

        const imports: Array<{ name: string; alias?: string }> = [];

        if (namedMatch) {
          namedMatch[1].split(',').forEach(i => {
            const parts = i.trim().split(/\s+as\s+/);
            imports.push({
              name: parts[0].trim(),
              alias: parts.length > 1 ? parts[1].trim() : undefined
            });
          });
        }
        if (defaultMatch && !namespaceMatch) {
          imports.push({ name: defaultMatch[1].trim() });
        }
        if (namespaceMatch) {
          imports.push({ name: namespaceMatch[1].trim() });
        }

        if (imports.length > 0) {
          // Get the rest of the file content for analysis
          const restOfFile = lines.slice(lineIndex + 1).join('\n');

          for (const imp of imports) {
            const nameToCheck = imp.alias || imp.name;
            const escaped = this.escapeRegex(nameToCheck);

            // Multiple usage patterns to check
            const patterns = [
              new RegExp(`\\b${escaped}\\b`),              // Regular usage
              new RegExp(`<${escaped}[\\s/>]`),            // JSX usage
              new RegExp(`<${escaped}\\.`),                // JSX namespaced
              new RegExp(`${escaped}\\.\\w+`),             // Property access
              new RegExp(`\\.\\.\\.\\s*${escaped}\\b`),    // Spread
              new RegExp(`:\\s*${escaped}\\b`),            // Type annotation
              new RegExp(`<[^>]*\\b${escaped}\\b[^>]*>`),  // Generic type
              new RegExp(`extends\\s+${escaped}\\b`),      // Inheritance
              new RegExp(`implements\\s+${escaped}\\b`),   // Implementation
            ];

            const isUsed = patterns.some(pattern => pattern.test(restOfFile));

            if (!isUsed) {
              const relativePath = this.getRelativePath(filePath, projectPath);

              issues.push({
                id: this.generateIssueId(relativePath, lineIndex + 1, `unused-import-${nameToCheck}`),
                file: relativePath,
                line: lineIndex + 1,
                severity: 'low',
                category: 'unused-import',
                title: `Unused import: ${nameToCheck}`,
                description: `Import "${nameToCheck}" from "${importSource}" appears to be unused`,
                code: line.trim(),
                importName: nameToCheck,
                importSource,
                autoFixAvailable: true,
                suggestedFix: `Remove unused import "${nameToCheck}"`
              });
            }
          }
        }
      }
    }

    return issues;
  }

  validateConfig(config: UnusedImportsAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        checkTypeImports: {
          type: 'boolean',
          default: false,
          description: 'Also check type-only imports'
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

  getDefaultConfig(): UnusedImportsAnalyzerConfig {
    return {
      checkTypeImports: false,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['UnusedImportIssue[]'];
  }
}
