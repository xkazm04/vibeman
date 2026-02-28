/**
 * Prompt Builder Utilities
 *
 * This module provides utility functions for building prompts from templates,
 * injecting values, and preparing prompts for LLM API calls.
 */

import {
  PromptConfig,
  PromptBuildInput,
  PromptBuildResult,
  PromptTaskType,
  PromptMode,
  SectionBuilder,
} from './types';
import { getPromptTemplate } from './templates';

/**
 * Replace placeholders in a template string with actual values.
 * Uses a single-pass regex to match all {{KEY}} placeholders at once,
 * avoiding repeated string scans and regex-escaping issues.
 *
 * @param template - Template string with {{PLACEHOLDER}} syntax
 * @param values - Key-value pairs for replacement
 * @returns Template with placeholders replaced
 */
export function replacePlaceholders(
  template: string,
  values: Record<string, any>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

/**
 * Tagged template literal for building prompt templates.
 *
 * Returns a function that accepts a values object and produces the final string.
 * Placeholder keys are inferred from the template's interpolated expressions.
 *
 * Usage:
 *   const greet = promptTemplate`Hello ${'NAME'}, welcome to ${'PROJECT'}!`;
 *   greet({ NAME: 'Alice', PROJECT: 'Vibeman' });
 *   // => "Hello Alice, welcome to Vibeman!"
 *
 * Missing or null values are replaced with an empty string (same as replacePlaceholders).
 * The template is compiled once; each invocation is a single O(n) concat — no regex scanning.
 */
export function promptTemplate(
  strings: TemplateStringsArray,
  ...keys: string[]
): (values: Record<string, any>) => string {
  return (values: Record<string, any>): string => {
    const parts: string[] = [];
    for (let i = 0; i < strings.length; i++) {
      parts.push(strings[i]);
      if (i < keys.length) {
        const v = values[keys[i]];
        parts.push(v !== undefined && v !== null ? String(v) : '');
      }
    }
    return parts.join('');
  };
}

/**
 * Validate that all required placeholders are provided
 *
 * @param config - Prompt configuration
 * @param values - Provided values
 * @returns Validation result with errors if any
 */
export function validatePlaceholders(
  config: PromptConfig,
  values: Record<string, any>
): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  config.placeholders.forEach((placeholder) => {
    if (placeholder.required) {
      const value = values[placeholder.key];
      if (value === undefined || value === null || value === '') {
        errors.push(
          `Missing required placeholder: ${placeholder.key}`
        );
      }
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Build section content using section builders
 *
 * @param config - Prompt configuration
 * @param sectionData - Data for each section
 * @param context - Additional context
 * @returns Object with section content
 */
export function buildSections(
  config: PromptConfig,
  sectionData: Record<string, any> = {},
  context: any = {}
): Record<string, string> {
  const sections: Record<string, string> = {};

  if (!config.sections) {
    return sections;
  }

  config.sections.forEach((section) => {
    // Check condition if provided
    if (section.condition && !section.condition(context)) {
      sections[section.id] = '';
      return;
    }

    // Build section content
    const data = sectionData[section.id];
    try {
      const content = section.builder(data);
      sections[section.id] = content;
    } catch (error) {
      console.error(`Error building section ${section.id}:`, error);
      sections[section.id] = '';
    }
  });

  return sections;
}

/**
 * Build a complete prompt from a template configuration
 *
 * @param taskType - Task type
 * @param input - Build input with values and section data
 * @param mode - Optional mode for the task
 * @returns Built prompt result
 * @throws Error if template not found or validation fails
 */
export function buildPrompt(
  taskType: PromptTaskType,
  input: PromptBuildInput,
  mode?: PromptMode
): PromptBuildResult {
  // Get the template
  const config = getPromptTemplate(taskType, mode);
  if (!config) {
    throw new Error(
      `Prompt template not found for taskType: ${taskType}${mode ? `, mode: ${mode}` : ''}`
    );
  }

  // Run custom validation if provided
  if (config.validate) {
    const validation = config.validate(input.values);
    if (!validation.valid) {
      throw new Error(
        `Validation failed: ${validation.errors?.join(', ')}`
      );
    }
  }

  // Validate required placeholders
  const placeholderValidation = validatePlaceholders(config, input.values);
  if (!placeholderValidation.valid) {
    throw new Error(
      `Placeholder validation failed: ${placeholderValidation.errors?.join(', ')}`
    );
  }

  // Build sections if configured
  const sections = buildSections(config, input.sectionData, input.context);

  // Merge sections into values for placeholder replacement
  const allValues = { ...input.values, ...sections };

  // Apply default values for missing placeholders
  config.placeholders.forEach((placeholder) => {
    if (
      !placeholder.required &&
      placeholder.defaultValue !== undefined &&
      (allValues[placeholder.key] === undefined || allValues[placeholder.key] === null)
    ) {
      allValues[placeholder.key] = placeholder.defaultValue;
    }
  });

  // Build system prompt
  const systemPrompt = config.systemPrompt
    ? replacePlaceholders(config.systemPrompt, allValues)
    : undefined;

  // Build user prompt
  const userPrompt = replacePlaceholders(config.userPrompt, allValues);

  // Build full prompt (combined)
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${userPrompt}`
    : userPrompt;

  return {
    systemPrompt,
    userPrompt,
    fullPrompt,
    llmConfig: config.llmConfig,
    outputFormat: config.outputFormat,
    taskType: config.taskType,
  };
}

/**
 * Section builder helpers
 */

/**
 * Build a simple text section with optional title
 */
export function buildTextSection(title?: string): SectionBuilder<string> {
  return (content: string) => {
    if (!content) return '';
    return title ? `## ${title}\n\n${content}` : content;
  };
}

/**
 * Build a section from an array of items with formatting
 */
export function buildListSection(
  title: string,
  formatter: (item: any) => string
): SectionBuilder<any[]> {
  return (items: any[]) => {
    if (!items || items.length === 0) return '';

    const formattedItems = items.map(formatter).join('\n\n');
    return `## ${title}\n\n${formattedItems}`;
  };
}

/**
 * Build a code section with syntax highlighting
 */
export function buildCodeSection(
  title: string,
  language: string = ''
): SectionBuilder<string> {
  return (code: string) => {
    if (!code) return '';
    return `## ${title}\n\n\`\`\`${language}\n${code}\n\`\`\``;
  };
}

/**
 * Build a section from file contents
 */
export function buildFilesSection(
  title: string = 'Files'
): SectionBuilder<Array<{ path: string; content: string }>> {
  return (files: Array<{ path: string; content: string }>) => {
    if (!files || files.length === 0) return '';

    const fileBlocks = files
      .map((file) => {
        return `### ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\``;
      })
      .join('\n\n');

    return `## ${title}\n\n${fileBlocks}`;
  };
}

/**
 * Build an analysis section from project analysis data
 */
export function buildAnalysisSection(
  title: string = 'Project Analysis'
): SectionBuilder<any> {
  return (analysis: any) => {
    if (!analysis) return '';

    const sections: string[] = [];

    if (analysis.technologies && analysis.technologies.length > 0) {
      sections.push(`### Technologies\n${analysis.technologies.join(', ')}`);
    }

    if (analysis.fileCount !== undefined) {
      sections.push(`### Project Size\n- Files: ${analysis.fileCount}`);
    }

    if (analysis.structure) {
      sections.push(`### Structure\n\`\`\`\n${analysis.structure}\n\`\`\``);
    }

    if (sections.length === 0) return '';

    return `## ${title}\n\n${sections.join('\n\n')}`;
  };
}

/**
 * Build existing items section (goals, ideas, etc.) with grouping
 */
export function buildExistingItemsSection<T extends { status?: string }>(
  title: string,
  formatter: (item: T) => string,
  groupBy?: 'status'
): SectionBuilder<T[]> {
  return (items: T[]) => {
    if (!items || items.length === 0) {
      return `## ${title}\n\nNo existing items.`;
    }

    if (groupBy === 'status') {
      const grouped: Record<string, T[]> = {};
      items.forEach((item) => {
        const status = item.status || 'unknown';
        if (!grouped[status]) {
          grouped[status] = [];
        }
        grouped[status].push(item);
      });

      const sections = Object.entries(grouped).map(([status, groupItems]) => {
        const formattedItems = groupItems.map(formatter).join('\n');
        return `### ${status.charAt(0).toUpperCase() + status.slice(1)}\n${formattedItems}`;
      });

      return `## ${title}\n\n${sections.join('\n\n')}`;
    }

    const formattedItems = items.map(formatter).join('\n\n');
    return `## ${title}\n\n${formattedItems}`;
  };
}

/**
 * Conditional section builder
 */
export function conditionalSection(
  condition: (context: any) => boolean,
  builder: SectionBuilder
): SectionBuilder {
  return (data: any, context?: any) => {
    if (!condition(context)) return '';
    return builder(data);
  };
}

/**
 * Quick builder for common patterns
 */
export const SectionBuilders = {
  text: buildTextSection,
  list: buildListSection,
  code: buildCodeSection,
  files: buildFilesSection,
  analysis: buildAnalysisSection,
  existingItems: buildExistingItemsSection,
  conditional: conditionalSection,
};

/**
 * Format helpers for common use cases
 */

/**
 * Format an idea for display in prompts
 */
export function formatIdea(idea: {
  title: string;
  category?: string;
  status?: string;
  description?: string;
}): string {
  const parts = [`- **${idea.title}**`];
  if (idea.category) parts.push(`(${idea.category})`);
  if (idea.status) parts.push(`[${idea.status}]`);
  if (idea.description) parts.push(`\n  ${idea.description}`);
  return parts.join(' ');
}

/**
 * Format a goal for display in prompts
 */
export function formatGoal(goal: {
  title: string;
  type?: string;
  status?: string;
  description?: string | string[];
}): string {
  const parts = [`- **${goal.title}**`];
  if (goal.type) parts.push(`(${goal.type})`);
  if (goal.status) parts.push(`[${goal.status}]`);

  if (goal.description) {
    const desc = Array.isArray(goal.description)
      ? goal.description.join(' ')
      : goal.description;
    parts.push(`\n  ${desc}`);
  }

  return parts.join(' ');
}

/**
 * Format file content with path header
 */
export function formatFileContent(file: {
  path: string;
  content: string;
}): string {
  return `### ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\``;
}
