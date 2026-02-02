/**
 * File Generator
 * Utilities for generating requirement files from templates
 */

import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * Result of a requirement file generation operation
 */
export interface GenerateRequirementResult {
  success: boolean;
  filePath?: string;
  error?: string;
  exists?: boolean;
}

/**
 * Parameters for generating a requirement file
 */
export interface GenerateRequirementParams {
  targetProjectPath: string;
  templateId: string;
  query: string;
  content: string;
  overwrite?: boolean;
}

/**
 * Create a URL-safe slug from text
 * Takes the first 5 words and converts to lowercase hyphenated format
 *
 * @param text - Input text to convert to slug
 * @returns Sanitized slug string
 */
export function createSlug(text: string): string {
  return text
    .split(/\s+/)
    .slice(0, 5) // First 5 words max
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a requirement file in the target project's .claude/commands directory
 *
 * @param params - Generation parameters including project path, template ID, query, and content
 * @returns Result object with success status, file path, or error information
 */
export function generateRequirementFile(
  params: GenerateRequirementParams
): GenerateRequirementResult {
  const { targetProjectPath, templateId, query, content, overwrite = false } = params;

  // Build filename: {templateId}-{slug}.md
  const slug = createSlug(query);
  const filename = `${templateId}-${slug}`;

  // Use createRequirement from claudeCodeManager
  const result = createRequirement(targetProjectPath, filename, content, overwrite);

  // Handle the file exists case
  if (!result.success && result.error?.includes('already exists')) {
    return {
      success: false,
      exists: true,
      error: 'File exists',
    };
  }

  return {
    success: result.success,
    filePath: result.filePath,
    error: result.error,
  };
}
