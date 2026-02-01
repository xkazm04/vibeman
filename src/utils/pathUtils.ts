/**
 * Utility functions for normalizing file paths between different formats
 */

/**
 * Normalize path to use forward slashes (Unix format)
 * Converts Windows backslashes to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Browser-compatible path join
 * Joins path segments and normalizes slashes
 */
export function joinPath(...parts: string[]): string {
  return parts
    .join('/')
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/\\/g, '/'); // Normalize backslashes to forward slashes
}

/**
 * Check if path is absolute (Windows drive letter or Unix root)
 */
export function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[\\\/]/.test(path) || path.startsWith('/');
}

/**
 * Convert path to Windows format (backslashes)
 */
export function toWindowsPath(path: string): string {
  return path.replace(/\//g, '\\');
}

/**
 * Check if two paths are equivalent regardless of slash direction
 */
export function pathsMatch(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2);
}

/**
 * Find matching path in an array, ignoring slash direction
 */
export function findMatchingPath(targetPath: string, pathArray: string[]): string | undefined {
  const normalizedTarget = normalizePath(targetPath);
  return pathArray.find(path => normalizePath(path) === normalizedTarget);
}

/**
 * Convert an array of paths to normalized format (forward slashes)
 */
export function normalizePathArray(paths: string[]): string[] {
  return paths.map(normalizePath);
}

/**
 * Remove common prefix from path for display purposes
 * e.g., "src/app/layout.tsx" -> "app/layout.tsx" if prefix is "src/"
 */
export function removePathPrefix(path: string, prefix: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedPrefix = normalizePath(prefix);
  
  if (normalizedPath.startsWith(normalizedPrefix)) {
    return normalizedPath.substring(normalizedPrefix.length);
  }
  
  return normalizedPath;
}