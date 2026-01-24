/**
 * Generate Requirement from Template API
 * Interpolates template variables and creates a Claude Code requirement file
 */

import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';
import type { PromptTemplateVariable } from '@/app/db/models/types';

/**
 * Extract variable names from template content
 */
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map((m) => m.slice(2, -2).trim());
}

/**
 * Interpolate template with variable values
 */
function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}

/**
 * Validate that all required variables are provided
 */
function validateVariables(
  variables: PromptTemplateVariable[],
  values: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const variable of variables) {
    if (variable.required && (!values[variable.name] || values[variable.name].trim() === '')) {
      missing.push(variable.name);
    }
  }
  return { valid: missing.length === 0, missing };
}

/**
 * POST - Generate a requirement file from a template
 * Body:
 *   - templateId (required): Template ID to use
 *   - projectPath (required): Path to the project where requirement will be created
 *   - variables (required): Object with variable values { variableName: value }
 *   - requirementName (optional): Custom name for the requirement file
 *   - overwrite (optional): Whether to overwrite existing file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, projectPath, variables, requirementName, overwrite = false } = body;

    // Validate required fields
    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }
    if (!projectPath) {
      return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
    }
    if (!variables || typeof variables !== 'object') {
      return NextResponse.json({ error: 'variables object is required' }, { status: 400 });
    }

    // Get the template
    const template = promptTemplateDb.getById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Parse template variables
    const templateVariables: PromptTemplateVariable[] = JSON.parse(template.variables || '[]');

    // Validate required variables are provided
    const validation = validateVariables(templateVariables, variables);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Missing required variables: ${validation.missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Apply default values for optional variables not provided
    const finalValues: Record<string, string> = { ...variables };
    for (const variable of templateVariables) {
      if (!finalValues[variable.name] && variable.default_value) {
        finalValues[variable.name] = variable.default_value;
      }
    }

    // Interpolate the template
    const content = interpolateTemplate(template.template_content, finalValues);

    // Generate requirement name if not provided
    const name = requirementName || `${template.name}-${Date.now()}`;

    // Create the requirement file
    const result = createRequirement(projectPath, name, content, overwrite);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create requirement file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      templateName: template.name,
      requirementName: name,
      variablesUsed: Object.keys(finalValues),
    });
  } catch (error) {
    console.error('Failed to generate requirement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate requirement' },
      { status: 500 }
    );
  }
}
