/**
 * Duplication Analyzer
 * Detects duplicated code patterns within and across files
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { DuplicationIssue, ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

interface DuplicationAnalyzerConfig extends AnalyzerConfig {
  minBlockSize: number;
  similarityThreshold: number;
  crossFileDetection: boolean;
}

interface CodeBlock {
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  normalized: string;
}

export class DuplicationAnalyzer extends BaseAnalyzer<DuplicationAnalyzerConfig, DuplicationIssue[]> {
  readonly id = 'analyzer.duplication';
  readonly name = 'Code Duplication';
  readonly description = 'Detect duplicated code patterns within and across files';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: ['nextjs', 'express', 'react-native'],
    category: 'technical',
    tags: ['code-quality', 'maintainability', 'DRY'],
  };

  async execute(_: void, context: ExecutionContext): Promise<DuplicationIssue[]> {
    this.context = context;
    const issues: DuplicationIssue[] = [];

    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    // Collect all code blocks
    const allBlocks: CodeBlock[] = [];

    for (let i = 0; i < files.length; i++) {
      if (this.isCancelled()) break;

      const file = files[i];
      this.reportProgress(Math.round((i / totalFiles) * 50), `Collecting blocks from ${this.getRelativePath(file, context.projectPath)}`);

      try {
        const content = await this.readFile(file);
        const relativePath = this.getRelativePath(file, context.projectPath);
        const blocks = this.extractCodeBlocks(content, relativePath);
        allBlocks.push(...blocks);
      } catch (error) {
        this.log('warn', `Failed to read file: ${file}`, error);
      }
    }

    this.reportProgress(60, 'Comparing code blocks for duplicates');

    // Find duplicates
    const duplicateGroups = this.findDuplicates(allBlocks);

    // Convert to issues
    for (const group of duplicateGroups) {
      const primaryBlock = group[0];

      issues.push({
        id: this.generateIssueId(primaryBlock.filePath, primaryBlock.startLine, 'duplication'),
        file: primaryBlock.filePath,
        line: primaryBlock.startLine,
        severity: this.getSeverity(group.length),
        category: 'duplication',
        title: `Duplicated code (${group.length} instances)`,
        description: `Similar code block found in ${group.length} locations. Consider extracting to a shared function.`,
        code: primaryBlock.code.split('\n').slice(0, 5).join('\n') + '...',
        duplicateFiles: group.map(b => b.filePath),
        duplicateLines: group.map(b => [b.startLine, b.endLine]),
        similarity: 1.0,
        autoFixAvailable: false,
        suggestedFix: 'Extract common code into a shared function or utility'
      });
    }

    this.log('info', `Found ${issues.length} duplication issues`);
    return issues;
  }

  private normalizeCodeBlock(code: string): string {
    return code
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove string contents (keep quotes to maintain structure)
      .replace(/"[^"]*"/g, '""')
      .replace(/'[^']*'/g, "''")
      .replace(/`[^`]*`/g, '``')
      .trim();
  }

  private jaccardSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const getNGrams = (str: string, n: number = 3): Set<string> => {
      const grams = new Set<string>();
      for (let i = 0; i <= str.length - n; i++) {
        grams.add(str.slice(i, i + n));
      }
      return grams;
    };

    const grams1 = getNGrams(str1);
    const grams2 = getNGrams(str2);

    const intersection = new Set(Array.from(grams1).filter(x => grams2.has(x)));
    const union = new Set([...Array.from(grams1), ...Array.from(grams2)]);

    return intersection.size / union.size;
  }

  private extractCodeBlocks(content: string, filePath: string): CodeBlock[] {
    const lines = content.split('\n');
    const blocks: CodeBlock[] = [];
    const minBlockSize = this.config.minBlockSize;

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');
      const trimmed = block.trim();

      // Skip blocks that are too small or mostly whitespace/comments
      if (trimmed.length < 100) continue;
      if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) continue;

      blocks.push({
        filePath,
        startLine: i + 1,
        endLine: i + minBlockSize,
        code: block,
        normalized: this.normalizeCodeBlock(block),
      });
    }

    return blocks;
  }

  private findDuplicates(blocks: CodeBlock[]): CodeBlock[][] {
    const groups: CodeBlock[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < blocks.length; i++) {
      if (processed.has(i)) continue;

      const block1 = blocks[i];
      const group: CodeBlock[] = [block1];

      for (let j = i + 1; j < blocks.length; j++) {
        if (processed.has(j)) continue;

        const block2 = blocks[j];

        // Skip overlapping blocks in same file
        if (block1.filePath === block2.filePath) {
          if (Math.abs(block1.startLine - block2.startLine) < this.config.minBlockSize) {
            continue;
          }
        }

        // Skip cross-file if not enabled
        if (!this.config.crossFileDetection && block1.filePath !== block2.filePath) {
          continue;
        }

        // Check similarity
        let similarity = 0;
        if (block1.normalized === block2.normalized) {
          similarity = 1.0;
        } else {
          similarity = this.jaccardSimilarity(block1.normalized, block2.normalized);
        }

        if (similarity >= this.config.similarityThreshold) {
          group.push(block2);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        processed.add(i);
        groups.push(group);
      }
    }

    return groups;
  }

  private getSeverity(instanceCount: number): DuplicationIssue['severity'] {
    if (instanceCount > 5) return 'critical';
    if (instanceCount > 3) return 'high';
    if (instanceCount > 2) return 'medium';
    return 'low';
  }

  validateConfig(config: DuplicationAnalyzerConfig): ValidationResult {
    if (config.minBlockSize !== undefined && config.minBlockSize < 3) {
      return { valid: false, errors: ['minBlockSize must be at least 3 lines'] };
    }
    if (config.similarityThreshold !== undefined && (config.similarityThreshold < 0 || config.similarityThreshold > 1)) {
      return { valid: false, errors: ['similarityThreshold must be between 0 and 1'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        minBlockSize: {
          type: 'number',
          default: 5,
          minimum: 3,
          description: 'Minimum number of lines to consider as a code block'
        },
        similarityThreshold: {
          type: 'number',
          default: 0.85,
          minimum: 0,
          maximum: 1,
          description: 'Similarity threshold (0-1) to consider code as duplicate'
        },
        crossFileDetection: {
          type: 'boolean',
          default: true,
          description: 'Detect duplicates across different files'
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

  getDefaultConfig(): DuplicationAnalyzerConfig {
    return {
      minBlockSize: 5,
      similarityThreshold: 0.85,
      crossFileDetection: true,
      excludePatterns: []
    };
  }

  getOutputTypes(): string[] {
    return ['DuplicationIssue[]'];
  }
}
