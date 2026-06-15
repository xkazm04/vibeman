import { stripCodeFences } from '@/lib/stringUtils';
import { isContextCategory } from '@/lib/contexts/taxonomy';

/**
 * Extract the first JSON object or array from a string that may contain
 * surrounding prose, markdown fences, or other LLM artifacts.
 *
 * Returns the parsed value, or `undefined` if no valid JSON is found.
 */
export function extractJSON<T = unknown>(raw: string): T | undefined {
  // 1. Strip markdown code fences
  const stripped = stripCodeFences(raw);

  // 2. Try direct parse first (fastest path)
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // continue
  }

  // 3. Try to extract a JSON object or array via regex
  const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      // continue
    }
  }

  return undefined;
}

/**
 * Clean common LLM text artifacts from a description string:
 * - Remove text before the first markdown heading
 * - Remove trailing JSON syntax fragments
 * - Unescape escaped newlines and quotes
 */
export function cleanLLMText(text: string): string {
  return text
    // Remove everything before the first '#' (markdown heading)
    .replace(/^[^#]*(?=#)/s, '')
    // Remove trailing JSON syntax: "} or '}
    .replace(/["']\s*\}\s*$/g, '')
    // Remove standalone curly braces at end
    .replace(/\s*[\{\}]+\s*$/, '')
    // Remove any remaining quote wrappers at very end
    .replace(/["'`]+$/, '')
    // Convert escaped newlines to actual newlines
    .replace(/\\n/g, '\n')
    // Remove escaped quotes
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

/**
 * Clean a file-structure string of wrapping quotes/braces and unescape.
 */
export function cleanFileStructure(text: string): string {
  return text
    .replace(/^["'`{}\[\]]+|["'`{}\[\]]+$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

// ── Typed response parsers ──────────────────────────────────────────

export interface DescriptionResult {
  cleanedDescription: string;
  fileStructure: string;
}

/**
 * Parse an LLM response that may be JSON `{ description, fileStructure }`
 * or raw markdown. Returns a cleaned description and file structure.
 */
export function parseDescriptionResponse(response: string): DescriptionResult {
  const parsed = extractJSON<{ description?: string; fileStructure?: string }>(response);

  const rawDescription = parsed?.description ?? response;
  const rawFileStructure = parsed?.fileStructure ?? '';

  return {
    cleanedDescription: cleanLLMText(rawDescription),
    fileStructure: cleanFileStructure(rawFileStructure),
  };
}

export interface MetadataResult {
  title: string;
  description: string;
  groupId: string | null;
  groupName: string | null;
  category: string | null;
  businessFeature: string | null;
}

/**
 * Parse an LLM response into context metadata.
 * Falls back to safe defaults when parsing fails.
 */
export function parseMetadataResponse(
  response: string,
  validGroupIds?: string[],
): MetadataResult {
  const parsed = extractJSON<{
    title?: string;
    description?: string;
    groupId?: string | null;
    groupName?: string | null;
    category?: string | null;
    businessFeature?: string | null;
  }>(response);

  if (!parsed) {
    return {
      title: 'Untitled',
      description: 'Context metadata generation failed',
      groupId: null,
      groupName: null,
      category: null,
      businessFeature: null,
    };
  }

  const metadata: MetadataResult = {
    title: parsed.title || 'Untitled Context',
    description: parsed.description || 'No description available.',
    groupId: parsed.groupId || null,
    groupName: parsed.groupName || null,
    // Only accept a category that matches the canonical taxonomy.
    category: isContextCategory(parsed.category) ? parsed.category : null,
    businessFeature: parsed.businessFeature || null,
  };

  // Validate groupId if a whitelist is provided
  if (metadata.groupId && validGroupIds) {
    if (!validGroupIds.includes(metadata.groupId)) {
      metadata.groupId = null;
      metadata.groupName = null;
    }
  }

  return metadata;
}
