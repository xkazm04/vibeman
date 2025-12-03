/**
 * Prompt Builder
 * Builds requirement prompts from templates and issues
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Issue } from '../../types';

interface PromptContext {
  projectPath: string;
  projectType: string;
  issues: Issue[];
  additionalInstructions?: string;
}

export class PromptBuilder {
  private templatesDir: string;
  private templateCache: Map<string, string> = new Map();

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
  }

  async buildPrompt(templateName: string, context: PromptContext): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return this.interpolate(template, context);
  }

  async buildRequirement(issues: Issue[], context: PromptContext): Promise<string> {
    const sections: string[] = [];

    // Group issues by category
    const grouped = this.groupIssues(issues);

    for (const [category, categoryIssues] of Object.entries(grouped)) {
      const templateName = this.getTemplateForCategory(category);
      const section = await this.buildPrompt(templateName, {
        ...context,
        issues: categoryIssues,
      });
      sections.push(section);
    }

    return this.wrapRequirement(sections.join('\n\n---\n\n'), context);
  }

  private async loadTemplate(name: string): Promise<string> {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    try {
      const templatePath = path.join(this.templatesDir, `${name}.md`);
      const content = await fs.readFile(templatePath, 'utf-8');
      this.templateCache.set(name, content);
      return content;
    } catch {
      // Return a default template if not found
      return `## {{category}} Issues

Found {{issueCount}} issue(s).

### Files Affected
{{fileList}}

### Issues
{{issueDetails}}
`;
    }
  }

  private interpolate(template: string, context: PromptContext): string {
    let result = template;

    // Replace placeholders
    result = result.replace(/\{\{projectPath\}\}/g, context.projectPath);
    result = result.replace(/\{\{projectType\}\}/g, context.projectType);
    result = result.replace(/\{\{issueCount\}\}/g, String(context.issues.length));

    // Build file list
    const files = Array.from(new Set(context.issues.map(i => i.file)));
    result = result.replace(/\{\{fileList\}\}/g, files.map(f => `- ${f}`).join('\n'));

    // Build issue details
    const issueDetails = context.issues.map(issue =>
      `### ${issue.title}\n` +
      `- **File**: ${issue.file}:${issue.line}\n` +
      `- **Severity**: ${issue.severity}\n` +
      `- **Description**: ${issue.description}\n` +
      (issue.code ? `- **Code**: \`${issue.code}\`\n` : '') +
      (issue.suggestedFix ? `- **Suggested Fix**: ${issue.suggestedFix}\n` : '')
    ).join('\n');
    result = result.replace(/\{\{issueDetails\}\}/g, issueDetails);

    // Category name
    const category = context.issues[0]?.category || 'general';
    result = result.replace(/\{\{category\}\}/g, category);

    return result;
  }

  private groupIssues(issues: Issue[]): Record<string, Issue[]> {
    return issues.reduce((acc, issue) => {
      const category = issue.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(issue);
      return acc;
    }, {} as Record<string, Issue[]>);
  }

  private getTemplateForCategory(category: string): string {
    const mapping: Record<string, string> = {
      'console': 'fix-console',
      'any-type': 'fix-any-types',
      'unused-import': 'fix-unused-imports',
      'large-file': 'refactor-large-file',
      'long-function': 'refactor-long-function',
      'complexity': 'reduce-complexity',
      'duplication': 'extract-duplicates',
      'magic-number': 'extract-constants',
      'react-hook': 'fix-hook-deps',
    };
    return mapping[category] || 'general-refactor';
  }

  private wrapRequirement(content: string, context: PromptContext): string {
    return `# Code Improvement Tasks

## Project Information
- **Project**: ${context.projectPath}
- **Type**: ${context.projectType}
- **Total Issues**: ${context.issues.length}

## Instructions
1. Address each issue carefully
2. Maintain existing code style
3. Ensure type safety
4. Do not introduce new bugs
5. Test changes where possible

${context.additionalInstructions ? `## Additional Instructions\n${context.additionalInstructions}\n\n` : ''}

## Tasks

${content}
`;
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Singleton instance
export const promptBuilder = new PromptBuilder();
