/**
 * Template Discovery API Client
 * Functions to interact with the template discovery API
 */

// Import from repository for proper type resolution
import type { DbDiscoveredTemplate } from '../../../../db/models/types';

export interface ScanResult {
  success: boolean;
  projectPath: string;
  filesScanned: number;
  results: {
    created: number;
    updated: number;
    unchanged: number;
  };
  templates: Array<{
    templateId: string;
    templateName: string;
    description: string;
    action: 'created' | 'updated' | 'unchanged';
  }>;
  errors?: string[];
}

/**
 * Scan a project path for TemplateConfig exports
 */
export async function scanProject(projectPath: string): Promise<ScanResult> {
  const response = await fetch('/api/template-discovery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Scan failed');
  }

  return response.json();
}

/**
 * Get all discovered templates, optionally filtered by source path
 */
export async function getTemplates(sourcePath?: string): Promise<DbDiscoveredTemplate[]> {
  const url = sourcePath
    ? `/api/template-discovery?sourcePath=${encodeURIComponent(sourcePath)}`
    : '/api/template-discovery';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  const data = await response.json();
  return data.templates;
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<DbDiscoveredTemplate | null> {
  const response = await fetch(`/api/template-discovery/${encodeURIComponent(id)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Delete a template by ID
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const response = await fetch(`/api/template-discovery/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  return response.ok;
}
