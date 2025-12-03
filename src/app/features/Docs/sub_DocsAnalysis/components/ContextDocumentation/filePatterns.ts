/**
 * File pattern helpers for ContextDocumentation
 */

// File path patterns for categorization
export const API_PATTERNS = ['/api/', '/services/', '/hooks/', '/lib/'];
export const DB_PATTERNS = ['/db/', '/schema/'];

export type FileType = 'api' | 'db' | 'other';

/**
 * Categorize a single file path
 */
export function getFileType(path: string): FileType {
  if (DB_PATTERNS.some(p => path.includes(p))) return 'db';
  if (API_PATTERNS.some(p => path.includes(p))) return 'api';
  return 'other';
}
