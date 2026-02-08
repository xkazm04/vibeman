/**
 * Prompt Generator
 * Utilities for building research prompts from discovered templates.
 *
 * Generates comprehensive prompts using all template fields:
 * - searchIntro: Main instructions and context
 * - searchAngles: Organized search focus areas
 * - extractionIntro: Finding extraction instructions
 * - extractionGuidelines: Quality requirements
 * - findingTypes: What to extract and how
 */

import type { DbDiscoveredTemplate } from '../../../../db/models/types';

/**
 * Search angle with items
 */
interface SearchAngle {
  name: string;
  items: string[];
}

/**
 * Finding type configuration
 */
interface FindingType {
  name: string;
  displayName: string;
  description: string;
  extractedDataSchema?: string;
  analysisFallback?: string;
}

/**
 * Full template configuration structure
 */
interface TemplateConfig {
  templateId: string;
  templateName: string;
  description: string;

  // Search phase
  searchIntro?: string;
  searchAngles?: SearchAngle[];
  searchDepthGuidance?: Record<string, string>;

  // Extraction phase
  extractionIntro?: string;
  extractionGuidelines?: string;
  analysisInstruction?: string;
  findingTypes?: FindingType[];

  // Ordering
  priorityFindingTypes?: string[];
  groupingOrder?: string[];

  // Perspectives
  perspectives?: string[];

  // Verification
  verificationConfig?: Record<string, string>;

  // Limits
  defaultMaxSearches?: number;

  // Variables (with defaults for interpolation)
  variables?: Array<{
    name: string;
    label?: string;
    type?: string;
    default?: string;
  }>;
}

/**
 * Interpolate template placeholders with values
 * Replaces all {{key}} placeholders with corresponding values
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
 * Extract a template literal value from TypeScript source.
 * Handles escaped backticks (\\`) inside the content.
 */
function extractTemplateLiteral(text: string, key: string): string | undefined {
  // Match key: ` then capture everything until unescaped closing `
  const startPattern = new RegExp(`${key}:\\s*\``);
  const match = startPattern.exec(text);
  if (!match) return undefined;

  const startIndex = match.index + match[0].length;
  let depth = 1;
  let i = startIndex;
  let result = '';

  while (i < text.length && depth > 0) {
    const char = text[i];

    if (char === '\\' && i + 1 < text.length) {
      // Escaped character - include both and skip
      result += char + text[i + 1];
      i += 2;
      continue;
    }

    if (char === '`') {
      depth--;
      if (depth === 0) break;
    }

    result += char;
    i++;
  }

  // Unescape backticks in the result
  return result.replace(/\\`/g, '`');
}

/**
 * Extract config from TypeScript object literal (config_json contains TS code, not JSON)
 */
function extractConfigFromTs(configText: string): Partial<TemplateConfig> {
  const config: Partial<TemplateConfig> = {};

  // Extract template literals using proper backtick handling
  const searchIntro = extractTemplateLiteral(configText, 'searchIntro');
  if (searchIntro) {
    config.searchIntro = searchIntro;
  }

  const extractionIntro = extractTemplateLiteral(configText, 'extractionIntro');
  if (extractionIntro) {
    config.extractionIntro = extractionIntro;
  }

  const extractionGuidelines = extractTemplateLiteral(configText, 'extractionGuidelines');
  if (extractionGuidelines) {
    config.extractionGuidelines = extractionGuidelines;
  }

  const analysisInstruction = extractTemplateLiteral(configText, 'analysisInstruction');
  if (analysisInstruction) {
    config.analysisInstruction = analysisInstruction;
  }

  // Extract perspectives array
  const perspectivesMatch = configText.match(/perspectives:\s*\[([\s\S]*?)\]/);
  if (perspectivesMatch) {
    const perspectivesContent = perspectivesMatch[1];
    const perspectives: string[] = [];
    const perspectiveRegex = /['"]([^'"]+)['"]/g;
    let match;
    while ((match = perspectiveRegex.exec(perspectivesContent)) !== null) {
      perspectives.push(match[1]);
    }
    config.perspectives = perspectives;
  }

  // Extract searchAngles array of objects
  const searchAnglesMatch = configText.match(/searchAngles:\s*\[([\s\S]*?)\n\s*\],/);
  if (searchAnglesMatch) {
    const anglesContent = searchAnglesMatch[1];
    const angles: SearchAngle[] = [];

    // Match each angle object
    const angleBlockRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*items:\s*\[([\s\S]*?)\]\s*\}/g;
    let angleMatch;
    while ((angleMatch = angleBlockRegex.exec(anglesContent)) !== null) {
      const name = angleMatch[1];
      const itemsContent = angleMatch[2];
      const items: string[] = [];
      const itemRegex = /['"]([^'"]+)['"]/g;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(itemsContent)) !== null) {
        items.push(itemMatch[1]);
      }
      angles.push({ name, items });
    }
    config.searchAngles = angles;
  }

  // Extract findingTypes array
  const findingTypesMatch = configText.match(/findingTypes:\s*\[([\s\S]*?)\n\s*\],/);
  if (findingTypesMatch) {
    const typesContent = findingTypesMatch[1];
    const types: FindingType[] = [];

    // Match each finding type object
    const typeBlockRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*displayName:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"]/g;
    let typeMatch;
    while ((typeMatch = typeBlockRegex.exec(typesContent)) !== null) {
      types.push({
        name: typeMatch[1],
        displayName: typeMatch[2],
        description: typeMatch[3],
      });
    }
    config.findingTypes = types;
  }

  // Extract defaultMaxSearches
  const maxSearchesMatch = configText.match(/defaultMaxSearches:\s*(\d+)/);
  if (maxSearchesMatch) {
    config.defaultMaxSearches = parseInt(maxSearchesMatch[1], 10);
  }

  // Extract variables array with defaults
  const variablesMatch = configText.match(/variables:\s*\[([\s\S]*?)\n\s*\],/);
  if (variablesMatch) {
    const varsContent = variablesMatch[1];
    const variables: Array<{ name: string; default?: string }> = [];

    // Match each variable object
    const varBlockRegex = /\{\s*name:\s*['"]([^'"]+)['"][^}]*?(?:default:\s*['"]([^'"]*)['"'])?[^}]*\}/g;
    let varMatch;
    while ((varMatch = varBlockRegex.exec(varsContent)) !== null) {
      variables.push({
        name: varMatch[1],
        default: varMatch[2],
      });
    }
    config.variables = variables;
  }

  return config;
}

/**
 * Build a comprehensive research prompt from a discovered template
 *
 * Uses all template fields to generate a complete prompt that:
 * - Provides context and instructions (searchIntro)
 * - Lists search focus areas (searchAngles)
 * - Explains what to extract (findingTypes, extractionIntro)
 * - Sets quality requirements (extractionGuidelines)
 * - Interpolates all variables
 */
export function buildResearchPrompt(
  template: DbDiscoveredTemplate,
  query: string,
  variables?: Record<string, string>
): string {
  const configText = template.config_json || '';

  // Extract config from TypeScript syntax
  const config = extractConfigFromTs(configText);

  // Build variable values for interpolation
  // Start with defaults from template, then override with provided values
  const vars: Record<string, string> = { query };

  // Apply defaults from template variables
  if (config.variables) {
    for (const v of config.variables) {
      if (v.default !== undefined) {
        vars[v.name] = v.default;
      }
    }
  }

  // Override with provided variables
  if (variables) {
    Object.assign(vars, variables);
  }

  // Start building the prompt
  const sections: string[] = [];

  // Header
  sections.push(`# ${template.template_name}`);
  sections.push('');

  // Description
  if (template.description) {
    sections.push(interpolateTemplate(template.description, vars));
    sections.push('');
  }

  // Main Instructions (searchIntro) - This is the core of the prompt
  if (config.searchIntro) {
    sections.push('---');
    sections.push('');
    sections.push(interpolateTemplate(config.searchIntro, vars));
    sections.push('');
  }

  // Search Angles
  if (config.searchAngles && config.searchAngles.length > 0) {
    sections.push('## Search Focus Areas');
    sections.push('');
    for (const angle of config.searchAngles) {
      sections.push(`### ${angle.name}`);
      for (const item of angle.items) {
        sections.push(`- ${interpolateTemplate(item, vars)}`);
      }
      sections.push('');
    }
  }

  // Extraction Instructions
  if (config.extractionIntro) {
    sections.push('---');
    sections.push('');
    sections.push('## Extraction Instructions');
    sections.push('');
    sections.push(interpolateTemplate(config.extractionIntro, vars));
    sections.push('');
  }

  // Finding Types
  if (config.findingTypes && config.findingTypes.length > 0) {
    sections.push('## What to Extract');
    sections.push('');
    for (const type of config.findingTypes) {
      sections.push(`### ${type.displayName}`);
      sections.push(type.description);
      sections.push('');
    }
  }

  // Extraction Guidelines
  if (config.extractionGuidelines) {
    sections.push('## Guidelines');
    sections.push('');
    sections.push(interpolateTemplate(config.extractionGuidelines, vars));
    sections.push('');
  }

  // Parameters summary
  sections.push('---');
  sections.push('');
  sections.push('## Parameters');
  sections.push('');

  // Add all variables
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      sections.push(`- **${key}**: ${value}`);
    }
  }

  if (config.defaultMaxSearches) {
    sections.push(`- **Max Searches**: ${config.defaultMaxSearches}`);
  }

  return sections.join('\n');
}
