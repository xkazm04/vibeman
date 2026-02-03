/**
 * Prompt Generator
 * Utilities for building research prompts from discovered templates
 */

import type { DbDiscoveredTemplate } from '../../../../db/models/types';

/**
 * Template configuration structure (parsed from config_json)
 */
interface TemplateConfig {
  templateId: string;
  templateName: string;
  description: string;
  searchAngles?: string[];
  findingTypes?: string[];
  perspectives?: string[];
  [key: string]: unknown;
}

/**
 * Interpolate template placeholders with values
 * Replaces all {{key}} placeholders with corresponding values from the values object
 *
 * @param content - Template string containing {{key}} placeholders
 * @param values - Record of key-value pairs for substitution
 * @returns String with placeholders replaced (missing keys left as-is)
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
 * Build a research prompt from a discovered template and query
 *
 * @param template - The discovered template from database
 * @param query - The research query to run
 * @returns Formatted markdown prompt ready for research execution
 */
export function buildResearchPrompt(
  template: DbDiscoveredTemplate,
  query: string
): string {
  // Parse the config_json to get full template configuration
  let config: TemplateConfig;
  try {
    config = JSON.parse(template.config_json) as TemplateConfig;
  } catch {
    // Fallback to minimal config if parsing fails
    config = {
      templateId: template.template_id,
      templateName: template.template_name,
      description: template.description || '',
    };
  }

  // Build search angles section
  const searchAngles = config.searchAngles || [];
  const searchAnglesSection = searchAngles.length > 0
    ? searchAngles.map((angle) => `- ${angle}`).join('\n')
    : '- General research';

  // Build finding types section
  const findingTypes = config.findingTypes || [];
  const findingTypesSection = findingTypes.length > 0
    ? findingTypes.map((type) => `- ${type}`).join('\n')
    : '- General findings';

  // Build perspectives section
  const perspectives = config.perspectives || [];
  const perspectivesSection = perspectives.length > 0
    ? perspectives.map((perspective) => `- ${perspective}`).join('\n')
    : '- Objective analysis';

  // Construct the full prompt
  const prompt = `# Research: ${query}

Template: ${template.template_name}
Description: ${template.description || 'No description provided'}

## Search Angles
${searchAnglesSection}

## Finding Types
${findingTypesSection}

## Perspectives
${perspectivesSection}

## Research Parameters
- Granularity: deep
- Query: ${query}
`;

  return prompt;
}
