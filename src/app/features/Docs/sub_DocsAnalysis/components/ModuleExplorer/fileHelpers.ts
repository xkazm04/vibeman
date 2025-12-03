/**
 * File path categorization helpers for ModuleExplorer
 */

// File path patterns for categorization
export const API_PATTERNS = ['/api/', '/services/', '/hooks/', '/lib/'];
export const DB_PATTERNS = ['/db/', '/schema/'];

export type FileType = 'api' | 'db' | 'other';

/**
 * Categorize file paths into API/service and DB/schema files
 */
export function categorizeFilePaths(filePaths: string[]): {
  apiFiles: string[];
  dbFiles: string[];
} {
  const apiFiles: string[] = [];
  const dbFiles: string[] = [];

  filePaths.forEach(path => {
    const isDb = DB_PATTERNS.some(pattern => path.includes(pattern));
    const isApi = API_PATTERNS.some(pattern => path.includes(pattern));

    if (isDb) {
      dbFiles.push(path);
    } else if (isApi) {
      apiFiles.push(path);
    }
  });

  return { apiFiles, dbFiles };
}

/**
 * Get filename from full path
 */
export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/**
 * Get folder path from full path (last 2 segments)
 */
export function getFolderPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.slice(-2).join('/');
}

/**
 * Determine file type based on path patterns
 */
export function getFileType(path: string): FileType {
  if (DB_PATTERNS.some(p => path.includes(p))) return 'db';
  if (API_PATTERNS.some(p => path.includes(p))) return 'api';
  return 'other';
}
