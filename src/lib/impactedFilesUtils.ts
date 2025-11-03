import { ImpactedFile } from '@/types';

/**
 * Converts an array of file paths to ImpactedFile objects
 * @param filePaths - Array of file path strings
 * @param defaultType - Default type to assign to all files (default: 'update')
 * @returns Array of ImpactedFile objects
 */
export function convertPathsToImpactedFiles(
  filePaths: string[], 
  defaultType: 'update' | 'create' | 'delete' = 'update'
): ImpactedFile[] {
  return filePaths.map(filepath => ({
    filepath,
    type: defaultType
  }));
}

/**
 * Extracts file paths from ImpactedFile objects
 * @param impactedFiles - Array of ImpactedFile objects
 * @returns Array of file path strings
 */
export function extractFilePathsFromImpactedFiles(impactedFiles: ImpactedFile[]): string[] {
  return impactedFiles.map(file => file.filepath);
}

/**
 * Parses impacted files from database format (could be string or array)
 * @param dbValue - Database value (string JSON or array)
 * @returns Array of ImpactedFile objects
 */
export function parseImpactedFilesFromDb(
  dbValue: string | Array<ImpactedFile> | string[] | null
): ImpactedFile[] {
  if (!dbValue) return [];
  
  // If it's already an array of ImpactedFile objects
  if (Array.isArray(dbValue)) {
    // Check if it's the new format (objects) or old format (strings)
    if (dbValue.length > 0 && typeof dbValue[0] === 'object' && 'filepath' in dbValue[0]) {
      return dbValue as ImpactedFile[];
    } else {
      // Old format - convert strings to ImpactedFile objects
      return convertPathsToImpactedFiles(dbValue as string[]);
    }
  }
  
  // If it's a string, try to parse JSON
  if (typeof dbValue === 'string') {
    try {
      const parsed = JSON.parse(dbValue);
      if (Array.isArray(parsed)) {
        return parsed as ImpactedFile[];
      }
    } catch (e) {
      // Failed to parse JSON - return empty array
      // Error is logged in development, but doesn't affect functionality
    }
  }
  
  return [];
}

/**
 * Formats impacted files for display
 * @param impactedFiles - Array of ImpactedFile objects
 * @returns Formatted string for display
 */
export function formatImpactedFilesForDisplay(impactedFiles: ImpactedFile[]): string {
  if (impactedFiles.length === 0) return 'No files';
  
  const grouped = impactedFiles.reduce((acc, file) => {
    if (!acc[file.type]) acc[file.type] = [];
    acc[file.type].push(file.filepath);
    return acc;
  }, {} as Record<string, string[]>);
  
  const parts = [];
  if (grouped.update?.length) parts.push(`${grouped.update.length} updated`);
  if (grouped.create?.length) parts.push(`${grouped.create.length} created`);
  if (grouped.delete?.length) parts.push(`${grouped.delete.length} deleted`);
  
  return parts.join(', ');
}

/**
 * Gets the icon for a file type
 * @param type - File operation type
 * @returns Icon character or emoji
 */
export function getFileTypeIcon(type: 'update' | 'create' | 'delete'): string {
  switch (type) {
    case 'update': return '✏️';
    case 'create': return '➕';
    case 'delete': return '🗑️';
    default: return '📄';
  }
}

/**
 * Gets the color class for a file type
 * @param type - File operation type
 * @returns CSS color class
 */
export function getFileTypeColor(type: 'update' | 'create' | 'delete'): string {
  switch (type) {
    case 'update': return 'text-blue-400';
    case 'create': return 'text-green-400';
    case 'delete': return 'text-red-400';
    default: return 'text-gray-400';
  }
} 