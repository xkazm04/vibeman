/**
 * Variable Parser Utilities
 * Handles template variable extraction, validation, and interpolation
 */

import type { PromptTemplateVariable } from '@/app/db/models/types';

/**
 * Extract variable names from template content
 * Finds all {{VARIABLE_NAME}} patterns
 */
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  const variables = matches.map((m) => m.slice(2, -2).trim());
  // Remove duplicates
  return [...new Set(variables)];
}

/**
 * Check if all required variables have values
 */
export function validateVariables(
  variables: PromptTemplateVariable[],
  values: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const variable of variables) {
    if (variable.required) {
      const value = values[variable.name];
      if (!value || value.trim() === '') {
        missing.push(variable.name);
      }
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Interpolate template with variable values
 * Replaces all {{VARIABLE}} placeholders with actual values
 */
export function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    // Handle both exact match and whitespace variations
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a preview with sample values
 */
export function createPreview(
  template: string,
  variables: PromptTemplateVariable[]
): string {
  const sampleValues: Record<string, string> = {};

  for (const variable of variables) {
    if (variable.default_value) {
      sampleValues[variable.name] = variable.default_value;
    } else {
      // Generate placeholder based on type
      switch (variable.type) {
        case 'number':
          sampleValues[variable.name] = '42';
          break;
        case 'boolean':
          sampleValues[variable.name] = 'true';
          break;
        case 'text':
          sampleValues[variable.name] = `[Sample ${variable.name}...]`;
          break;
        default:
          sampleValues[variable.name] = `[${variable.name}]`;
      }
    }
  }

  return interpolateTemplate(template, sampleValues);
}

/**
 * Sync variable definitions with content
 * Adds new variables found in content, marks missing ones
 */
export function syncVariablesWithContent(
  content: string,
  existingVariables: PromptTemplateVariable[]
): PromptTemplateVariable[] {
  const contentVars = extractVariables(content);
  const existingNames = new Set(existingVariables.map((v) => v.name));
  const contentNames = new Set(contentVars);

  const result: PromptTemplateVariable[] = [];

  // Keep existing variables that are still in content
  for (const variable of existingVariables) {
    if (contentNames.has(variable.name)) {
      result.push(variable);
    }
  }

  // Add new variables from content
  for (const name of contentVars) {
    if (!existingNames.has(name)) {
      result.push({
        name,
        type: 'string',
        required: true,
        description: '',
      });
    }
  }

  return result;
}
