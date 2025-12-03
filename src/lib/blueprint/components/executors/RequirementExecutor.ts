/**
 * Requirement Executor
 * Generate Claude Code requirement files from issues
 */

import { BaseExecutor, ExecutorConfig } from '../base/BaseExecutor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface RequirementConfig extends ExecutorConfig {
  outputDir?: string;
  batchSize?: number;
  includeGitCommands?: boolean;
  commitMessage?: string;
}

interface RequirementOutput {
  requirementFiles: string[];
  totalIssues: number;
  batches: number;
}

export class RequirementExecutor extends BaseExecutor<Issue[], RequirementOutput, RequirementConfig> {
  readonly id = 'executor.requirement';
  readonly name = 'Requirement Generator';
  readonly description = 'Generate Claude Code requirement files from issues';

  async execute(input: Issue[], context: ExecutionContext): Promise<RequirementOutput> {
    this.context = context;

    if (this.config.dryRun) {
      this.log('info', 'Dry run - not writing files');
      return {
        requirementFiles: [],
        totalIssues: input.length,
        batches: 0,
      };
    }

    const outputDir = this.config.outputDir || path.join(context.projectPath, '.claude', 'requirements');
    await fs.mkdir(outputDir, { recursive: true });

    const batches = this.createBatches(input, this.config.batchSize || 10);
    const requirementFiles: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      if (this.isCancelled()) break;

      this.reportProgress(
        Math.round((i / batches.length) * 100),
        `Creating batch ${i + 1} of ${batches.length}`
      );

      const batch = batches[i];
      const content = this.buildRequirement(batch, context);

      const fileName = `refactor-batch-${i + 1}-${Date.now()}.md`;
      const filePath = path.join(outputDir, fileName);

      await fs.writeFile(filePath, content, 'utf-8');
      requirementFiles.push(filePath);

      this.log('info', `Created requirement file: ${fileName}`);
    }

    return {
      requirementFiles,
      totalIssues: input.length,
      batches: batches.length,
    };
  }

  private createBatches(issues: Issue[], batchSize: number): Issue[][] {
    const batches: Issue[][] = [];
    for (let i = 0; i < issues.length; i += batchSize) {
      batches.push(issues.slice(i, i + batchSize));
    }
    return batches;
  }

  private buildRequirement(issues: Issue[], context: ExecutionContext): string {
    // Group issues by category
    const grouped = this.groupIssues(issues);

    const sections: string[] = [];

    for (const [category, categoryIssues] of Object.entries(grouped)) {
      sections.push(this.buildCategorySection(category, categoryIssues));
    }

    const content = sections.join('\n\n---\n\n');

    return this.wrapRequirement(content, context, issues);
  }

  private groupIssues(issues: Issue[]): Record<string, Issue[]> {
    return issues.reduce((acc, issue) => {
      const category = issue.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);
  }

  private buildCategorySection(category: string, issues: Issue[]): string {
    const title = this.getCategoryTitle(category);
    const files = Array.from(new Set(issues.map(i => i.file)));

    let section = `## ${title}\n\n`;
    section += `Found ${issues.length} issue(s) in ${files.length} file(s).\n\n`;
    section += `### Files Affected\n`;
    section += files.map(f => `- ${f}`).join('\n');
    section += '\n\n### Issues\n\n';

    for (const issue of issues) {
      section += `#### ${issue.title}\n`;
      section += `- **File**: ${issue.file}:${issue.line}\n`;
      section += `- **Severity**: ${issue.severity}\n`;
      section += `- **Description**: ${issue.description}\n`;
      if (issue.code) {
        section += `- **Code**: \`${issue.code}\`\n`;
      }
      if (issue.suggestedFix) {
        section += `- **Suggested Fix**: ${issue.suggestedFix}\n`;
      }
      section += '\n';
    }

    section += this.getCategoryGuidelines(category);

    return section;
  }

  private getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      'console': 'Remove Console Statements',
      'any-type': 'Fix Any Type Usage',
      'unused-import': 'Remove Unused Imports',
      'large-file': 'Refactor Large Files',
      'long-function': 'Refactor Long Functions',
      'complexity': 'Reduce Complexity',
      'duplication': 'Extract Duplicate Code',
      'magic-number': 'Extract Magic Numbers',
      'react-hook': 'Fix React Hook Dependencies',
    };
    return titles[category] || `Fix ${category} Issues`;
  }

  private getCategoryGuidelines(category: string): string {
    const guidelines: Record<string, string> = {
      'console': `
### Guidelines
1. Remove all console.log, console.warn, console.error statements
2. If logging is genuinely needed, replace with a proper logging library
3. Keep error logging in catch blocks if it adds value
`,
      'any-type': `
### Guidelines
1. Replace \`any\` with specific types where possible
2. Use \`unknown\` if the type is truly unknown
3. Consider using generics for flexible typing
`,
      'unused-import': `
### Guidelines
1. Remove all unused import statements
2. Ensure no side-effect imports are accidentally removed
3. Verify build succeeds after removal
`,
      'large-file': `
### Guidelines
1. Split into smaller, focused modules
2. Extract related functions into separate files
3. Consider using barrel exports for organization
`,
      'long-function': `
### Guidelines
1. Extract helper functions for distinct operations
2. Use early returns to reduce nesting
3. Consider extracting to separate utility files
`,
      'complexity': `
### Guidelines
1. Extract complex conditions into named functions
2. Use early returns to reduce nesting
3. Consider the strategy pattern for switch statements
`,
      'duplication': `
### Guidelines
1. Extract common code into shared functions
2. Place utilities in appropriate shared modules
3. Consider generics for type-safe reuse
`,
      'magic-number': `
### Guidelines
1. Create named constants for numeric values
2. Use UPPER_SNAKE_CASE for constant names
3. Group related constants in a dedicated file
`,
      'react-hook': `
### Guidelines
1. Add all missing dependencies to the array
2. Remove unused dependencies
3. Consider extracting complex logic into custom hooks
`,
    };

    return guidelines[category] || `
### Guidelines
1. Address each issue carefully
2. Maintain existing code style
3. Test changes thoroughly
`;
  }

  private wrapRequirement(content: string, context: ExecutionContext, issues: Issue[]): string {
    let wrapped = `# Code Improvement Tasks

## Project Information
- **Project**: ${context.projectPath}
- **Type**: ${context.projectType}
- **Total Issues**: ${issues.length}

## Instructions
1. Address each issue carefully
2. Maintain existing code style
3. Ensure type safety
4. Do not introduce new bugs
5. Test changes where possible

## Tasks

${content}
`;

    if (this.config.includeGitCommands) {
      const message = this.config.commitMessage || 'refactor: address code quality issues';
      wrapped += `
## Git Commands
After completing all fixes, commit the changes:
\`\`\`bash
git add -A
git commit -m "${message}"
\`\`\`
`;
    }

    return wrapped;
  }

  validateConfig(config: RequirementConfig): ValidationResult {
    if (config.batchSize !== undefined && config.batchSize < 1) {
      return { valid: false, errors: ['batchSize must be at least 1'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        outputDir: {
          type: 'string',
          description: 'Directory to write requirement files'
        },
        batchSize: {
          type: 'number',
          default: 10,
          description: 'Number of issues per batch'
        },
        includeGitCommands: {
          type: 'boolean',
          default: true,
          description: 'Include git commit commands'
        },
        commitMessage: {
          type: 'string',
          description: 'Custom commit message template'
        },
        dryRun: {
          type: 'boolean',
          default: false,
          description: 'Preview without writing files'
        }
      }
    };
  }

  getDefaultConfig(): RequirementConfig {
    return {
      batchSize: 10,
      includeGitCommands: true,
      dryRun: false,
    };
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['RequirementOutput'];
  }
}
