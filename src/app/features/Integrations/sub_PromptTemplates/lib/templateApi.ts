/**
 * Prompt Template API Client
 * Handles all API calls for prompt templates
 */

import type { PromptTemplateCategory, PromptTemplateVariable } from '@/app/db/models/types';
import type { SupportedProvider } from '@/lib/llm/types';

export interface ParsedTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  category: PromptTemplateCategory;
  template_content: string;
  variables: PromptTemplateVariable[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  projectId: string;
  name: string;
  description?: string;
  category: PromptTemplateCategory;
  templateContent: string;
  variables: PromptTemplateVariable[];
}

export interface UpdateTemplateData {
  id: string;
  name?: string;
  description?: string;
  category?: PromptTemplateCategory;
  templateContent?: string;
  variables?: PromptTemplateVariable[];
}

export interface GenerateRequirementData {
  templateId: string;
  projectPath: string;
  variables: Record<string, string>;
  requirementName?: string;
  overwrite?: boolean;
}

/**
 * Fetch all templates for a project
 */
export async function fetchTemplates(
  projectId: string,
  category?: PromptTemplateCategory
): Promise<ParsedTemplate[]> {
  const params = new URLSearchParams({ projectId });
  if (category) {
    params.set('category', category);
  }

  const response = await fetch(`/api/prompt-templates?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch templates');
  }

  return response.json();
}

/**
 * Create a new template
 */
export async function createTemplate(data: CreateTemplateData): Promise<ParsedTemplate> {
  const response = await fetch('/api/prompt-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create template');
  }

  return response.json();
}

/**
 * Update an existing template
 */
export async function updateTemplate(data: UpdateTemplateData): Promise<ParsedTemplate> {
  const response = await fetch('/api/prompt-templates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update template');
  }

  return response.json();
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/prompt-templates?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete template');
  }
}

/**
 * Generate a requirement file from a template
 */
export async function generateRequirement(
  data: GenerateRequirementData
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const response = await fetch('/api/prompt-templates/generate-requirement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.error || 'Failed to generate requirement' };
  }

  return { success: true, filePath: result.filePath };
}

/**
 * Batch randomize variable values for multiple items
 */
export interface BatchRandomizeData {
  templateId: string;
  provider?: SupportedProvider;
  count: number;
}

export async function batchRandomize(
  data: BatchRandomizeData
): Promise<{ variableSets: Record<string, string>[] }> {
  const response = await fetch('/api/prompt-templates/ai-randomize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to randomize');
  }

  const result = await response.json();

  // Normalize response shape
  if (result.variableSets) return { variableSets: result.variableSets };
  if (result.variables) return { variableSets: [result.variables] };
  throw new Error('Unexpected response format');
}
