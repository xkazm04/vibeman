/**
 * Prompt Generator
 * Builds research prompts from discovered templates.
 * Takes template metadata + user-provided variables and produces markdown.
 */

import type { DbDiscoveredTemplate } from '../../../../db/models/types';

/**
 * Interpolate {{key}} placeholders with values
 */
export function interpolateTemplate(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Build a research prompt from a discovered template.
 *
 * Uses the template's config_json as the body content (which may contain
 * TS source, raw text, or structured config), wrapped in markdown with
 * the template name, description, query, and variable values.
 */
export function buildResearchPrompt(
  template: DbDiscoveredTemplate,
  query: string,
  variables?: Record<string, string>
): string {
  const vars: Record<string, string> = { query, ...variables };
  const configText = template.config_json || '';

  const sections: string[] = [];

  // Header
  sections.push(`# ${template.template_name}`);
  sections.push('');

  // Description
  if (template.description) {
    sections.push(interpolateTemplate(template.description, vars));
    sections.push('');
  }

  // Template body from config_json, with variable interpolation
  if (configText) {
    sections.push('---');
    sections.push('');
    sections.push(interpolateTemplate(configText, vars));
    sections.push('');
  }

  // Parameters summary
  sections.push('---');
  sections.push('');
  sections.push('## Parameters');
  sections.push('');
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      sections.push(`- **${key}**: ${value}`);
    }
  }

  return sections.join('\n');
}
