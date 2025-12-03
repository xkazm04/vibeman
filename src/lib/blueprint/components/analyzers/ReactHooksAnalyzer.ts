/**
 * React Hooks Analyzer
 * Detects issues with React Hook dependencies (useEffect, useCallback, useMemo)
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { ReactHookIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface ReactHooksAnalyzerConfig extends AnalyzerConfig {
  checkUseEffect: boolean;
  checkUseCallback: boolean;
  checkUseMemo: boolean;
}

export class ReactHooksAnalyzer extends BaseAnalyzer<ReactHooksAnalyzerConfig, ReactHookIssue[]> {
  readonly id = 'analyzer.react-hooks';
  readonly name = 'React Hooks';
  readonly description = 'Detect issues with React Hook dependencies';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'react-native'],
    category: 'technical',
    filePatterns: ['**/*.tsx', '**/*.jsx'],
    tags: ['react', 'hooks', 'performance'],
  };

  async execute(_: void, context: ExecutionContext): Promise<ReactHookIssue[]> {
    this.context = context;
    const issues: ReactHookIssue[] = [];

    // Only analyze React files
    const files = await this.getProjectFiles(context.projectPath, ['**/*.tsx', '**/*.jsx']);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 100), `Analyzing ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const fileIssues = this.detectReactHookDeps(content, file, context.projectPath);
        issues.push(...fileIssues);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.log('info', `Found ${issues.length} React Hook issues`);
    return issues;
  }

  private detectReactHookDeps(content: string, filePath: string, projectPath: string): ReactHookIssue[] {
    const issues: ReactHookIssue[] = [];
    const relativePath = this.getRelativePath(filePath, projectPath);

    // Pattern to detect hook calls
    const hookPattern = /(useEffect|useCallback|useMemo)\s*\(/g;

    let match;
    while ((match = hookPattern.exec(content)) !== null) {
      const hookType = match[1] as 'useEffect' | 'useCallback' | 'useMemo';

      // Skip based on config
      if (hookType === 'useEffect' && !this.config.checkUseEffect) continue;
      if (hookType === 'useCallback' && !this.config.checkUseCallback) continue;
      if (hookType === 'useMemo' && !this.config.checkUseMemo) continue;

      const startPos = match.index;

      // Find the line number
      const beforeMatch = content.substring(0, startPos);
      const lineNumber = beforeMatch.split('\n').length;

      // Extract the hook call (find matching parentheses)
      let depth = 0;
      let hookCallContent = '';

      for (let i = startPos; i < content.length; i++) {
        const char = content[i];
        hookCallContent += char;

        if (char === '(') depth++;
        if (char === ')') depth--;

        if (depth === 0 && char === ')') {
          break;
        }
      }

      // Parse the hook call to extract callback and dependency array
      const callContent = hookCallContent;

      // Extract callback function body
      const callbackMatch = callContent.match(/\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}(?=\s*,|\s*\))/);
      const callbackBody = callbackMatch ? callbackMatch[2] : '';

      // Extract dependency array
      const depsArrayMatch = callContent.match(/\[\s*([^\]]*?)\s*\]\s*\)/);
      const hasDepsArray = !!depsArrayMatch;
      const declaredDeps = depsArrayMatch
        ? depsArrayMatch[1]
            .split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0)
        : [];

      // If no dependency array, check if one should exist
      if (!hasDepsArray && callbackBody) {
        const usedVars = this.extractUsedVariables(callbackBody);

        if (usedVars.size > 0) {
          issues.push({
            id: this.generateIssueId(relativePath, lineNumber, `react-hook-missing-array-${hookType}`),
            file: relativePath,
            line: lineNumber,
            severity: 'high',
            category: 'react-hook',
            title: `${hookType} missing dependency array`,
            description: `${hookType} is missing a dependency array. Consider adding dependencies: [${Array.from(usedVars).join(', ')}]`,
            hookName: hookType,
            issueType: 'missing-array',
            dependencies: Array.from(usedVars),
            autoFixAvailable: false,
            suggestedFix: `Add dependency array: [${Array.from(usedVars).join(', ')}]`
          });
        }
        continue;
      }

      // Extract variables used in callback
      const usedInCallback = this.extractUsedVariables(callbackBody);

      // Compare declared deps with used variables
      const missingDeps: string[] = [];
      const unnecessaryDeps: string[] = [];

      // Check for missing dependencies
      for (const usedVar of Array.from(usedInCallback)) {
        const isDeclared = declaredDeps.some(dep => {
          const depName = dep.split('.')[0].trim();
          return depName === usedVar || dep.includes(usedVar);
        });

        if (!isDeclared) {
          missingDeps.push(usedVar);
        }
      }

      // Check for unnecessary dependencies
      for (const declaredDep of declaredDeps) {
        if (!declaredDep) continue;

        const depName = declaredDep.split('.')[0].trim();
        if (!usedInCallback.has(depName)) {
          unnecessaryDeps.push(declaredDep);
        }
      }

      // Report issues
      if (missingDeps.length > 0) {
        issues.push({
          id: this.generateIssueId(relativePath, lineNumber, `react-hook-missing-dep-${hookType}`),
          file: relativePath,
          line: lineNumber,
          severity: missingDeps.length > 2 ? 'high' : 'medium',
          category: 'react-hook',
          title: `${hookType} missing dependencies`,
          description: `${hookType} is missing dependencies: ${missingDeps.join(', ')}`,
          hookName: hookType,
          issueType: 'missing-dependency',
          dependencies: missingDeps,
          autoFixAvailable: false,
          suggestedFix: `Add missing dependencies: ${missingDeps.join(', ')}`
        });
      }

      if (unnecessaryDeps.length > 0) {
        issues.push({
          id: this.generateIssueId(relativePath, lineNumber, `react-hook-unnecessary-dep-${hookType}`),
          file: relativePath,
          line: lineNumber,
          severity: 'low',
          category: 'react-hook',
          title: `${hookType} unnecessary dependencies`,
          description: `${hookType} has unnecessary dependencies: ${unnecessaryDeps.join(', ')}`,
          hookName: hookType,
          issueType: 'unnecessary-dependency',
          dependencies: unnecessaryDeps,
          autoFixAvailable: false,
          suggestedFix: `Remove unnecessary dependencies: ${unnecessaryDeps.join(', ')}`
        });
      }
    }

    return issues;
  }

  private extractUsedVariables(code: string): Set<string> {
    const usedVars = new Set<string>();
    const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

    // Skip keywords, built-ins, and function parameters
    const skipList = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'true', 'false', 'null', 'undefined', 'this',
      'console', 'window', 'document', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'instanceof',
    ];

    let match;
    while ((match = varPattern.exec(code)) !== null) {
      const varName = match[1];

      // Skip keywords and state setters
      if (skipList.includes(varName) || /^set[A-Z]/.test(varName)) {
        continue;
      }

      usedVars.add(varName);
    }

    return usedVars;
  }

  validateConfig(config: ReactHooksAnalyzerConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        checkUseEffect: {
          type: 'boolean',
          default: true,
          description: 'Check useEffect hooks'
        },
        checkUseCallback: {
          type: 'boolean',
          default: true,
          description: 'Check useCallback hooks'
        },
        checkUseMemo: {
          type: 'boolean',
          default: true,
          description: 'Check useMemo hooks'
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

  getDefaultConfig(): ReactHooksAnalyzerConfig {
    return {
      checkUseEffect: true,
      checkUseCallback: true,
      checkUseMemo: true,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['ReactHookIssue[]'];
  }
}
